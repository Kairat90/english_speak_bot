import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CEFRLevel, SkillType } from '@prisma/client';
import { AiEvaluationResponse, AiSpeakingAnalysis } from '../../common/interfaces/ai-response.interface';

const LEVEL_ORDER: CEFRLevel[] = [
  CEFRLevel.BEGINNER,
  CEFRLevel.A1,
  CEFRLevel.A2,
  CEFRLevel.B1,
  CEFRLevel.B2,
  CEFRLevel.C1,
  CEFRLevel.C2,
];

@Injectable()
export class ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getUserProgress(userId: string) {
    const [skills, vocabulary, grammar, listening, speaking] = await Promise.all([
      this.prisma.userSkill.findMany({ where: { userId } }),
      this.prisma.vocabularyProgress.count({ where: { userId, familiarity: { gte: 0.8 } } }),
      this.prisma.grammarProgress.findMany({ where: { userId } }),
      this.prisma.listeningProgress.findMany({ where: { userId } }),
      this.prisma.speakingProgress.findMany({ where: { userId } }),
    ]);

    return { skills, vocabularyLearned: vocabulary, grammar, listening, speaking };
  }

  async updateVocabularyProgress(userId: string, wordId: string, correct: boolean) {
    const existing = await this.prisma.vocabularyProgress.findUnique({
      where: { userId_wordId: { userId, wordId } },
    });

    const easyMultiplier = this.configService.get<number>('srs.easyMultiplier', 2.5);
    const hardMultiplier = this.configService.get<number>('srs.hardMultiplier', 0.5);
    const initialInterval = this.configService.get<number>('srs.initialIntervalDays', 1);

    if (!existing) {
      const intervalDays = correct ? initialInterval : 1;
      return this.prisma.vocabularyProgress.create({
        data: {
          userId,
          wordId,
          familiarity: correct ? 0.3 : 0,
          correctCount: correct ? 1 : 0,
          wrongCount: correct ? 0 : 1,
          intervalDays,
          easeFactor: 2.5,
          nextReviewAt: this.addDays(intervalDays),
          lastReviewedAt: new Date(),
        },
      });
    }

    const easeFactor = correct
      ? Math.min(existing.easeFactor + 0.1, 3.0)
      : Math.max(existing.easeFactor * hardMultiplier, 1.3);

    const intervalDays = correct
      ? Math.max(1, Math.round(existing.intervalDays * (correct ? easyMultiplier : hardMultiplier)))
      : 1;

    return this.prisma.vocabularyProgress.update({
      where: { id: existing.id },
      data: {
        familiarity: Math.min(1, existing.familiarity + (correct ? 0.2 : -0.1)),
        correctCount: correct ? existing.correctCount + 1 : existing.correctCount,
        wrongCount: correct ? existing.wrongCount : existing.wrongCount + 1,
        easeFactor,
        intervalDays,
        nextReviewAt: this.addDays(intervalDays),
        lastReviewedAt: new Date(),
      },
    });
  }

  async updateGrammarProgress(
    userId: string,
    topic: string,
    level: CEFRLevel,
    evaluation: AiEvaluationResponse,
  ) {
    const existing = await this.prisma.grammarProgress.findUnique({
      where: { userId_topic: { userId, topic } },
    });

    const errors = evaluation.errors?.map((e) => e.explanation) ?? [];
    const weakPoints = [...(existing?.weakPoints as string[] ?? []), ...errors].slice(-20);

    const data = {
      tasksTotal: (existing?.tasksTotal ?? 0) + 1,
      tasksPassed: (existing?.tasksPassed ?? 0) + (evaluation.passed ? 1 : 0),
      averageScore: this.calcAverage(existing?.averageScore ?? 0, existing?.tasksTotal ?? 0, evaluation.score),
      weakPoints: weakPoints as never,
      lastPracticed: new Date(),
    };

    await this.prisma.grammarProgress.upsert({
      where: { userId_topic: { userId, topic } },
      update: data,
      create: { userId, topic, level, ...data },
    });

    if (evaluation.passed) {
      await this.checkLevelUp(userId, SkillType.GRAMMAR);
    }
  }

  async updateListeningProgress(userId: string, level: CEFRLevel, evaluation: AiEvaluationResponse) {
    await this.updateSkillProgress('listening', userId, level, evaluation);
    if (evaluation.passed) {
      await this.checkLevelUp(userId, SkillType.LISTENING);
    }
  }

  async updateSpeakingProgress(userId: string, level: CEFRLevel, analysis: AiSpeakingAnalysis) {
    const existing = await this.prisma.speakingProgress.findUnique({
      where: { userId_level: { userId, level } },
    });

    const data = {
      tasksTotal: (existing?.tasksTotal ?? 0) + 1,
      tasksPassed: (existing?.tasksPassed ?? 0) + (analysis.passed ? 1 : 0),
      averageScore: this.calcAverage(existing?.averageScore ?? 0, existing?.tasksTotal ?? 0, analysis.score),
      fluencyScore: this.calcAverage(existing?.fluencyScore ?? 0, existing?.tasksTotal ?? 0, analysis.fluency),
      weakPoints: (analysis.recommendations ?? []) as never,
      lastPracticed: new Date(),
    };

    await this.prisma.speakingProgress.upsert({
      where: { userId_level: { userId, level } },
      update: data,
      create: { userId, level, ...data },
    });

    if (analysis.passed) {
      await this.checkLevelUp(userId, SkillType.SPEAKING);
    }
  }

  async checkLevelUp(userId: string, skill: SkillType) {
    const userSkill = await this.prisma.userSkill.findUnique({
      where: { userId_skill: { userId, skill } },
    });

    if (!userSkill) return;

    const recentAttempts = await this.prisma.taskAttempt.findMany({
      where: {
        userId,
        passed: true,
        task: { skill },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (recentAttempts.length < 10) return;

    const avgScore = recentAttempts.reduce((sum, a) => sum + (a.score ?? 0), 0) / recentAttempts.length;

    if (avgScore < 80) return;

    const currentIndex = LEVEL_ORDER.indexOf(userSkill.level);
    if (currentIndex >= LEVEL_ORDER.length - 1) return;

    const newLevel = LEVEL_ORDER[currentIndex + 1];

    await this.prisma.userSkill.update({
      where: { userId_skill: { userId, skill } },
      data: { level: newLevel, score: avgScore },
    });

    return newLevel;
  }

  async getWeakSkills(userId: string): Promise<string[]> {
    const skills = await this.prisma.userSkill.findMany({ where: { userId } });
    return skills
      .filter((s) => s.score < 70)
      .sort((a, b) => a.score - b.score)
      .map((s) => s.skill);
  }

  private async updateSkillProgress(
    type: 'listening',
    userId: string,
    level: CEFRLevel,
    evaluation: AiEvaluationResponse,
  ) {
    const existing = await this.prisma.listeningProgress.findUnique({
      where: { userId_level: { userId, level } },
    });

    const data = {
      tasksTotal: (existing?.tasksTotal ?? 0) + 1,
      tasksPassed: (existing?.tasksPassed ?? 0) + (evaluation.passed ? 1 : 0),
      averageScore: this.calcAverage(existing?.averageScore ?? 0, existing?.tasksTotal ?? 0, evaluation.score),
      weakPoints: (evaluation.recommendations ?? []) as never,
      lastPracticed: new Date(),
    };

    await this.prisma.listeningProgress.upsert({
      where: { userId_level: { userId, level } },
      update: data,
      create: { userId, level, ...data },
    });
  }

  private calcAverage(current: number, count: number, newScore: number): number {
    return count === 0 ? newScore : (current * count + newScore) / (count + 1);
  }

  private addDays(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }
}
