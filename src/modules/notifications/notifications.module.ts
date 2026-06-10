import { Module, forwardRef } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AiModule } from '../ai/ai.module';
import { ProgressModule } from '../progress/progress.module';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [AiModule, ProgressModule, TasksModule],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
