import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AiEvaluationResponse } from '../../../common/interfaces/ai-response.interface';

@Injectable()
export class AiFeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async saveFeedback(params: {
    userId: string;
    taskId?: string;
    promptType: string;
    request: object;
    response: object;
    model?: string;
  }) {
    return this.prisma.aiFeedback.create({
      data: {
        userId: params.userId,
        taskId: params.taskId,
        promptType: params.promptType,
        request: params.request as never,
        response: params.response as never,
        model: params.model ?? 'deepseek-chat',
      },
    });
  }

  formatFeedbackMessage(evaluation: AiEvaluationResponse): string {
    const lines: string[] = [
      `📊 Оценка: ${evaluation.score}/100`,
      evaluation.passed ? '✅ Задание выполнено!' : '❌ Нужно повторить задание.',
    ];

    if (evaluation.errors?.length) {
      lines.push('\n🔍 Ошибки:');
      evaluation.errors.forEach((err, i) => {
        lines.push(`${i + 1}. "${err.wrong}" → "${err.correct}"`);
        lines.push(`   ${err.explanation}`);
      });
    }

    if (evaluation.correctedAnswer) {
      lines.push(`\n✏️ Правильный вариант: ${evaluation.correctedAnswer}`);
    }

    if (evaluation.recommendations?.length) {
      lines.push('\n💡 Рекомендации:');
      evaluation.recommendations.forEach((rec) => lines.push(`• ${rec}`));
    }

    return lines.join('\n');
  }
}
