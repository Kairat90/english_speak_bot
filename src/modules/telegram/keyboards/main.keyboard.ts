import { Markup } from 'telegraf';
import { MenuAction } from '../../../common/enums';

export const mainMenuKeyboard = () =>
  Markup.keyboard([
    ['🎓 Начать обучение', '📈 Мой прогресс'],
    ['📊 Статистика', '🔁 Повторить слова'],
    ['⚙️ Настройки', '📊 Изменить уровни'],
    ['🎯 Ежедневное задание'],
  ])
    .resize()
    .persistent();

export const learningModeKeyboard = () =>
  Markup.keyboard([
    ['📚 Vocabulary', '✏️ Grammar'],
    ['🎤 Speaking', '👂 Listening'],
    ['🔙 Главное меню'],
  ])
    .resize();

export const levelKeyboard = () =>
  Markup.keyboard([
    ['Beginner', 'A1', 'A2'],
    ['B1', 'B2', 'C1', 'C2'],
    ['🔙 Отмена'],
  ])
    .resize();

export const listeningModeKeyboard = () =>
  Markup.keyboard([
    ['📝 Написать услышанное'],
    ['🎙 Пересказать голосом'],
    ['❓ Ответить на вопросы'],
    ['🔙 Главное меню'],
  ])
    .resize();

export const cancelKeyboard = () =>
  Markup.keyboard([['🔙 Главное меню']]).resize();

export const MENU_MAP: Record<string, MenuAction> = {
  '🎓 Начать обучение': MenuAction.START_LEARNING,
  '📈 Мой прогресс': MenuAction.MY_PROGRESS,
  '📊 Статистика': MenuAction.STATISTICS,
  '🔁 Повторить слова': MenuAction.REVIEW_WORDS,
  '⚙️ Настройки': MenuAction.SETTINGS,
  '📊 Изменить уровни': MenuAction.CHANGE_LEVELS,
  '🎯 Ежедневное задание': MenuAction.DAILY_CHALLENGE,
};
