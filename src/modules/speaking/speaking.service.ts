import { Injectable } from '@nestjs/common';
import { SkillType, TaskType } from '@prisma/client';
import { AiTaskGeneratorService } from '../ai/services/ai-task-generator.service';
import { AiFeedbackService } from '../ai/services/ai-feedback.service';
import { TasksService } from '../tasks/tasks.service';
import { UsersService } from '../users/users.service';
import { VoiceProcessingService } from '../voice/voice-processing.service';
import { ProgressService } from '../progress/progress.service';
import { StatisticsService } from '../statistics/statistics.service';

type SpeakingState = {
  taskId: string;
  topic: string;
  prompt: string;
  keyVocabulary: string[];
};

@Injectable()
export class SpeakingService {
  constructor(
    private readonly aiTaskGenerator: AiTaskGeneratorService,
    private readonly aiFeedback: AiFeedbackService,
    private readonly tasksService: TasksService,
    private readonly usersService: UsersService,
    private readonly voiceProcessing: VoiceProcessingService,
    private readonly progressService: ProgressService,
    private readonly statisticsService: StatisticsService,
  ) {}

  async startTopic(userId: string): Promise<string> {
    const level = await this.usersService.getSkillLevel(userId, SkillType.SPEAKING);
    const topic = await this.aiTaskGenerator.generateSpeakingTopic(level);

    const task = await this.tasksService.create(userId, {
      type: TaskType.SPEAKING_TOPIC,
      skill: SkillType.SPEAKING,
      title: `Speaking: ${topic.topic}`,
      content: topic as never,
      level,
    });

    await this.tasksService.startTask(task.id);

    const state: SpeakingState = {
      taskId: task.id,
      topic: topic.topic,
      prompt: topic.prompt,
      keyVocabulary: topic.keyVocabulary,
    };

    await this.usersService.setState(userId, 'SPEAKING_TOPIC', state);

    return [
      '🎤 Speaking Practice',
      `📌 Тема: ${topic.topic}`,
      topic.prompt,
      '',
      `🔑 Ключевые слова: ${topic.keyVocabulary.join(', ')}`,
      `⏱ Рекомендуемая длительность: ${topic.expectedDuration} сек.`,
      '',
      '🎙 Отправьте голосовое сообщение с вашим ответом:',
    ].join('\n');
  }

  async processVoiceAnswer(userId: string, telegramFileId: string): Promise<string> {
    const user = await this.usersService.findById(userId);
    const state = user.stateData as unknown as SpeakingState;

    if (!state?.taskId) {
      return 'Нет активного speaking-задания. Выберите «Начать обучение».';
    }

    const level = await this.usersService.getSkillLevel(userId, SkillType.SPEAKING);

    const { submissionId, transcript, analysis } = await this.voiceProcessing.processVoiceMessage(
      telegramFileId,
      userId,
      state.topic,
      level,
    );

    await this.aiFeedback.saveFeedback({
      userId,
      taskId: state.taskId,
      promptType: 'speaking_analyze',
      request: { topic: state.topic, transcript },
      response: analysis,
    });

    await this.tasksService.recordAttempt(userId, {
      taskId: state.taskId,
      userAnswer: transcript,
      answerType: 'voice',
    }, analysis);

    await this.progressService.updateSpeakingProgress(userId, level, analysis);
    await this.statisticsService.recordTaskResult(userId, analysis);

    await this.voiceProcessing.cleanup(submissionId);

    const feedbackMsg = this.aiFeedback.formatFeedbackMessage(analysis);
    const details = [
      `🗣 Распознанный текст: "${transcript}"`,
      `📊 Беглость: ${analysis.fluency}/100`,
      `📚 Словарный запас: ${analysis.vocabulary}/100`,
      `✏️ Грамматика: ${analysis.grammar}/100`,
      `🎯 Соответствие теме: ${analysis.relevance}/100`,
      `📋 Полнота: ${analysis.completeness}/100`,
    ].join('\n');

    if (!analysis.passed) {
      return [details, '', feedbackMsg, '', '🔄 Оценка ниже 70. Запишите голосовое сообщение ещё раз.'].join('\n');
    }

    await this.usersService.setState(userId, 'IDLE', {});
    return [details, '', feedbackMsg, '', '✅ Speaking-задание выполнено!'].join('\n');
  }
}
