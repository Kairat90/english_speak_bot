import { Injectable, Logger } from '@nestjs/common';
import { Update, Ctx, Start, On, Message } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { UsersService } from '../users/users.service';
import { OnboardingHandler } from './handlers/onboarding.handler';
import { MenuHandler } from './handlers/menu.handler';
import { LearningHandler } from './handlers/learning.handler';
import { mainMenuKeyboard, MENU_MAP } from './keyboards/main.keyboard';
import { formatDbErrorMessage } from '../../common/utils/db-error.util';
import { AiApiError } from '../../common/errors/ai-api.error';
import { safeReply } from '../../common/utils/telegram-reply.util';

@Update()
@Injectable()
export class TelegramUpdate {
  private readonly logger = new Logger(TelegramUpdate.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly onboardingHandler: OnboardingHandler,
    private readonly menuHandler: MenuHandler,
    private readonly learningHandler: LearningHandler,
  ) {}

  @Start()
  async onStart(@Ctx() ctx: Context) {
    const from = ctx.from;
    if (!from) return;

    this.logger.log(`/start от userId=${from.id} (@${from.username ?? 'no-username'})`);

    try {
      const user = await this.usersService.findOrCreateFromTelegram({
        telegramId: from.id.toString(),
        username: from.username,
        firstName: from.first_name,
        lastName: from.last_name,
      });

      if (!user.isOnboarded) {
        await this.onboardingHandler.start(ctx, user.id);
        return;
      }

      await safeReply(
        ctx,
        `С возвращением, ${user.displayName ?? from.first_name}! 👋\nВыберите действие:`,
        mainMenuKeyboard(),
      );
    } catch (error) {
      this.logger.error(`/start error: ${(error as Error).message}`, (error as Error).stack);
      await this.replyError(ctx, error);
    }
  }

  @On('voice')
  async onVoice(@Ctx() ctx: Context) {
    const user = await this.getUser(ctx);
    if (!user) return;

    const voice = ctx.message && 'voice' in ctx.message ? ctx.message.voice : null;
    if (!voice) return;

    try {
      await safeReply(ctx, '🎙 Обрабатываю голосовое сообщение...');
      await this.learningHandler.handleVoice(ctx, user.id, voice.file_id);
    } catch (error) {
      this.logger.error(`Voice processing error: ${(error as Error).message}`);
      const msg = (error as Error).message ?? '';
      let hint = '❌ Ошибка обработки голосового сообщения.';

      if (msg.includes('Whisper STT') || msg.includes('ECONNREFUSED')) {
        hint +=
          '\n\nПроверьте:\n' +
          '1. Audio-server запущен: services\\audio-server\\start.bat\n' +
          '2. ffmpeg установлен: winget install Gyan.FFmpeg\n' +
          '3. http://127.0.0.1:8001/health открывается в браузере';
      }

      await this.replyError(ctx, error, hint);
    }
  }

  @On('text')
  async onText(@Ctx() ctx: Context, @Message('text') text: string) {
    if (text.startsWith('/')) return;

    const user = await this.getUser(ctx);
    if (!user) {
      await safeReply(ctx, '❌ Ошибка: не удалось найти пользователя. Попробуйте /start');
      return;
    }

    try {
      if (!user.isOnboarded) {
        const handled = await this.onboardingHandler.handle(ctx, user.id, text);
        if (handled) return;
      }

      if (MENU_MAP[text]) {
        await this.menuHandler.handleMenuAction(ctx, user.id, text);
        return;
      }

      if (user.currentState === 'CHANGE_LEVELS') {
        const handled = await this.menuHandler.handleChangeLevels(ctx, user.id, text);
        if (handled) return;
      }

      if (user.currentState === 'LISTENING_SELECT') {
        const handled = await this.learningHandler.handleListeningMode(ctx, user.id, text);
        if (handled) return;
      }

      const learningModes = ['📚 Vocabulary', '✏️ Grammar', '🎤 Speaking', '👂 Listening', '🔙 Главное меню'];
      if (learningModes.includes(text) || user.currentState !== 'IDLE') {
        const modeHandled = await this.learningHandler.handleLearningMode(ctx, user.id, text);
        if (modeHandled) return;

        const answerHandled = await this.learningHandler.handleTextAnswer(ctx, user.id, text);
        if (answerHandled) return;
      }

      await safeReply(ctx, 'Используйте кнопки меню для навигации.', mainMenuKeyboard());
    } catch (error) {
      this.logger.error(`Text handler error: ${(error as Error).message}`);
      await this.replyError(ctx, error);
    }
  }

  private async replyError(ctx: Context, error: unknown, fallback = '❌ Произошла ошибка. Попробуйте ещё раз.'): Promise<void> {
    try {
      if (AiApiError.isRetryable(error) || AiApiError.isBalanceError(error)) {
        await safeReply(ctx, AiApiError.fromUnknown(error).userMessage());
        return;
      }

      const msg = (error as Error).message ?? '';
      if (msg.includes('P1001') || msg.includes('does not exist') || msg.includes('database')) {
        await safeReply(ctx, formatDbErrorMessage(error));
        return;
      }

      await safeReply(ctx, fallback);
    } catch (replyError) {
      this.logger.error(`Failed to send error reply: ${(replyError as Error).message}`);
    }
  }

  private async getUser(ctx: Context) {
    const from = ctx.from;
    if (!from) return null;

    try {
      return await this.usersService.findOrCreateFromTelegram({
        telegramId: from.id.toString(),
        username: from.username,
        firstName: from.first_name,
        lastName: from.last_name,
      });
    } catch (error) {
      this.logger.error(`User lookup error: ${(error as Error).message}`);
      return null;
    }
  }
}
