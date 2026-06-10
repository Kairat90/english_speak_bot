import { Injectable } from '@nestjs/common';
import { Context } from 'telegraf';
import * as fs from 'fs';
import { UsersService } from '../../users/users.service';
import { VocabularyService } from '../../vocabulary/vocabulary.service';
import { GrammarService } from '../../grammar/grammar.service';
import { SpeakingService } from '../../speaking/speaking.service';
import { ListeningService } from '../../listening/listening.service';
import { VoiceProcessingService } from '../../voice/voice-processing.service';
import { mainMenuKeyboard, listeningModeKeyboard } from '../keyboards/main.keyboard';

@Injectable()
export class LearningHandler {
  constructor(
    private readonly usersService: UsersService,
    private readonly vocabularyService: VocabularyService,
    private readonly grammarService: GrammarService,
    private readonly speakingService: SpeakingService,
    private readonly listeningService: ListeningService,
    private readonly voiceProcessing: VoiceProcessingService,
  ) {}

  async handleLearningMode(ctx: Context, userId: string, text: string): Promise<boolean> {
    const modes: Record<string, () => Promise<void>> = {
      '📚 Vocabulary': async () => {
        const { message } = await this.vocabularyService.startSession(userId);
        await ctx.reply(message);
      },
      '✏️ Grammar': async () => {
        const message = await this.grammarService.startExercise(userId);
        await ctx.reply(message);
      },
      '🎤 Speaking': async () => {
        const message = await this.speakingService.startTopic(userId);
        await ctx.reply(message);
      },
      '👂 Listening': async () => {
        await ctx.reply('Выберите тип listening-задания:', listeningModeKeyboard());
        await this.usersService.setState(userId, 'LISTENING_SELECT', {});
      },
      '🔙 Главное меню': async () => {
        await this.usersService.setState(userId, 'IDLE', {});
        await ctx.reply('Главное меню:', mainMenuKeyboard());
      },
    };

    const handler = modes[text];
    if (!handler) return false;

    await handler();
    return true;
  }

  async handleListeningMode(ctx: Context, userId: string, text: string): Promise<boolean> {
    const modeMap: Record<string, 'transcribe' | 'retell' | 'questions'> = {
      '📝 Написать услышанное': 'transcribe',
      '🎙 Пересказать голосом': 'retell',
      '❓ Ответить на вопросы': 'questions',
    };

    const mode = modeMap[text];
    if (!mode) return false;

    const { message, audioPath } = await this.listeningService.startExercise(userId, mode);

    if (fs.existsSync(audioPath)) {
      if (audioPath.endsWith('.mp3')) {
        await ctx.replyWithAudio({ source: audioPath });
      } else {
        await ctx.replyWithVoice({ source: audioPath });
      }
    }

    await ctx.reply(message);
    return true;
  }

  async handleTextAnswer(ctx: Context, userId: string, text: string): Promise<boolean> {
    const user = await this.usersService.findById(userId);
    const state = user.currentState;

    if (text === '🔙 Главное меню') {
      await this.usersService.setState(userId, 'IDLE', {});
      await ctx.reply('Главное меню:', mainMenuKeyboard());
      return true;
    }

    if (text.toLowerCase() === 'далее' && state === 'VOCABULARY_LEARN') {
      const message = await this.vocabularyService.advanceLearning(userId);
      await ctx.reply(message);
      return true;
    }

    switch (state) {
      case 'VOCABULARY_TEST':
      case 'VOCABULARY_LEARN': {
        const message = await this.vocabularyService.handleAnswer(userId, text);
        await ctx.reply(message);
        return true;
      }

      case 'GRAMMAR_EXERCISE': {
        const message = await this.grammarService.checkAnswer(userId, text);
        await ctx.reply(message, mainMenuKeyboard());
        return true;
      }

      case 'LISTENING_EXERCISE': {
        const message = await this.listeningService.checkTextAnswer(userId, text);
        await ctx.reply(message, mainMenuKeyboard());
        return true;
      }

      default:
        return false;
    }
  }

  async handleVoice(ctx: Context, userId: string, fileId: string): Promise<void> {
    const user = await this.usersService.findById(userId);
    const state = user.currentState;

    if (state === 'SPEAKING_TOPIC') {
      const message = await this.speakingService.processVoiceAnswer(userId, fileId);
      await ctx.reply(message, mainMenuKeyboard());
      return;
    }

    if (state === 'LISTENING_EXERCISE') {
      const submissionId = await this.voiceProcessing.downloadVoice(fileId, userId);
      await this.voiceProcessing.convertVoice(submissionId);
      const transcript = await this.voiceProcessing.speechToText(submissionId);
      const message = await this.listeningService.checkVoiceAnswer(userId, transcript);
      await this.voiceProcessing.cleanup(submissionId);
      await ctx.reply(`🗣 Распознано: "${transcript}"\n\n${message}`, mainMenuKeyboard());
      return;
    }

    await ctx.reply('Сейчас голосовое сообщение не ожидается. Выберите режим Speaking или Listening.');
  }
}
