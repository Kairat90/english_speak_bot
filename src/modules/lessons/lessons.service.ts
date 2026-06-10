import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SkillType, LessonStatus } from '@prisma/client';

@Injectable()
export class LessonsService {
  constructor(private readonly prisma: PrismaService) {}

  async getNextLesson(userId: string) {
    return this.prisma.lesson.findFirst({
      where: { userId, status: { in: [LessonStatus.PLANNED, LessonStatus.IN_PROGRESS] } },
      orderBy: { orderIndex: 'asc' },
      include: { tasks: { orderBy: { orderIndex: 'asc' } } },
    });
  }

  async createLesson(userId: string, skill: SkillType, title: string, planId?: string) {
    const lastLesson = await this.prisma.lesson.findFirst({
      where: { userId },
      orderBy: { orderIndex: 'desc' },
    });

    return this.prisma.lesson.create({
      data: {
        userId,
        learningPlanId: planId,
        skill,
        title,
        orderIndex: (lastLesson?.orderIndex ?? 0) + 1,
      },
    });
  }

  async completeLesson(lessonId: string) {
    return this.prisma.lesson.update({
      where: { id: lessonId },
      data: { status: LessonStatus.COMPLETED, completedAt: new Date() },
    });
  }

  async getUserLessons(userId: string) {
    return this.prisma.lesson.findMany({
      where: { userId },
      orderBy: { orderIndex: 'asc' },
      include: { tasks: true },
    });
  }
}
