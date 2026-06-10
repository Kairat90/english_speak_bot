import { Module, forwardRef } from '@nestjs/common';
import { VoiceProcessingService } from './voice-processing.service';
import { AiModule } from '../ai/ai.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [forwardRef(() => AiModule), FilesModule],
  providers: [VoiceProcessingService],
  exports: [VoiceProcessingService],
})
export class VoiceModule {}
