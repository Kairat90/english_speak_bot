# English Speak Bot

Production-ready Telegram-бот для изучения английского языка с ИИ-преподавателем на базе NestJS, PostgreSQL, Prisma и Google Gemini.

## Возможности

- Онбординг с определением уровня по 6 навыкам (CEFR)
- Персональный учебный план (генерируется Gemini)
- Режимы: Vocabulary, Grammar, Speaking, Listening
- Проверка ответов через Gemini (строгий JSON)
- Голосовые сообщения: OGG → WAV → STT → анализ
- Система прогресса, статистики, достижений
- Интервальное повторение слов (SRS)
- Ежедневные задания и напоминания
- REST API + Swagger для внутренней интеграции

## Быстрый старт (без Docker)

> **Docker не нужен.** Подробная инструкция: [docs/SETUP_WITHOUT_DOCKER.md](docs/SETUP_WITHOUT_DOCKER.md)

### Требования

- Node.js 20+
- PostgreSQL — локально **или** бесплатно в [Neon](https://neon.tech) / [Supabase](https://supabase.com)
- FFmpeg (для голосовых сообщений)
- Telegram Bot Token ([@BotFather](https://t.me/BotFather))
- Google Gemini API Key ([Google AI Studio](https://aistudio.google.com/))

### Установка

```powershell
cd d:\cursor_projects\english_speak_bot

npm install
copy .env.example .env
# Заполнить: DATABASE_URL, TELEGRAM_BOT_TOKEN, GEMINI_API_KEY

npm run prisma:generate
npm run prisma:migrate:deploy
npm run db:seed
npm run start:dev
```

### Docker (опционально)

Если Docker установлен и нужен локальный PostgreSQL:

```bash
docker compose up postgres -d
```

- API: http://localhost:3000/api/v1
- Swagger: http://localhost:3000/docs

## Структура проекта

```
src/
├── modules/
│   ├── auth/           # JWT авторизация (внутренний API)
│   ├── users/          # Пользователи, онбординг, навыки
│   ├── telegram/       # Telegram bot handlers
│   ├── ai/             # Gemini: генерация, оценка, фидбек
│   ├── lessons/        # Уроки и учебные планы
│   ├── tasks/          # Задания и попытки
│   ├── vocabulary/     # Режим словаря + SRS
│   ├── grammar/        # Режим грамматики
│   ├── listening/      # Режим аудирования
│   ├── speaking/       # Режим говорения
│   ├── statistics/     # Статистика и достижения
│   ├── progress/       # Прогресс по навыкам
│   ├── voice/          # VoiceProcessingService
│   ├── files/          # Загрузка файлов, TTS, STT
│   └── notifications/  # Напоминания, daily challenges
├── common/             # Enums, interfaces, prompts, utils
├── config/             # Конфигурация
└── prisma/             # Prisma service
```

## Документация

- [План разработки](docs/DEVELOPMENT_PLAN.md)
- [UML диаграмма сущностей](docs/ENTITY_DIAGRAM.md)
- [Промпты Gemini](docs/PROMPTS.md)

## API

Внутренний REST API защищён JWT. Получить токен:

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"telegramId": "123456789"}'
```

## Переменные окружения

См. [.env.example](.env.example)
