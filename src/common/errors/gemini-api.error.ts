export type GeminiErrorKind = 'quota' | 'unavailable' | 'unknown';

/**
 * Ошибки Gemini API: квота (429), перегрузка (503) и др.
 */
export class GeminiApiError extends Error {
  readonly kind: GeminiErrorKind;
  readonly retryAfterSec?: number;

  constructor(message: string, kind: GeminiErrorKind = 'unknown', retryAfterSec?: number) {
    super(message);
    this.name = 'GeminiApiError';
    this.kind = kind;
    this.retryAfterSec = retryAfterSec;
  }

  /** Модель не найдена — нужно переключиться на другую. */
  static isModelNotFound(error: unknown): boolean {
    const msg = error instanceof Error ? error.message : String(error);
    return msg.includes('404') || msg.includes('NOT_FOUND') || msg.includes('is not found');
  }

  /** Ошибки, при которых имеет смысл повторить запрос или сменить модель. */
  static isRetryable(error: unknown): boolean {
    const msg = error instanceof Error ? error.message : String(error);
    return (
      GeminiApiError.isModelNotFound(error) ||
      msg.includes('429') ||
      msg.includes('503') ||
      msg.includes('RESOURCE_EXHAUSTED') ||
      msg.includes('UNAVAILABLE') ||
      msg.includes('high demand') ||
      msg.includes('quota')
    );
  }

  /** @deprecated используйте isRetryable */
  static isQuotaError(error: unknown): boolean {
    return GeminiApiError.isRetryable(error);
  }

  static fromUnknown(error: unknown): GeminiApiError {
    const msg = error instanceof Error ? error.message : String(error);
    const retryMatch = msg.match(/retry in (\d+(?:\.\d+)?)s/i);
    const retryAfterSec = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : msg.includes('503') ? 5 : undefined;

    let kind: GeminiErrorKind = 'unknown';
    if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
      kind = 'quota';
    } else if (msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand')) {
      kind = 'unavailable';
    }

    return new GeminiApiError(msg, kind, retryAfterSec);
  }

  userMessage(): string {
    if (this.kind === 'unavailable') {
      return (
        '⏳ Сервер Gemini временно перегружен.\n\n' +
        'Бот уже пробует запасные модели автоматически.\n' +
        'Подождите 1–2 минуты и повторите действие.'
      );
    }

    if (this.kind === 'quota') {
      const wait = this.retryAfterSec ? `\n\nПопробуйте через ~${this.retryAfterSec} сек.` : '';
      return (
        '⏳ Квота Gemini API исчерпана (бесплатный лимит).\n\n' +
        '• Подождите и повторите позже\n' +
        '• Смените модель: GEMINI_MODEL=gemini-2.5-flash-lite\n' +
        '• Новый ключ: https://aistudio.google.com/apikey' +
        wait
      );
    }

    return '❌ Ошибка Gemini API. Попробуйте позже.';
  }
}

/** @deprecated используйте GeminiApiError */
export const GeminiQuotaError = GeminiApiError;
