export { SkillType, CEFRLevel, TaskType, TaskStatus, OnboardingStep } from '@prisma/client';

export enum BotState {
  IDLE = 'IDLE',
  ONBOARDING = 'ONBOARDING',
  VOCABULARY_LEARN = 'VOCABULARY_LEARN',
  VOCABULARY_TEST = 'VOCABULARY_TEST',
  GRAMMAR_EXERCISE = 'GRAMMAR_EXERCISE',
  SPEAKING_TOPIC = 'SPEAKING_TOPIC',
  LISTENING_EXERCISE = 'LISTENING_EXERCISE',
  DAILY_CHALLENGE = 'DAILY_CHALLENGE',
  SETTINGS = 'SETTINGS',
  CHANGE_LEVELS = 'CHANGE_LEVELS',
}

export enum MenuAction {
  START_LEARNING = 'start_learning',
  MY_PROGRESS = 'my_progress',
  STATISTICS = 'statistics',
  REVIEW_WORDS = 'review_words',
  SETTINGS = 'settings',
  CHANGE_LEVELS = 'change_levels',
  DAILY_CHALLENGE = 'daily_challenge',
}

export const CEFR_LEVELS = ['BEGINNER', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

export const SKILL_LABELS: Record<string, string> = {
  SPEAKING: 'Говорение',
  LISTENING: 'Аудирование',
  VOCABULARY: 'Словарный запас',
  GRAMMAR: 'Грамматика',
  READING: 'Чтение',
  WRITING: 'Письмо',
};

export const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: 'Beginner',
  A1: 'A1',
  A2: 'A2',
  B1: 'B1',
  B2: 'B2',
  C1: 'C1',
  C2: 'C2',
};
