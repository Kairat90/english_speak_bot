import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AchievementType } from '@prisma/client';
import { AiEvaluationResponse } from '../../common/interfaces/ai-response.interface';

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatistics(userId: string) {
    const stats = await this.prisma.userStatistics.findUnique({ where: { userId } });
    const achievements = await this.prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
    });

    const recentAttempts = await this.prisma.taskAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { task: { select: { type: true, skill: true, title: true } } },
    });

    return { stats, achievements, recentAttempts };
  }

  async recordTaskResult(userId: string, evaluation: AiEvaluationResponse) {
    const stats = await this.prisma.userStatistics.findUnique({ where: { userId } });

    if (!stats) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastStudy = stats.lastStudyDate ? new Date(stats.lastStudyDate) : null;
    let currentStreak = stats.currentStreak;

    if (lastStudy) {
      const lastStudyDay = new Date(lastStudy);
      lastStudyDay.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today.getTime() - lastStudyDay.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentStreak += 1;
      } else if (diffDays > 1) {
        currentStreak = 1;
      }
    } else {
      currentStreak = 1;
    }

    const tasksCompleted = stats.tasksCompleted + (evaluation.passed ? 1 : 0);
    const tasksFailed = stats.tasksFailed + (evaluation.passed ? 0 : 1);
    const totalTasks = tasksCompleted + tasksFailed;
    const averageScore =
      totalTasks === 0
        ? evaluation.score
        : (stats.averageScore * (totalTasks - 1) + evaluation.score) / totalTasks;

    const errorHistory = [
      ...(stats.errorHistory as object[]),
      ...(evaluation.errors ?? []).slice(0, 5),
    ].slice(-50);

    await this.prisma.userStatistics.update({
      where: { userId },
      data: {
        tasksCompleted,
        tasksFailed,
        averageScore,
        currentStreak,
        longestStreak: Math.max(stats.longestStreak, currentStreak),
        lastStudyDate: new Date(),
        errorHistory: errorHistory as never,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { rating: { increment: evaluation.passed ? Math.round(evaluation.score / 10) : 0 } },
    });

    await this.checkAchievements(userId, { tasksCompleted, currentStreak, score: evaluation.score });
  }

  async checkAchievements(
    userId: string,
    context: { tasksCompleted: number; currentStreak: number; score: number },
  ) {
    const checks: Array<{ type: AchievementType; condition: boolean }> = [
      { type: AchievementType.FIRST_LESSON, condition: context.tasksCompleted >= 1 },
      { type: AchievementType.STREAK_7, condition: context.currentStreak >= 7 },
      { type: AchievementType.STREAK_30, condition: context.currentStreak >= 30 },
      { type: AchievementType.PERFECT_SCORE, condition: context.score === 100 },
    ];

    for (const check of checks) {
      if (!check.condition) continue;

      const achievement = await this.prisma.achievement.findUnique({
        where: { type: check.type },
      });

      if (!achievement) continue;

      await this.prisma.userAchievement.upsert({
        where: { userId_achievementId: { userId, achievementId: achievement.id } },
        update: {},
        create: { userId, achievementId: achievement.id },
      });
    }
  }

  formatStatisticsMessage(userId: string, data: Awaited<ReturnType<StatisticsService['getStatistics']>>): string {
    const stats = data.stats;
    if (!stats) return 'Статистика пока недоступна.';

    return [
      '📊 Ваша статистика',
      `✅ Выполнено заданий: ${stats.tasksCompleted}`,
      `❌ Провалено: ${stats.tasksFailed}`,
      `📈 Средний балл: ${Math.round(stats.averageScore)}`,
      `🔥 Текущая серия: ${stats.currentStreak} дн.`,
      `🏆 Лучшая серия: ${stats.longestStreak} дн.`,
      `⭐ Рейтинг: ${stats.tasksCompleted > 0 ? 'рассчитывается' : '0'}`,
      `🏅 Достижений: ${data.achievements.length}`,
    ].join('\n');
  }
}
