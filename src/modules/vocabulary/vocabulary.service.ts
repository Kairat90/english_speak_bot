import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SkillType, TaskType } from '@prisma/client';
import { AiTaskGeneratorService } from '../ai/services/ai-task-generator.service';
import { AiEvaluationService } from '../ai/services/ai-evaluation.service';
import { AiFeedbackService } from '../ai/services/ai-feedback.service';
import { TasksService } from '../tasks/tasks.service';
import { UsersService } from '../users/users.service';
import { ProgressService } from '../progress/progress.service';
import { StatisticsService } from '../statistics/statistics.service';
import { FilesService } from '../files/files.service';
import * as path from 'path';

type VocabState = {
  taskId: string;
  words: Array<{ id: string; word: string; translation: string; example: string }>;
  currentIndex: number;
  phase: 'learn' | 'translate' | 'sentence' | 'custom';
};

@Injectable()
export class VocabularyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiTaskGenerator: AiTaskGeneratorService,
    private readonly aiEvaluation: AiEvaluationService,
    private readonly aiFeedback: AiFeedbackService,
    private readonly tasksService: TasksService,
    private readonly usersService: UsersService,
    private readonly progressService: ProgressService,
    private readonly statisticsService: StatisticsService,
    private readonly filesService: FilesService,
  ) {}

  async startSession(userId: string): Promise<{ message: string; state: VocabState }> {
    const level = await this.usersService.getSkillLevel(userId, SkillType.VOCABULARY);
    const aiWords = await this.aiTaskGenerator.generateVocabularyWords(level, 5);

    const savedWords = await Promise.all(
      aiWords.map((w) =>
        this.prisma.vocabularyWord.upsert({
          where: { word_translation: { word: w.word, translation: w.translation } },
          update: { transcription: w.transcription, example: w.example },
          create: {
            word: w.word,
            transcription: w.transcription,
            translation: w.translation,
            example: w.example,
            partOfSpeech: w.partOfSpeech,
            level,
          },
        }),
      ),
    );

    const task = await this.tasksService.create(userId, {
      type: TaskType.VOCABULARY_LEARN,
      skill: SkillType.VOCABULARY,
      title: 'Изучение новых слов',
      content: { words: savedWords.map((w) => w.id) },
      level,
    });

    await this.tasksService.startTask(task.id);

    const state: VocabState = {
      taskId: task.id,
      words: savedWords.map((w) => ({
        id: w.id,
        word: w.word,
        translation: w.translation,
        example: w.example ?? '',
      })),
      currentIndex: 0,
      phase: 'learn',
    };

    await this.usersService.setState(userId, 'VOCABULARY_LEARN', state);

    return { message: this.formatWordMessage(savedWords[0], 1, savedWords.length), state };
  }

  async handleAnswer(userId: string, answer: string): Promise<string> {
    const user = await this.usersService.findById(userId);
    const state = user.stateData as unknown as VocabState;

    if (!state?.taskId) {
      return 'Сессия не найдена. Нажмите «Начать обучение».';
    }

    const currentWord = state.words[state.currentIndex];
    const level = await this.usersService.getSkillLevel(userId, SkillType.VOCABULARY);

    let evaluation;
    if (state.phase === 'translate') {
      evaluation = await this.aiEvaluation.evaluateVocabulary(
        currentWord.word,
        currentWord.translation,
        answer,
        'translate',
      );
    } else if (state.phase === 'sentence' || state.phase === 'custom') {
      evaluation = await this.aiEvaluation.evaluateVocabulary(
        currentWord.word,
        currentWord.example,
        answer,
        state.phase,
      );
    } else {
      return 'Ожидается изучение слов. Напишите «далее» для перехода к тесту.';
    }

    await this.aiFeedback.saveFeedback({
      userId,
      taskId: state.taskId,
      promptType: `vocabulary_${state.phase}`,
      request: { word: currentWord.word, answer },
      response: evaluation,
    });

    const feedbackMsg = this.aiFeedback.formatFeedbackMessage(evaluation);

    if (!evaluation.passed) {
      return feedbackMsg + '\n\n🔄 Попробуйте ещё раз.';
    }

    await this.tasksService.recordAttempt(userId, {
      taskId: state.taskId,
      userAnswer: answer,
    }, evaluation);

    await this.progressService.updateVocabularyProgress(userId, currentWord.id, true);
    await this.statisticsService.recordTaskResult(userId, evaluation);

    if (state.phase === 'translate') {
      state.phase = 'sentence';
      await this.usersService.setState(userId, 'VOCABULARY_TEST', state);
      return (
        feedbackMsg +
        `\n\n📝 Вставьте слово "${currentWord.word}" в предложение:\n` +
        `Пример: ${currentWord.example}`
      );
    }

    if (state.phase === 'sentence') {
      state.phase = 'custom';
      await this.usersService.setState(userId, 'VOCABULARY_TEST', state);
      return feedbackMsg + `\n\n✍️ Составьте своё предложение со словом "${currentWord.word}":`;
    }

    if (state.currentIndex < state.words.length - 1) {
      state.currentIndex++;
      state.phase = 'translate';
      const nextWord = state.words[state.currentIndex];
      await this.usersService.setState(userId, 'VOCABULARY_TEST', state);

      return (
        feedbackMsg +
        `\n\n➡️ Следующее слово: "${nextWord.word}"\nПереведите на русский:`
      );
    }

    await this.usersService.setState(userId, 'IDLE', {});
    return feedbackMsg + '\n\n🎉 Все слова изучены! Отличная работа!';
  }

  async advanceLearning(userId: string): Promise<string> {
    const user = await this.usersService.findById(userId);
    const state = user.stateData as unknown as VocabState;

    if (!state || state.phase !== 'learn') {
      return 'Нет активной сессии изучения.';
    }

    if (state.currentIndex < state.words.length - 1) {
      state.currentIndex++;
      await this.usersService.setState(userId, 'VOCABULARY_LEARN', state);
      const word = await this.prisma.vocabularyWord.findUniqueOrThrow({
        where: { id: state.words[state.currentIndex].id },
      });
      return this.formatWordMessage(word, state.currentIndex + 1, state.words.length);
    }

    state.phase = 'translate';
    state.currentIndex = 0;
    await this.usersService.setState(userId, 'VOCABULARY_TEST', state);

    return (
      `✅ Слова изучены!\n\n🧪 Тест: переведите слово "${state.words[0].word}" на русский:`
    );
  }

  async getWordsForReview(userId: string, limit = 10) {
    return this.prisma.vocabularyProgress.findMany({
      where: { userId, nextReviewAt: { lte: new Date() } },
      include: { word: true },
      orderBy: { nextReviewAt: 'asc' },
      take: limit,
    });
  }

  async generateWordAudio(wordId: string): Promise<string> {
    const word = await this.prisma.vocabularyWord.findUniqueOrThrow({ where: { id: wordId } });
    const audioPath = path.join('./tmp/audio', `${wordId}.ogg`);
    return this.filesService.generateAudioFromText(word.word, audioPath);
  }

  private formatWordMessage(
    word: { word: string; transcription?: string | null; translation: string; example?: string | null },
    index: number,
    total: number,
  ): string {
    return [
      `📚 Слово ${index}/${total}`,
      `🔤 ${word.word} [${word.transcription ?? ''}]`,
      `🇷🇺 ${word.translation}`,
      `💬 ${word.example ?? ''}`,
      '\nНапишите «далее» для следующего слова.',
    ].join('\n');
  }
}
