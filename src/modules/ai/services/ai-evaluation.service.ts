import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiCoreService } from './ai-core.service';
import { PROMPTS } from '../../../common/constants/prompts';
import {
  AiEvaluationResponse,
  AiSpeakingAnalysis,
} from '../../../common/interfaces/ai-response.interface';

@Injectable()
export class AiEvaluationService {
  constructor(
    private readonly aiCore: AiCoreService,
    private readonly configService: ConfigService,
  ) {}

  async evaluateVocabulary(
    word: string,
    expected: string,
    userAnswer: string,
    taskType: string,
  ): Promise<AiEvaluationResponse> {
    const { data } = await this.aiCore.generateJson<AiEvaluationResponse>(
      PROMPTS.EVALUATE_VOCABULARY(word, expected, userAnswer, taskType),
    );

    return this.applyThreshold(data, 'vocabulary');
  }

  async evaluateGrammar(
    question: string,
    userAnswer: string,
    level: string,
  ): Promise<AiEvaluationResponse> {
    const { data } = await this.aiCore.generateJson<AiEvaluationResponse>(
      PROMPTS.EVALUATE_GRAMMAR(question, userAnswer, level),
    );

    return this.applyThreshold(data, 'grammar');
  }

  async analyzeSpeaking(
    topic: string,
    transcript: string,
    level: string,
  ): Promise<AiSpeakingAnalysis> {
    const { data } = await this.aiCore.generateJson<AiSpeakingAnalysis>(
      PROMPTS.ANALYZE_SPEAKING(topic, transcript, level),
    );

    const threshold = this.configService.get<number>('thresholds.speaking', 70);
    data.passed = data.score >= threshold;

    return data;
  }

  async evaluateListening(
    originalText: string,
    userAnswer: string,
    mode: string,
  ): Promise<AiEvaluationResponse> {
    const { data } = await this.aiCore.generateJson<AiEvaluationResponse>(
      PROMPTS.EVALUATE_LISTENING(originalText, userAnswer, mode),
    );

    return this.applyThreshold(data, 'listening');
  }

  private applyThreshold(
    data: AiEvaluationResponse,
    skill: 'vocabulary' | 'grammar' | 'listening',
  ): AiEvaluationResponse {
    const threshold = this.configService.get<number>(`thresholds.${skill}`, 70);
    return { ...data, passed: data.score >= threshold };
  }
}
