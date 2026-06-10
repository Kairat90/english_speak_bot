import { Module, forwardRef } from '@nestjs/common';
import { VocabularyService } from './vocabulary.service';
import { AiModule } from '../ai/ai.module';
import { TasksModule } from '../tasks/tasks.module';
import { UsersModule } from '../users/users.module';
import { ProgressModule } from '../progress/progress.module';
import { StatisticsModule } from '../statistics/statistics.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [
    AiModule,
    TasksModule,
    forwardRef(() => UsersModule),
    ProgressModule,
    StatisticsModule,
    FilesModule,
  ],
  providers: [VocabularyService],
  exports: [VocabularyService],
})
export class VocabularyModule {}
