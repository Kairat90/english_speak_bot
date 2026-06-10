import { Module } from '@nestjs/common';
import { AiCoreService } from './services/ai-core.service';
import { AiTaskGeneratorService } from './services/ai-task-generator.service';
import { AiEvaluationService } from './services/ai-evaluation.service';
import { AiFeedbackService } from './services/ai-feedback.service';
import { OpenAiCompatibleProvider } from './providers/openai-compatible.provider';

@Module({
  providers: [
    OpenAiCompatibleProvider,
    AiCoreService,
    AiTaskGeneratorService,
    AiEvaluationService,
    AiFeedbackService,
  ],
  exports: [AiTaskGeneratorService, AiEvaluationService, AiFeedbackService, AiCoreService],
})
export class AiModule {}
