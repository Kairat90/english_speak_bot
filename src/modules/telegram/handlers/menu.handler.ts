import { Injectable } from '@nestjs/common';
import { Context } from 'telegraf';
import { SkillType } from '@prisma/client';
import { UsersService } from '../../users/users.service';
import { ProgressService } from '../../progress/progress.service';
import { StatisticsService } from '../../statistics/statistics.service';
import { VocabularyService } from '../../vocabulary/vocabulary.service';
import { NotificationsService } from '../../notifications/notifications.service';
import {
  mainMenuKeyboard,
  learningModeKeyboard,
  levelKeyboard,
  MENU_MAP,
} from '../keyboards/main.keyboard';
import { MenuAction } from '../../../common/enums';
import { SKILL_LABELS, LEVEL_LABELS } from '../../../common/enums';

@Injectable()
export class MenuHandler {
  constructor(
    private readonly usersService: UsersService,
    private readonly progressService: ProgressService,
    private readonly statisticsService: StatisticsService,
    private readonly vocabularyService: VocabularyService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async handleMenuAction(ctx: Context, userId: string, text: string): Promise<boolean> {
    const action = MENU_MAP[text];
    if (!action) return false;

    switch (action) {
      case MenuAction.START_LEARNING:
        await ctx.reply('Выберите режим обучения:', learningModeKeyboard());
        break;

      case MenuAction.MY_PROGRESS:
        await this.showProgress(ctx, userId);
        break;

      case MenuAction.STATISTICS:
        await this.showStatistics(ctx, userId);
        break;

      case MenuAction.REVIEW_WORDS:
        await this.showReviewWords(ctx, userId);
        break;

      case MenuAction.SETTINGS:
        await this.showSettings(ctx, userId);
        break;

      case MenuAction.CHANGE_LEVELS:
        await ctx.reply(
          'Выберите навык для изменения уровня:\n' +
            Object.entries(SKILL_LABELS)
              .map(([k, v]) => `• ${v} (${k})`)
              .join('\n') +
            '\n\nНапишите название навыка (например: SPEAKING)',
          levelKeyboard(),
        );
        await this.usersService.setState(userId, 'CHANGE_LEVELS', { step: 'select_skill' });
        break;

      case MenuAction.DAILY_CHALLENGE:
        await this.startDailyChallenge(ctx, userId);
        break;

      default:
        return false;
    }

    return true;
  }

  async showProgress(ctx: Context, userId: string): Promise<void> {
    const progress = await this.progressService.getUserProgress(userId);

    const lines = ['📈 Ваш прогресс\n'];

    for (const skill of progress.skills) {
      lines.push(`${SKILL_LABELS[skill.skill] ?? skill.skill}: ${LEVEL_LABELS[skill.level] ?? skill.level} (${Math.round(skill.score)}%)`);
    }

    lines.push(`\n📚 Выучено слов: ${progress.vocabularyLearned}`);

    await ctx.reply(lines.join('\n'), mainMenuKeyboard());
  }

  async showStatistics(ctx: Context, userId: string): Promise<void> {
    const data = await this.statisticsService.getStatistics(userId);
    const message = this.statisticsService.formatStatisticsMessage(userId, data);
    await ctx.reply(message, mainMenuKeyboard());
  }

  async showReviewWords(ctx: Context, userId: string): Promise<void> {
    const words = await this.vocabularyService.getWordsForReview(userId);

    if (!words.length) {
      await ctx.reply('Нет слов для повторения. Продолжайте обучение!', mainMenuKeyboard());
      return;
    }

    const word = words[0].word;
    await ctx.reply(
      `🔁 Повторение слов (${words.length} в очереди)\n\nПереведите: "${word.word}"`,
    );
    await this.usersService.setState(userId, 'VOCABULARY_TEST', {
      taskId: null,
      words: [{ id: word.id, word: word.word, translation: word.translation, example: word.example ?? '' }],
      currentIndex: 0,
      phase: 'translate',
    });
  }

  async showSettings(ctx: Context, userId: string): Promise<void> {
    const user = await this.usersService.findById(userId);

    await ctx.reply(
      [
        '⚙️ Настройки',
        `👤 Имя: ${user.displayName ?? '—'}`,
        `🎯 Цель: ${user.learningGoal ?? '—'}`,
        `⏰ Время в день: ${user.dailyMinutes} мин.`,
      ].join('\n'),
      mainMenuKeyboard(),
    );
  }

  async startDailyChallenge(ctx: Context, userId: string): Promise<void> {
    const challenge = await this.notificationsService.createDailyChallenge(userId);

    await ctx.reply(
      [
        '🎯 Ежедневное задание',
        challenge.task.title,
        JSON.stringify(challenge.task.content, null, 2),
        '',
        'Выберите режим обучения для выполнения задания.',
      ].join('\n'),
      learningModeKeyboard(),
    );
  }

  async handleChangeLevels(ctx: Context, userId: string, text: string): Promise<boolean> {
    const user = await this.usersService.findById(userId);
    const state = (user.stateData as { step?: string; skill?: string }) ?? {};

    if (text === '🔙 Отмена' || text === '🔙 Главное меню') {
      await this.usersService.setState(userId, 'IDLE', {});
      await ctx.reply('Отменено.', mainMenuKeyboard());
      return true;
    }

    if (state.step === 'select_skill') {
      const skill = text.toUpperCase() as SkillType;
      if (!Object.keys(SKILL_LABELS).includes(skill)) {
        await ctx.reply('Неверный навык. Напишите, например: SPEAKING');
        return true;
      }

      await this.usersService.setState(userId, 'CHANGE_LEVELS', { step: 'select_level', skill });
      await ctx.reply(`Выберите новый уровень для ${SKILL_LABELS[skill]}:`, levelKeyboard());
      return true;
    }

    if (state.step === 'select_level' && state.skill) {
      const level = text.toUpperCase();
      if (!Object.keys(LEVEL_LABELS).includes(level)) {
        await ctx.reply('Неверный уровень. Выберите из клавиатуры.');
        return true;
      }

      await this.usersService.updateSkillLevel(userId, { skill: state.skill, level });
      await this.usersService.setState(userId, 'IDLE', {});
      await ctx.reply(
        `✅ ${SKILL_LABELS[state.skill]} обновлён до ${LEVEL_LABELS[level]}`,
        mainMenuKeyboard(),
      );
      return true;
    }

    return false;
  }
}
