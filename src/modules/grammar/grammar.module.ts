import { Module, forwardRef } from '@nestjs/common';
import { GrammarService } from './grammar.service';
import { AiModule } from '../ai/ai.module';
import { TasksModule } from '../tasks/tasks.module';
import { UsersModule } from '../users/users.module';
import { ProgressModule } from '../progress/progress.module';
import { StatisticsModule } from '../statistics/statistics.module';

@Module({
  imports: [
    AiModule,
    TasksModule,
    forwardRef(() => UsersModule),
    ProgressModule,
    StatisticsModule,
  ],
  providers: [GrammarService],
  exports: [GrammarService],
})
export class GrammarModule {}
