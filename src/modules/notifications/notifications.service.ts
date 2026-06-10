import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { SkillType, TaskType } from '@prisma/client';
import { AiTaskGeneratorService } from '../ai/services/ai-task-generator.service';
import { ProgressService } from '../progress/progress.service';
import { TasksService } from '../tasks/tasks.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private sendMessageFn?: (telegramId: string, text: string) => Promise<void>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly aiTaskGenerator: AiTaskGeneratorService,
    private readonly progressService: ProgressService,
    private readonly tasksService: TasksService,
  ) {}

  setMessageSender(fn: (telegramId: string, text: string) => Promise<void>) {
    this.sendMessageFn = fn;
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendDailyReminders() {
    this.logger.log('Sending daily reminders...');

    const users = await this.prisma.user.findMany({
      where: { isOnboarded: true, isActive: true },
    });

    for (const user of users) {
      if (!this.sendMessageFn) continue;

      const message = [
        `☀️ Доброе утро, ${user.displayName ?? 'друг'}!`,
        `Ваша цель: ${user.learningGoal ?? 'изучение английского'}`,
        `План на сегодня: ${user.dailyMinutes} минут`,
        '',
        'Нажмите «Ежедневное задание» в меню, чтобы начать!',
      ].join('\n');

      try {
        await this.sendMessageFn(user.telegramId.toString(), message);
      } catch (error) {
        this.logger.warn(`Failed to send reminder to ${user.telegramId}: ${(error as Error).message}`);
      }
    }
  }

  async createDailyChallenge(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await this.prisma.dailyChallenge.findUnique({
      where: { userId_date: { userId, date: today } },
    });

    if (existing) {
      return this.prisma.dailyChallenge.findUniqueOrThrow({
        where: { id: existing.id },
        include: { task: true },
      });
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { skills: true },
    });

    const weakSkills = await this.progressService.getWeakSkills(userId);
    const primarySkill = user.skills[0];
    const level = primarySkill?.level ?? 'A1';

    const challenge = await this.aiTaskGenerator.generateDailyChallenge(level, weakSkills);

    const task = await this.tasksService.create(userId, {
      type: TaskType.DAILY_CHALLENGE,
      skill: (weakSkills[0] as SkillType) ?? SkillType.VOCABULARY,
      title: challenge.title,
      content: challenge as never,
      level,
    });

    return this.prisma.dailyChallenge.create({
      data: {
        userId,
        taskId: task.id,
        date: today,
      },
      include: { task: true },
    });
  }
}
