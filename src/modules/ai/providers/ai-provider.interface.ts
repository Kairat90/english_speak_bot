export interface AiProvider {
  generateJson<T>(prompt: string, userId?: string): Promise<{ data: T; raw: string }>;
  generateText(prompt: string): Promise<string>;
}
