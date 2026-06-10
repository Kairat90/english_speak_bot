# Запуск без Docker (Windows)

Docker **не обязателен**. Нужны только Node.js, PostgreSQL (локально или в облаке) и FFmpeg.

## Шаг 1 — Node.js

Скачайте и установите [Node.js 20 LTS](https://nodejs.org/).

Проверка в PowerShell:

```powershell
node -v
npm -v
```

## Шаг 2 — База данных (выберите один вариант)

### Вариант A — Облачная PostgreSQL (проще всего, ничего не ставить)

1. Зарегистрируйтесь на [Neon](https://neon.tech) или [Supabase](https://supabase.com)
2. Создайте проект → скопируйте **Connection string**
3. Вставьте в `.env`:

```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
```

### Вариант B — PostgreSQL на Windows

1. Скачайте [PostgreSQL для Windows](https://www.postgresql.org/download/windows/)
2. При установке задайте пароль пользователя `postgres`
3. Создайте базу через pgAdmin или командную строку:

```sql
CREATE DATABASE english_speak_bot;
```

4. В `.env`:

```env
DATABASE_URL=postgresql://postgres:ВАШ_ПАРОЛЬ@localhost:5432/english_speak_bot?schema=public
```

## Шаг 3 — FFmpeg (для голосовых сообщений)

```powershell
winget install Gyan.FFmpeg
```

Или скачайте с [ffmpeg.org](https://ffmpeg.org/download.html) и добавьте в PATH.

Проверка: `ffmpeg -version`

## Шаг 4 — Настройка проекта

```powershell
cd d:\cursor_projects\english_speak_bot

copy .env.example .env
# Отредактируйте .env: DATABASE_URL, TELEGRAM_BOT_TOKEN, GEMINI_API_KEY

npm install
npm run prisma:generate
npm run prisma:migrate:deploy
npm run db:seed
npm run start:dev
```

Бот запустится в режиме long polling — откройте Telegram и отправьте `/start`.

## Шаг 5 — Проверка

- Swagger: http://localhost:3000/docs
- API: http://localhost:3000/api/v1

## Частые ошибки

| Ошибка | Решение |
|--------|---------|
| `Can't reach database server` | Проверьте DATABASE_URL, запущен ли PostgreSQL |
| `P1001` Prisma connection | Для Neon добавьте `?sslmode=require` |
| `ffmpeg not found` | Установите FFmpeg и перезапустите терминал |
| `TELEGRAM_BOT_TOKEN` invalid | Получите новый токен у @BotFather |

## Что Docker делал в проекте

Docker использовался **только для PostgreSQL**. Само приложение всегда запускается через `npm run start:dev` — контейнер для app не обязателен.
