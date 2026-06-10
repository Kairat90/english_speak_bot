import { Injectable } from '@nestjs/common';
import { AiCoreService } from './ai-core.service';
import { PROMPTS } from '../../../common/constants/prompts';
import {
  AiVocabularyWord,
  AiGrammarTask,
  AiListeningTask,
  AiSpeakingTopic,
  AiLearningPlan,
} from '../../../common/interfaces/ai-response.interface';

@Injectable()
export class AiTaskGeneratorService {
  constructor(private readonly aiCore: AiCoreService) {}

  async generateVocabularyWords(level: string, count = 5): Promise<AiVocabularyWord[]> {
    const { data } = await this.aiCore.generateJson<{ words: AiVocabularyWord[] }>(
      PROMPTS.GENERATE_VOCABULARY(level, count),
    );
    return data.words;
  }

  async generateGrammarTask(level: string, topic?: string): Promise<AiGrammarTask> {
    const { data } = await this.aiCore.generateJson<AiGrammarTask>(
      PROMPTS.GENERATE_GRAMMAR_TASK(level, topic),
    );
    return data;
  }

  async generateSpeakingTopic(level: string): Promise<AiSpeakingTopic> {
    const { data } = await this.aiCore.generateJson<AiSpeakingTopic>(
      PROMPTS.GENERATE_SPEAKING_TOPIC(level),
    );
    return data;
  }

  async generateListeningTask(level: string, mode: string): Promise<AiListeningTask> {
    const { data } = await this.aiCore.generateJson<AiListeningTask>(
      PROMPTS.GENERATE_LISTENING(level, mode),
    );
    return data;
  }

  async generateLearningPlan(profile: object): Promise<AiLearningPlan> {
    const { data } = await this.aiCore.generateJson<AiLearningPlan>(
      PROMPTS.GENERATE_LEARNING_PLAN(profile),
    );
    return data;
  }

  async generateDailyChallenge(level: string, weakSkills: string[]) {
    const { data } = await this.aiCore.generateJson<{ title: string; tasks: unknown[] }>(
      PROMPTS.GENERATE_DAILY_CHALLENGE(level, weakSkills),
    );
    return data;
  }
}
