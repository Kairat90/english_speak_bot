import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TaskStatus, TaskType, SkillType, CEFRLevel } from '@prisma/client';
import { CreateTaskDto, SubmitTaskAnswerDto } from './dto/task.dto';
import { AiEvaluationResponse } from '../../common/interfaces/ai-response.interface';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateTaskDto, lessonId?: string) {
    return this.prisma.task.create({
      data: {
        lessonId,
        type: dto.type as TaskType,
        skill: dto.skill as SkillType,
        title: dto.title,
        content: dto.content as never,
        level: dto.level as CEFRLevel,
        status: TaskStatus.PENDING,
      },
    });
  }

  async findById(taskId: string) {
    return this.prisma.task.findUniqueOrThrow({
      where: { id: taskId },
      include: { attempts: { orderBy: { createdAt: 'desc' } } },
    });
  }

  async startTask(taskId: string) {
    return this.prisma.task.update({
      where: { id: taskId },
      data: { status: TaskStatus.IN_PROGRESS },
    });
  }

  async recordAttempt(
    userId: string,
    dto: SubmitTaskAnswerDto,
    evaluation: AiEvaluationResponse,
  ) {
    const task = await this.findById(dto.taskId);
    const attemptCount = task.attempts.length;

    if (attemptCount >= task.maxAttempts && !evaluation.passed) {
      throw new BadRequestException('Maximum attempts reached');
    }

    const attempt = await this.prisma.taskAttempt.create({
      data: {
        taskId: dto.taskId,
        userId,
        attemptNum: attemptCount + 1,
        userAnswer: dto.userAnswer,
        answerType: dto.answerType ?? 'text',
        score: evaluation.score,
        passed: evaluation.passed,
        errors: evaluation.errors as never,
        feedback: evaluation as never,
        durationSec: dto.durationSec,
      },
    });

    if (evaluation.passed) {
      await this.prisma.task.update({
        where: { id: dto.taskId },
        data: { status: TaskStatus.COMPLETED },
      });
    } else if (attemptCount + 1 >= task.maxAttempts) {
      await this.prisma.task.update({
        where: { id: dto.taskId },
        data: { status: TaskStatus.FAILED },
      });
    }

    return attempt;
  }

  async getActiveTaskForUser(userId: string) {
    return this.prisma.task.findFirst({
      where: {
        status: TaskStatus.IN_PROGRESS,
        lesson: { userId },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
