import { Injectable } from '@nestjs/common';
import { OpenAiCompatibleProvider } from '../providers/openai-compatible.provider';
import { AiProvider } from '../providers/ai-provider.interface';

@Injectable()
export class AiCoreService implements AiProvider {
  constructor(private readonly provider: OpenAiCompatibleProvider) {}

  generateJson<T>(prompt: string, userId?: string) {
    return this.provider.generateJson<T>(prompt, userId);
  }

  generateText(prompt: string) {
    return this.provider.generateText(prompt);
  }
}
