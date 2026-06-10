import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly botToken: string;
  private readonly geminiClient: GoogleGenAI;

  constructor(private readonly configService: ConfigService) {
    this.botToken = this.configService.get<string>('telegram.token', '');
    this.geminiClient = new GoogleGenAI({
      apiKey: this.configService.get<string>('gemini.apiKey'),
    });
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
    const audioData = await fs.readFile(audioPath);
    const base64Audio = audioData.toString('base64');
    const mimeType = audioPath.endsWith('.wav') ? 'audio/wav' : 'audio/ogg';

    const model = this.configService.get<string>('gemini.model', 'gemini-2.5-flash-lite');

    const response = await this.geminiClient.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [
            { text: 'Transcribe this English speech to text. Return only the transcription, nothing else.' },
            { inlineData: { mimeType, data: base64Audio } },
          ],
        },
      ],
    });

    return (response.text ?? '').trim();
  }

  async generateAudioFromText(text: string, outputPath: string): Promise<string> {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    const model = this.configService.get<string>('gemini.ttsModel', 'gemini-2.5-flash-lite');

    const response = await this.geminiClient.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: `Read aloud in clear English: ${text}` }] }],
    });

    const audioPart = response.candidates?.[0]?.content?.parts?.find(
      (part) => 'inlineData' in part && part.inlineData?.mimeType?.startsWith('audio/'),
    );

    if (audioPart && 'inlineData' in audioPart && audioPart.inlineData?.data) {
      const audioBuffer = Buffer.from(audioPart.inlineData.data, 'base64');
      await fs.writeFile(outputPath, audioBuffer);
      return outputPath;
    }

    this.logger.warn('Gemini TTS audio not available, saving text placeholder');
    await fs.writeFile(outputPath.replace(/\.[^.]+$/, '.txt'), text);
    return outputPath;
  }
}
