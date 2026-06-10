import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { AiModule } from './modules/ai/ai.module';
import { LessonsModule } from './modules/lessons/lessons.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { VocabularyModule } from './modules/vocabulary/vocabulary.module';
import { GrammarModule } from './modules/grammar/grammar.module';
import { ListeningModule } from './modules/listening/listening.module';
import { SpeakingModule } from './modules/speaking/speaking.module';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { ProgressModule } from './modules/progress/progress.module';
import { VoiceModule } from './modules/voice/voice.module';
import { FilesModule } from './modules/files/files.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      // .env — приоритет; .env.example — fallback, если .env ещё не создан
      envFilePath: ['.env', '.env.example'],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    TelegramModule,
    AiModule,
    LessonsModule,
    TasksModule,
    VocabularyModule,
    GrammarModule,
    ListeningModule,
    SpeakingModule,
    StatisticsModule,
    ProgressModule,
    VoiceModule,
    FilesModule,
    NotificationsModule,
  ],
})
export class AppModule {}
