import { Injectable } from '@nestjs/common';
import { SkillType, TaskType } from '@prisma/client';
import { AiTaskGeneratorService } from '../ai/services/ai-task-generator.service';
import { AiEvaluationService } from '../ai/services/ai-evaluation.service';
import { AiFeedbackService } from '../ai/services/ai-feedback.service';
import { TasksService } from '../tasks/tasks.service';
import { UsersService } from '../users/users.service';
import { FilesService } from '../files/files.service';
import { ProgressService } from '../progress/progress.service';
import { StatisticsService } from '../statistics/statistics.service';
import * as path from 'path';

type ListeningState = {
  taskId: string;
  text: string;
  mode: 'transcribe' | 'retell' | 'questions';
  audioPath: string;
  questions?: Array<{ question: string; expectedAnswer: string }>;
  currentQuestionIndex?: number;
};

@Injectable()
export class ListeningService {
  constructor(
    private readonly aiTaskGenerator: AiTaskGeneratorService,
    private readonly aiEvaluation: AiEvaluationService,
    private readonly aiFeedback: AiFeedbackService,
    private readonly tasksService: TasksService,
    private readonly usersService: UsersService,
    private readonly filesService: FilesService,
    private readonly progressService: ProgressService,
    private readonly statisticsService: StatisticsService,
  ) {}

  async startExercise(
    userId: string,
    mode: 'transcribe' | 'retell' | 'questions' = 'transcribe',
  ): Promise<{ message: string; audioPath: string }> {
    const level = await this.usersService.getSkillLevel(userId, SkillType.LISTENING);
    const exercise = await this.aiTaskGenerator.generateListeningTask(level, mode);

    const audioPath = path.join('./tmp/audio', `listening_${userId}_${Date.now()}.ogg`);
    await this.filesService.generateAudioFromText(exercise.text, audioPath);

    const task = await this.tasksService.create(userId, {
      type: this.mapModeToTaskType(mode),
      skill: SkillType.LISTENING,
      title: `Listening: ${mode}`,
      content: { ...exercise, audioPath } as never,
      level,
    });

    await this.tasksService.startTask(task.id);

    const state: ListeningState = {
      taskId: task.id,
      text: exercise.text,
      mode,
      audioPath,
      questions: exercise.questions,
      currentQuestionIndex: 0,
    };

    await this.usersService.setState(userId, 'LISTENING_EXERCISE', state);

    const instructions: Record<string, string> = {
      transcribe: '📝 Напишите, что вы услышали:',
      retell: '🎙 Перескажите услышанное голосовым сообщением:',
      questions: exercise.questions?.[0]
        ? `❓ ${exercise.questions[0].question}`
        : '❓ Ответьте на вопрос по аудио:',
    };

    return {
      message: `👂 Listening (${mode})\n\n${instructions[mode]}`,
      audioPath,
    };
  }

  async checkTextAnswer(userId: string, answer: string): Promise<string> {
    const user = await this.usersService.findById(userId);
    const state = user.stateData as unknown as ListeningState;

    if (!state?.taskId) {
      return 'Нет активного listening-задания.';
    }

    const evaluation = await this.aiEvaluation.evaluateListening(
      state.text,
      answer,
      state.mode,
    );

    return this.finalizeAttempt(userId, state, answer, evaluation, 'text');
  }

  async checkVoiceAnswer(userId: string, transcript: string): Promise<string> {
    const user = await this.usersService.findById(userId);
    const state = user.stateData as unknown as ListeningState;

    if (!state?.taskId) {
      return 'Нет активного listening-задания.';
    }

    const evaluation = await this.aiEvaluation.evaluateListening(
      state.text,
      transcript,
      'retell',
    );

    return this.finalizeAttempt(userId, state, transcript, evaluation, 'voice');
  }

  private async finalizeAttempt(
    userId: string,
    state: ListeningState,
    answer: string,
    evaluation: Awaited<ReturnType<AiEvaluationService['evaluateListening']>>,
    answerType: string,
  ): Promise<string> {
    await this.aiFeedback.saveFeedback({
      userId,
      taskId: state.taskId,
      promptType: `listening_${state.mode}`,
      request: { text: state.text, answer },
      response: evaluation,
    });

    await this.tasksService.recordAttempt(userId, {
      taskId: state.taskId,
      userAnswer: answer,
      answerType,
    }, evaluation);

    const level = await this.usersService.getSkillLevel(userId, SkillType.LISTENING);
    await this.progressService.updateListeningProgress(userId, level, evaluation);
    await this.statisticsService.recordTaskResult(userId, evaluation);

    const feedbackMsg = this.aiFeedback.formatFeedbackMessage(evaluation);

    if (!evaluation.passed) {
      return feedbackMsg + '\n\n🔄 Попробуйте ещё раз.';
    }

    await this.usersService.setState(userId, 'IDLE', {});
    return feedbackMsg + '\n\n✅ Listening-задание выполнено!';
  }

  private mapModeToTaskType(mode: string): TaskType {
    const map: Record<string, TaskType> = {
      transcribe: TaskType.LISTENING_TRANSCRIBE,
      retell: TaskType.LISTENING_RETELL,
      questions: TaskType.LISTENING_QUESTIONS,
    };
    return map[mode] ?? TaskType.LISTENING_TRANSCRIBE;
  }
}
