import { Injectable } from '@nestjs/common';
import { SkillType, TaskType } from '@prisma/client';
import { AiTaskGeneratorService } from '../ai/services/ai-task-generator.service';
import { AiEvaluationService } from '../ai/services/ai-evaluation.service';
import { AiFeedbackService } from '../ai/services/ai-feedback.service';
import { TasksService } from '../tasks/tasks.service';
import { UsersService } from '../users/users.service';
import { ProgressService } from '../progress/progress.service';
import { StatisticsService } from '../statistics/statistics.service';

type GrammarState = {
  taskId: string;
  topic: string;
  question: string;
  instruction: string;
};

@Injectable()
export class GrammarService {
  constructor(
    private readonly aiTaskGenerator: AiTaskGeneratorService,
    private readonly aiEvaluation: AiEvaluationService,
    private readonly aiFeedback: AiFeedbackService,
    private readonly tasksService: TasksService,
    private readonly usersService: UsersService,
    private readonly progressService: ProgressService,
    private readonly statisticsService: StatisticsService,
  ) {}

  async startExercise(userId: string, topic?: string): Promise<string> {
    const level = await this.usersService.getSkillLevel(userId, SkillType.GRAMMAR);
    const exercise = await this.aiTaskGenerator.generateGrammarTask(level, topic);

    const task = await this.tasksService.create(userId, {
      type: TaskType.GRAMMAR_EXERCISE,
      skill: SkillType.GRAMMAR,
      title: `Grammar: ${exercise.topic}`,
      content: exercise as never,
      level,
    });

    await this.tasksService.startTask(task.id);

    const state: GrammarState = {
      taskId: task.id,
      topic: exercise.topic,
      question: exercise.question,
      instruction: exercise.instruction,
    };

    await this.usersService.setState(userId, 'GRAMMAR_EXERCISE', state);

    const hint = exercise.hint ? `\n💡 Подсказка: ${exercise.hint}` : '';

    return [
      `✏️ Grammar: ${exercise.topic}`,
      exercise.instruction,
      '',
      exercise.question,
      hint,
      '',
      'Напишите ваш ответ:',
    ].join('\n');
  }

  async checkAnswer(userId: string, answer: string): Promise<string> {
    const user = await this.usersService.findById(userId);
    const state = user.stateData as unknown as GrammarState;

    if (!state?.taskId) {
      return 'Нет активного grammar-задания.';
    }

    const level = await this.usersService.getSkillLevel(userId, SkillType.GRAMMAR);
    const evaluation = await this.aiEvaluation.evaluateGrammar(state.question, answer, level);

    await this.aiFeedback.saveFeedback({
      userId,
      taskId: state.taskId,
      promptType: 'grammar_evaluate',
      request: { question: state.question, answer },
      response: evaluation,
    });

    await this.tasksService.recordAttempt(userId, {
      taskId: state.taskId,
      userAnswer: answer,
    }, evaluation);

    await this.progressService.updateGrammarProgress(userId, state.topic, level, evaluation);
    await this.statisticsService.recordTaskResult(userId, evaluation);

    const feedbackMsg = this.aiFeedback.formatFeedbackMessage(evaluation);

    if (!evaluation.passed) {
      return feedbackMsg + '\n\n🔄 Задание не засчитано. Попробуйте ещё раз.';
    }

    await this.usersService.setState(userId, 'IDLE', {});
    return feedbackMsg + '\n\n✅ Grammar-задание выполнено!';
  }
}
