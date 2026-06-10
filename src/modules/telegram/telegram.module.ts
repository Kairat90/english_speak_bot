import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { TelegramUpdate } from './telegram.update';
import { OnboardingHandler } from './handlers/onboarding.handler';
import { MenuHandler } from './handlers/menu.handler';
import { LearningHandler } from './handlers/learning.handler';
import { UsersModule } from '../users/users.module';
import { VocabularyModule } from '../vocabulary/vocabulary.module';
import { GrammarModule } from '../grammar/grammar.module';
import { SpeakingModule } from '../speaking/speaking.module';
import { ListeningModule } from '../listening/listening.module';
import { ProgressModule } from '../progress/progress.module';
import { StatisticsModule } from '../statistics/statistics.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { VoiceModule } from '../voice/voice.module';
import { NotificationsService } from '../notifications/notifications.service';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';

@Module({
  imports: [
    TelegrafModule.forRootAsync({
      useFactory: () => {
        const token = process.env.TELEGRAM_BOT_TOKEN?.trim() ?? '';

        if (!token || token.includes('your_telegram')) {
          throw new Error(
            'TELEGRAM_BOT_TOKEN не задан. Заполните TELEGRAM_BOT_TOKEN в файле .env',
          );
        }

        return {
          token,
          launchOptions: { dropPendingUpdates: true },
        };
      },
    }),
    UsersModule,
    VocabularyModule,
    GrammarModule,
    SpeakingModule,
    ListeningModule,
    ProgressModule,
    StatisticsModule,
    NotificationsModule,
    VoiceModule,
  ],
  providers: [TelegramUpdate, OnboardingHandler, MenuHandler, LearningHandler],
})
export class TelegramModule implements OnModuleInit {
  private readonly logger = new Logger(TelegramModule.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    @InjectBot() private readonly bot: Telegraf,
  ) {}

  async onModuleInit() {
    const me = await this.bot.telegram.getMe();
    this.logger.log(`Telegram bot @${me.username} подключён (polling)`);

    this.notificationsService.setMessageSender(async (telegramId, text) => {
      await this.bot.telegram.sendMessage(telegramId, text);
    });
  }
}
