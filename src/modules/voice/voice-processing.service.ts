import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { FilesService } from '../files/files.service';
import { AiEvaluationService } from '../ai/services/ai-evaluation.service';
import { AiSpeakingAnalysis } from '../../common/interfaces/ai-response.interface';
import * as ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class VoiceProcessingService {
  private readonly logger = new Logger(VoiceProcessingService.name);
  private readonly tempDir: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
    private readonly aiEvaluation: AiEvaluationService,
  ) {
    this.tempDir = this.configService.get<string>('voice.tempDir', './tmp/voice');
    const ffmpegPath = this.configService.get<string>('voice.ffmpegPath');
    if (ffmpegPath) {
      ffmpeg.setFfmpegPath(ffmpegPath);
    }
  }

  async downloadVoice(telegramFileId: string, userId: string): Promise<string> {
    await this.ensureTempDir();

    const submission = await this.prisma.voiceSubmission.create({
      data: {
        userId,
        telegramFileId,
        status: 'PENDING',
      },
    });

    const filePath = path.join(this.tempDir, `${submission.id}.ogg`);
    await this.filesService.downloadTelegramFile(telegramFileId, filePath);

    await this.prisma.voiceSubmission.update({
      where: { id: submission.id },
      data: { originalPath: filePath, status: 'DOWNLOADED' },
    });

    return submission.id;
  }

  async convertVoice(submissionId: string): Promise<string> {
    const submission = await this.prisma.voiceSubmission.findUniqueOrThrow({
      where: { id: submissionId },
    });

    if (!submission.originalPath) {
      throw new Error('Original voice file not found');
    }

    const wavPath = submission.originalPath.replace('.ogg', '.wav');

    await new Promise<void>((resolve, reject) => {
      ffmpeg(submission.originalPath!)
        .toFormat('wav')
        .audioChannels(1)
        .audioFrequency(16000)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .save(wavPath);
    });

    await this.prisma.voiceSubmission.update({
      where: { id: submissionId },
      data: { convertedPath: wavPath, status: 'CONVERTED' },
    });

    return wavPath;
  }

  async speechToText(submissionId: string): Promise<string> {
    const submission = await this.prisma.voiceSubmission.findUniqueOrThrow({
      where: { id: submissionId },
    });

    const audioPath = submission.convertedPath ?? submission.originalPath;
    if (!audioPath) {
      throw new Error('No audio file available for transcription');
    }

    const transcript = await this.filesService.transcribeAudio(audioPath);

    await this.prisma.voiceSubmission.update({
      where: { id: submissionId },
      data: { transcript, status: 'TRANSCRIBED' },
    });

    return transcript;
  }

  async analyzeSpeech(
    submissionId: string,
    topic: string,
    level: string,
  ): Promise<AiSpeakingAnalysis> {
    const submission = await this.prisma.voiceSubmission.findUniqueOrThrow({
      where: { id: submissionId },
    });

    if (!submission.transcript) {
      throw new Error('Transcript not available');
    }

    const analysis = await this.aiEvaluation.analyzeSpeaking(
      topic,
      submission.transcript,
      level,
    );

    await this.prisma.voiceSubmission.update({
      where: { id: submissionId },
      data: { analysisResult: analysis as never, status: 'ANALYZED' },
    });

    return analysis;
  }

  async processVoiceMessage(
    telegramFileId: string,
    userId: string,
    topic: string,
    level: string,
  ): Promise<{ submissionId: string; transcript: string; analysis: AiSpeakingAnalysis }> {
    const submissionId = await this.downloadVoice(telegramFileId, userId);

    try {
      await this.convertVoice(submissionId);
      const transcript = await this.speechToText(submissionId);
      const analysis = await this.analyzeSpeech(submissionId, topic, level);

      return { submissionId, transcript, analysis };
    } catch (error) {
      await this.prisma.voiceSubmission.update({
        where: { id: submissionId },
        data: { status: 'FAILED', errorMessage: (error as Error).message },
      });
      throw error;
    }
  }

  async cleanup(submissionId: string): Promise<void> {
    const submission = await this.prisma.voiceSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) return;

    for (const filePath of [submission.originalPath, submission.convertedPath]) {
      if (filePath) {
        try {
          await fs.unlink(filePath);
        } catch {
          this.logger.warn(`Could not delete temp file: ${filePath}`);
        }
      }
    }
  }

  private async ensureTempDir(): Promise<void> {
    await fs.mkdir(this.tempDir, { recursive: true });
  }
}
