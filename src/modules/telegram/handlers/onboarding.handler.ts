import { Injectable } from '@nestjs/common';
import { Context } from 'telegraf';
import { OnboardingStep } from '@prisma/client';
import { UsersService } from '../../users/users.service';
import { mainMenuKeyboard } from '../keyboards/main.keyboard';

@Injectable()
export class OnboardingHandler {
  constructor(private readonly usersService: UsersService) {}

  async handle(ctx: Context, userId: string, text: string): Promise<boolean> {
    const user = await this.usersService.findById(userId);

    if (user.isOnboarded) {
      return false;
    }

    const step = user.onboardingStep;

    if (step === OnboardingStep.COMPLETED) {
      return false;
    }

    await this.usersService.processOnboardingAnswer(userId, step, text);
    const updatedUser = await this.usersService.findById(userId);

    if (updatedUser.isOnboarded) {
      await ctx.reply(
        [
          `🎉 Отлично, ${updatedUser.displayName}!`,
          'Ваш профиль создан, учебный план сформирован.',
          'Выберите действие в меню:',
        ].join('\n'),
        mainMenuKeyboard(),
      );
      return true;
    }

    const nextQuestion = this.usersService.getOnboardingQuestion(updatedUser.onboardingStep);
    await ctx.reply(nextQuestion);
    return true;
  }

  async start(ctx: Context, userId: string): Promise<void> {
    const user = await this.usersService.findById(userId);

    if (user.isOnboarded) {
      await ctx.reply('Вы уже прошли онбординг. Используйте меню.', mainMenuKeyboard());
      return;
    }

    const question = this.usersService.getOnboardingQuestion(user.onboardingStep);
    await ctx.reply(
      '👋 Добро пожаловать в English Speak Bot!\n\n' + question,
    );
  }
}
