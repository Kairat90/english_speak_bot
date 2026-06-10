import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SYSTEM_PROMPT } from '../../../common/constants/prompts';
import { AiApiError } from '../../../common/errors/ai-api.error';
import { AiProvider } from './ai-provider.interface';

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

@Injectable()
export class OpenAiCompatibleProvider implements AiProvider {
  private readonly logger = new Logger(OpenAiCompatibleProvider.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly maxRetries = 2;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('ai.baseUrl', 'https://api.deepseek.com');
    this.apiKey = this.configService.get<string>('ai.apiKey', '');
    this.model = this.configService.get<string>('ai.model', 'deepseek-chat');

    if (!this.apiKey) {
      throw new Error('AI_API_KEY не задан. Получите ключ на https://platform.deepseek.com');
    }

    this.logger.log(`AI provider: ${this.baseUrl}, model: ${this.model}`);
  }

  async generateJson<T>(prompt: string, userId?: string): Promise<{ data: T; raw: string }> {
    const raw = await this.chatCompletion(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      true,
    );

    const { parseGeminiJson } = await import('../../../common/utils/json-parser.util');
    const data = parseGeminiJson<T>(raw);
    this.logger.debug(`AI JSON response${userId ? ` for user ${userId}` : ''}`);
    return { data, raw };
  }

  async generateText(prompt: string): Promise<string> {
    return this.chatCompletion([{ role: 'user', content: prompt }], false);
  }

  private async chatCompletion(
    messages: Array<{ role: string; content: string }>,
    jsonMode: boolean,
  ): Promise<string> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.model,
            messages,
            temperature: jsonMode ? 0.3 : 0.7,
            ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
          }),
        });

        const body = (await response.json()) as ChatCompletionResponse;

        if (!response.ok) {
          throw new Error(JSON.stringify(body.error ?? body));
        }

        const content = body.choices?.[0]?.message?.content?.trim();
        if (!content) {
          throw new Error('Empty AI response');
        }

        return content;
      } catch (error) {
        lastError = error;

        if (!AiApiError.isRetryable(error)) {
          this.logger.error(`AI API error: ${(error as Error).message}`);
          throw error;
        }

        const delaySec = 3 + attempt * 2;
        this.logger.warn(`AI retry ${attempt + 1}/${this.maxRetries + 1}, wait ${delaySec}s`);
        await new Promise((r) => setTimeout(r, delaySec * 1000));
      }
    }

    throw AiApiError.fromUnknown(lastError);
  }
}
