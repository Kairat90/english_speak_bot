import { PrismaClient, AchievementType } from '@prisma/client';

const prisma = new PrismaClient();

const achievements = [
  { type: AchievementType.FIRST_LESSON, title: 'Первый шаг', description: 'Завершите первое задание', icon: '🎯', threshold: 1 },
  { type: AchievementType.STREAK_7, title: 'Неделя практики', description: 'Занимайтесь 7 дней подряд', icon: '🔥', threshold: 7 },
  { type: AchievementType.STREAK_30, title: 'Месяц дисциплины', description: 'Занимайтесь 30 дней подряд', icon: '💪', threshold: 30 },
  { type: AchievementType.VOCABULARY_100, title: 'Словарный запас', description: 'Выучите 100 слов', icon: '📚', threshold: 100 },
  { type: AchievementType.SPEAKING_MASTER, title: 'Мастер речи', description: 'Пройдите 50 speaking-заданий', icon: '🎤', threshold: 50 },
  { type: AchievementType.GRAMMAR_GURU, title: 'Гуру грамматики', description: 'Пройдите 50 grammar-заданий', icon: '✏️', threshold: 50 },
  { type: AchievementType.PERFECT_SCORE, title: 'Идеальный результат', description: 'Получите 100 баллов за задание', icon: '⭐', threshold: 1 },
  { type: AchievementType.LEVEL_UP, title: 'Новый уровень', description: 'Повысьте уровень навыка', icon: '🚀', threshold: 1 },
];

async function main() {
  for (const achievement of achievements) {
    await prisma.achievement.upsert({
      where: { type: achievement.type },
      update: achievement,
      create: achievement,
    });
  }

  console.log('Seed completed: achievements created');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
