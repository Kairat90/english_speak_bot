import { Context } from 'telegraf';

/**
 * Отправляет сообщение в Telegram с повтором при сетевых сбоях.
 */
export async function safeReply(
  ctx: Context,
  text: string,
  extra?: Parameters<Context['reply']>[1],
): Promise<void> {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await ctx.reply(text, extra);
      return;
    } catch (error) {
      const message = (error as Error).message ?? '';
      const isNetworkError =
        message.includes('socket hang up') ||
        message.includes('ECONNRESET') ||
        message.includes('ETIMEDOUT') ||
        message.includes('FetchError');

      if (!isNetworkError || attempt === maxAttempts) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
}
