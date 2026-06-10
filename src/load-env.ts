import { config as loadDotenv } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Загружает .env до инициализации NestJS и Telegraf.
 * Сначала .env.example, затем .env перезаписывает значения.
 */
function loadEnv(): void {
  const root = process.cwd();
  const examplePath = resolve(root, '.env.example');
  const envPath = resolve(root, '.env');

  if (existsSync(examplePath)) {
    loadDotenv({ path: examplePath });
  }

  if (existsSync(envPath)) {
    loadDotenv({ path: envPath, override: true });
  }
}

loadEnv();
