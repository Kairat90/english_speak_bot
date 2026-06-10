import { Module, forwardRef } from '@nestjs/common';
import { ListeningService } from './listening.service';
import { AiModule } from '../ai/ai.module';
import { TasksModule } from '../tasks/tasks.module';
import { UsersModule } from '../users/users.module';
import { FilesModule } from '../files/files.module';
import { ProgressModule } from '../progress/progress.module';
import { StatisticsModule } from '../statistics/statistics.module';

@Module({
  imports: [
    AiModule,
    TasksModule,
    forwardRef(() => UsersModule),
    FilesModule,
    ProgressModule,
    StatisticsModule,
  ],
  providers: [ListeningService],
  exports: [ListeningService],
})
export class ListeningModule {}
