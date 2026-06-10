export type AiErrorKind = 'quota' | 'balance' | 'unavailable' | 'unknown';

export class AiApiError extends Error {
  readonly kind: AiErrorKind;
  readonly retryAfterSec?: number;

  constructor(message: string, kind: AiErrorKind = 'unknown', retryAfterSec?: number) {
    super(message);
    this.name = 'AiApiError';
    this.kind = kind;
    this.retryAfterSec = retryAfterSec;
  }

  static isRetryable(error: unknown): boolean {
    const msg = error instanceof Error ? error.message : String(error);
    return (
      msg.includes('429') ||
      msg.includes('503') ||
      msg.includes('rate') ||
      msg.includes('RESOURCE_EXHAUSTED') ||
      msg.includes('UNAVAILABLE') ||
      msg.includes('overloaded')
    );
  }

  static isBalanceError(error: unknown): boolean {
    const msg = error instanceof Error ? error.message : String(error);
    return msg.includes('Insufficient Balance') || msg.includes('insufficient_balance');
  }

  static fromUnknown(error: unknown): AiApiError {
    const msg = error instanceof Error ? error.message : String(error);
    let kind: AiErrorKind = 'unknown';

    if (AiApiError.isBalanceError(error)) {
      kind = 'balance';
    } else if (msg.includes('429') || msg.includes('rate') || msg.includes('quota')) {
      kind = 'quota';
    } else if (msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('overloaded')) {
      kind = 'unavailable';
    }

    return new AiApiError(msg, kind);
  }

  userMessage(): string {
    if (this.kind === 'balance') {
      return (
        '💳 Баланс DeepSeek пустой.\n\n' +
        '1. Зайдите на https://platform.deepseek.com\n' +
        '2. Top Up → пополните от $2\n' +
        '3. Перезапустите бота и попробуйте снова'
      );
    }
    if (this.kind === 'quota') {
      return '⏳ Лимит AI API исчерпан. Подождите и повторите или проверьте баланс DeepSeek.';
    }
    if (this.kind === 'unavailable') {
      return '⏳ AI сервер временно недоступен. Попробуйте через 1–2 минуты.';
    }
    return '❌ Ошибка AI. Попробуйте позже.';
  }
}

/** @deprecated используйте AiApiError */
export const GeminiApiError = AiApiError;
