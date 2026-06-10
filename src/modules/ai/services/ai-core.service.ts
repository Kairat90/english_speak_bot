import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { SYSTEM_PROMPT } from '../../../common/constants/prompts';
import { GeminiApiError } from '../../../common/errors/gemini-api.error';

@Injectable()
export class AiCoreService {
  private readonly logger = new Logger(AiCoreService.name);
  private readonly client: GoogleGenAI;
  private readonly models: string[];
  private readonly maxRetries = 2;

  constructor(private readonly configService: ConfigService) {
    this.client = new GoogleGenAI({
      apiKey: this.configService.get<string>('gemini.apiKey'),
    });

    const primary = this.configService.get<string>('gemini.model', 'gemini-2.5-flash-lite');
    const fallbacks = this.configService.get<string>('gemini.fallbackModels', '');
    const fallbackList = fallbacks
      ? fallbacks.split(',').map((m) => m.trim()).filter(Boolean)
      : ['gemini-2.5-flash', 'gemini-2.0-flash'];

    this.models = [...new Set([primary, ...fallbackList])];
    this.logger.log(`Gemini models: ${this.models.join(' → ')}`);
  }

  async generateJson<T>(prompt: string, userId?: string): Promise<{ data: T; raw: string }> {
    const raw = await this.generateWithFallback(prompt, true);
    const { parseGeminiJson } = await import('../../../common/utils/json-parser.util');
    const data = parseGeminiJson<T>(raw);

    this.logger.debug(`Gemini response generated${userId ? ` for user ${userId}` : ''}`);
    return { data, raw };
  }

  async generateText(prompt: string): Promise<string> {
    return this.generateWithFallback(prompt, false);
  }

  private async generateWithFallback(prompt: string, jsonMode: boolean): Promise<string> {
    let lastError: unknown;

    for (const model of this.models) {
      for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
        try {
          const response = await this.client.models.generateContent({
            model,
            contents: [
              { role: 'user', parts: [{ text: jsonMode ? `${SYSTEM_PROMPT}\n\n${prompt}` : prompt }] },
            ],
            config: jsonMode ? { responseMimeType: 'application/json' } : undefined,
          });

          const text = response.text ?? '';
          if (text) {
            if (model !== this.models[0]) {
              this.logger.warn(`Gemini ответил через запасную модель: ${model}`);
            }
            return text;
          }
        } catch (error) {
          lastError = error;

          if (GeminiApiError.isModelNotFound(error)) {
            this.logger.warn(`Модель ${model} недоступна в API, пробуем следующую...`);
            break;
          }

          if (!GeminiApiError.isRetryable(error)) {
            this.logger.error(`Gemini API error (${model}): ${(error as Error).message}`);
            throw error;
          }

          const apiError = GeminiApiError.fromUnknown(error);
          const delaySec = apiError.retryAfterSec ?? 3 + attempt * 2;

          this.logger.warn(
            `Gemini ${apiError.kind} (${model}), попытка ${attempt + 1}/${this.maxRetries + 1}, ждём ${delaySec}s`,
          );

          if (attempt < this.maxRetries) {
            await this.sleep(delaySec * 1000);
            continue;
          }

          break;
        }
      }
    }

    this.logger.error(`Gemini недоступен для всех моделей: ${this.models.join(', ')}`);
    throw GeminiApiError.fromUnknown(lastError);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
