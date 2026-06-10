import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SkillType, CEFRLevel, OnboardingStep } from '@prisma/client';
import { CreateUserDto, UpdateUserProfileDto, UpdateSkillLevelDto } from './dto/create-user.dto';
import { AiTaskGeneratorService } from '../ai/services/ai-task-generator.service';
import { AiApiError } from '../../common/errors/ai-api.error';
import { buildDefaultLearningPlan } from '../../common/utils/default-learning-plan.util';

const ALL_SKILLS: SkillType[] = [
  SkillType.SPEAKING,
  SkillType.LISTENING,
  SkillType.VOCABULARY,
  SkillType.GRAMMAR,
  SkillType.READING,
  SkillType.WRITING,
];

const ONBOARDING_FLOW: OnboardingStep[] = [
  OnboardingStep.NAME,
  OnboardingStep.GOAL,
  OnboardingStep.DAILY_TIME,
  OnboardingStep.SPEAKING_LEVEL,
  OnboardingStep.LISTENING_LEVEL,
  OnboardingStep.VOCABULARY_LEVEL,
  OnboardingStep.GRAMMAR_LEVEL,
  OnboardingStep.READING_LEVEL,
  OnboardingStep.WRITING_LEVEL,
  OnboardingStep.COMPLETED,
];

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiTaskGenerator: AiTaskGeneratorService,
  ) {}

  async findOrCreateFromTelegram(dto: CreateUserDto) {
    const telegramId = BigInt(dto.telegramId);

    let user = await this.prisma.user.findUnique({
      where: { telegramId },
      include: { skills: true, statistics: true },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          telegramId,
          username: dto.username,
          firstName: dto.firstName,
          lastName: dto.lastName,
          statistics: { create: {} },
        },
        include: { skills: true, statistics: true },
      });
    }

    return user;
  }

  async findByTelegramId(telegramId: string) {
    const user = await this.prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
      include: { skills: true, statistics: true, learningPlans: { where: { isActive: true } } },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { skills: true, statistics: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, dto: UpdateUserProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });
  }

  async processOnboardingAnswer(userId: string, step: OnboardingStep, answer: string) {
    const user = await this.findById(userId);
    const stateData = (user.stateData as Record<string, string>) ?? {};

    switch (step) {
      case OnboardingStep.NAME:
        await this.prisma.user.update({
          where: { id: userId },
          data: { displayName: answer, onboardingStep: OnboardingStep.GOAL },
        });
        break;

      case OnboardingStep.GOAL:
        await this.prisma.user.update({
          where: { id: userId },
          data: { learningGoal: answer, onboardingStep: OnboardingStep.DAILY_TIME },
        });
        break;

      case OnboardingStep.DAILY_TIME: {
        const minutes = parseInt(answer, 10) || 15;
        await this.prisma.user.update({
          where: { id: userId },
          data: { dailyMinutes: minutes, onboardingStep: OnboardingStep.SPEAKING_LEVEL },
        });
        break;
      }

      case OnboardingStep.SPEAKING_LEVEL:
      case OnboardingStep.LISTENING_LEVEL:
      case OnboardingStep.VOCABULARY_LEVEL:
      case OnboardingStep.GRAMMAR_LEVEL:
      case OnboardingStep.READING_LEVEL:
      case OnboardingStep.WRITING_LEVEL: {
        const skillMap: Record<string, SkillType> = {
          [OnboardingStep.SPEAKING_LEVEL]: SkillType.SPEAKING,
          [OnboardingStep.LISTENING_LEVEL]: SkillType.LISTENING,
          [OnboardingStep.VOCABULARY_LEVEL]: SkillType.VOCABULARY,
          [OnboardingStep.GRAMMAR_LEVEL]: SkillType.GRAMMAR,
          [OnboardingStep.READING_LEVEL]: SkillType.READING,
          [OnboardingStep.WRITING_LEVEL]: SkillType.WRITING,
        };

        const skill = skillMap[step];
        const level = answer.toUpperCase() as CEFRLevel;

        await this.prisma.userSkill.upsert({
          where: { userId_skill: { userId, skill } },
          update: { level },
          create: { userId, skill, level },
        });

        stateData[skill] = level;
        const currentIndex = ONBOARDING_FLOW.indexOf(step);
        const nextStep = ONBOARDING_FLOW[currentIndex + 1];

        if (nextStep === OnboardingStep.COMPLETED) {
          await this.completeOnboarding(userId, stateData);
        } else {
          await this.prisma.user.update({
            where: { id: userId },
            data: { onboardingStep: nextStep, stateData },
          });
        }
        break;
      }

      default:
        break;
    }

    return this.findById(userId);
  }

  async completeOnboarding(userId: string, skills: Record<string, string>) {
    const user = await this.findById(userId);

    const profile = {
      name: user.displayName,
      goal: user.learningGoal,
      dailyMinutes: user.dailyMinutes,
      skills,
    };

    let plan;
    try {
      plan = await this.aiTaskGenerator.generateLearningPlan(profile);
    } catch (error) {
      if (AiApiError.isRetryable(error)) {
        plan = buildDefaultLearningPlan(profile);
      } else {
        throw error;
      }
    }

    await this.prisma.learningPlan.create({
      data: {
        userId,
        title: plan.title,
        description: plan.description,
        focusAreas: plan.focusAreas as never,
        weeklyGoals: plan.weeklyGoals as never,
      },
    });

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        isOnboarded: true,
        onboardingStep: OnboardingStep.COMPLETED,
        currentState: 'IDLE',
      },
      include: { skills: true },
    });
  }

  async updateSkillLevel(userId: string, dto: UpdateSkillLevelDto) {
    return this.prisma.userSkill.upsert({
      where: { userId_skill: { userId, skill: dto.skill as SkillType } },
      update: { level: dto.level as CEFRLevel },
      create: { userId, skill: dto.skill as SkillType, level: dto.level as CEFRLevel },
    });
  }

  async setState(userId: string, state: string, stateData?: object) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { currentState: state, stateData: stateData as never },
    });
  }

  async getSkillLevel(userId: string, skill: SkillType): Promise<CEFRLevel> {
    const userSkill = await this.prisma.userSkill.findUnique({
      where: { userId_skill: { userId, skill } },
    });

    return userSkill?.level ?? CEFRLevel.BEGINNER;
  }

  async initializeDefaultSkills(userId: string) {
    for (const skill of ALL_SKILLS) {
      await this.prisma.userSkill.upsert({
        where: { userId_skill: { userId, skill } },
        update: {},
        create: { userId, skill, level: CEFRLevel.BEGINNER },
      });
    }
  }

  getOnboardingQuestion(step: OnboardingStep): string {
    const questions: Record<OnboardingStep, string> = {
      [OnboardingStep.NAME]: '👋 Как вас зовут?',
      [OnboardingStep.GOAL]: '🎯 Какова ваша цель изучения английского?',
      [OnboardingStep.DAILY_TIME]: '⏰ Сколько минут в день готовы заниматься? (например: 15)',
      [OnboardingStep.SPEAKING_LEVEL]: '🗣 Ваш уровень Speaking? (Beginner/A1/A2/B1/B2/C1/C2)',
      [OnboardingStep.LISTENING_LEVEL]: '👂 Ваш уровень Listening? (Beginner/A1/A2/B1/B2/C1/C2)',
      [OnboardingStep.VOCABULARY_LEVEL]: '📚 Ваш уровень Vocabulary? (Beginner/A1/A2/B1/B2/C1/C2)',
      [OnboardingStep.GRAMMAR_LEVEL]: '✏️ Ваш уровень Grammar? (Beginner/A1/A2/B1/B2/C1/C2)',
      [OnboardingStep.READING_LEVEL]: '📖 Ваш уровень Reading? (Beginner/A1/A2/B1/B2/C1/C2)',
      [OnboardingStep.WRITING_LEVEL]: '✍️ Ваш уровень Writing? (Beginner/A1/A2/B1/B2/C1/C2)',
      [OnboardingStep.COMPLETED]: '✅ Онбординг завершён!',
    };

    return questions[step];
  }
}
