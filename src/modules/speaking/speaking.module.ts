import { Module, forwardRef } from '@nestjs/common';
import { SpeakingService } from './speaking.service';
import { AiModule } from '../ai/ai.module';
import { TasksModule } from '../tasks/tasks.module';
import { UsersModule } from '../users/users.module';
import { VoiceModule } from '../voice/voice.module';
import { ProgressModule } from '../progress/progress.module';
import { StatisticsModule } from '../statistics/statistics.module';

@Module({
  imports: [
    AiModule,
    TasksModule,
    forwardRef(() => UsersModule),
    VoiceModule,
    ProgressModule,
    StatisticsModule,
  ],
  providers: [SpeakingService],
  exports: [SpeakingService],
})
export class SpeakingModule {}
