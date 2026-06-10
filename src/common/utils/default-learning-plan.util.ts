import { AiLearningPlan } from '../interfaces/ai-response.interface';

/**
 * Запасной учебный план, если Gemini недоступен.
 */
export function buildDefaultLearningPlan(profile: {
  name?: string | null;
  goal?: string | null;
  dailyMinutes?: number;
  skills?: Record<string, string>;
}): AiLearningPlan {
  const skills = profile.skills ?? {};
  const skillEntries = Object.entries(skills);

  const focusAreas = skillEntries.map(([skill, level], index) => ({
    skill,
    priority: skillEntries.length - index,
    reason: `Текущий уровень: ${level}`,
  }));

  if (!focusAreas.length) {
    focusAreas.push(
      { skill: 'VOCABULARY', priority: 5, reason: 'Базовый словарный запас' },
      { skill: 'GRAMMAR', priority: 4, reason: 'Грамматическая основа' },
      { skill: 'SPEAKING', priority: 3, reason: 'Развитие речи' },
    );
  }

  return {
    title: `План для ${profile.name ?? 'ученика'}`,
    description:
      `Цель: ${profile.goal ?? 'изучение английского'}. ` +
      `Занятия: ${profile.dailyMinutes ?? 15} мин/день. ` +
      'План создан автоматически (ИИ временно недоступен).',
    focusAreas,
    weeklyGoals: [
      { skill: 'VOCABULARY', tasksPerWeek: 5 },
      { skill: 'GRAMMAR', tasksPerWeek: 3 },
      { skill: 'SPEAKING', tasksPerWeek: 2 },
      { skill: 'LISTENING', tasksPerWeek: 2 },
    ],
  };
}
