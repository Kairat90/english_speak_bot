import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly botToken: string;
  private readonly audioServerUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.botToken = this.configService.get<string>('telegram.token', '');
    this.audioServerUrl = this.configService.get<string>('audio.serverUrl', 'http://127.0.0.1:8001');
  }

  async downloadTelegramFile(fileId: string, destinationPath: string): Promise<void> {
    const fileInfoRes = await fetch(
      `https://api.telegram.org/bot${this.botToken}/getFile?file_id=${fileId}`,
    );
    const fileInfo = await fileInfoRes.json();

    if (!fileInfo.ok) {
      throw new Error(`Telegram getFile failed: ${JSON.stringify(fileInfo)}`);
    }

    const filePath = fileInfo.result.file_path;
    const downloadUrl = `https://api.telegram.org/file/bot${this.botToken}/${filePath}`;

    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.mkdir(path.dirname(destinationPath), { recursive: true });
    await fs.writeFile(destinationPath, buffer);

    this.logger.debug(`Downloaded Telegram file to ${destinationPath}`);
  }

  async transcribeAudio(audioPath: string): Promise<string> {
    const fileBuffer = await fs.readFile(audioPath);
    const fileName = path.basename(audioPath);
    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer]), fileName);

    const response = await fetch(`${this.audioServerUrl}/transcribe`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      let detail = errText;
      try {
        const parsed = JSON.parse(errText) as { detail?: string };
        detail = parsed.detail ?? errText;
      } catch {
        // keep raw text
      }
      this.logger.error(`Whisper STT failed (${response.status}): ${detail}`);
      throw new Error(`Whisper STT: ${detail}`);
    }

    const result = (await response.json()) as { text: string };
    return (result.text ?? '').trim();
  }

  async generateAudioFromText(text: string, outputPath: string): Promise<string> {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    const voice = this.configService.get<string>('audio.ttsVoice', 'en-US-AriaNeural');
    const mp3Path = outputPath.replace(/\.[^.]+$/, '.mp3');

    const response = await fetch(`${this.audioServerUrl}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Edge TTS failed (${response.status}): ${errText}`);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(mp3Path, audioBuffer);

    this.logger.debug(`TTS audio saved to ${mp3Path}`);
    return mp3Path;
  }

  async checkAudioServerHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${this.audioServerUrl}/health`);
      return res.ok;
    } catch {
      return false;
    }
  }
}
