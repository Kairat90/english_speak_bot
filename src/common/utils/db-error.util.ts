/**
 * Формирует понятное сообщение об ошибке Prisma/PostgreSQL для пользователя Telegram.
 */
export function formatDbErrorMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);

  if (msg.includes('does not exist') || msg.includes('P2021')) {
    return (
      '❌ Таблицы в базе данных не созданы.\n\n' +
      'Выполните в терминале проекта:\n' +
      'npm run db:setup\n\n' +
      'Затем перезапустите бота: npm run start:dev'
    );
  }

  if (msg.includes("Can't reach") || msg.includes('P1001') || msg.includes('ENOTFOUND')) {
    return (
      '❌ Не удаётся подключиться к серверу БД.\n\n' +
      '1. Проверьте DATABASE_URL в файле .env\n' +
      '2. Зайдите в панель Neon — проект мог «заснуть», откройте его\n' +
      '3. Убедитесь, что в URL есть ?sslmode=require'
    );
  }

  if (msg.includes('P1000') || msg.includes('authentication') || msg.includes('password')) {
    return '❌ Ошибка авторизации в БД. Проверьте логин и пароль в DATABASE_URL.';
  }

  return `❌ Ошибка базы данных:\n${msg.slice(0, 300)}`;
}
