# План разработки по этапам

## Этап 1 — Инфраструктура (1–2 недели) ✅ Scaffold

- [x] NestJS проект, Docker Compose, PostgreSQL
- [x] Prisma schema, миграции, seed
- [x] Конфигурация, Swagger, JWT auth
- [x] Базовая модульная архитектура

**Результат:** проект запускается, БД создана, API доступен.

---

## Этап 2 — Пользователи и онбординг (1 неделя)

- [x] Модель User, UserSkill, UserStatistics
- [x] Telegram /start, FSM онбординг
- [x] Сохранение анкеты, генерация LearningPlan через Gemini
- [ ] E2E тесты онбординга
- [ ] Валидация ответов на уровни CEFR

**Результат:** новый пользователь проходит анкету и получает план.

---

## Этап 3 — AI-интеграция (1–2 недели)

- [x] AiModule: TaskGenerator, Evaluation, Feedback
- [x] JSON-парсинг ответов Gemini
- [x] Сохранение AiFeedback в БД
- [ ] Retry-логика при невалидном JSON
- [ ] Rate limiting и кэширование промптов
- [ ] Мониторинг токенов и стоимости

**Результат:** стабильная работа с Gemini API.

---

## Этап 4 — Vocabulary + Grammar (1–2 недели)

- [x] Генерация слов, тесты, проверка ответов
- [x] SRS (интервальное повторение)
- [x] Grammar-задания с порогом прохождения
- [ ] Аудио произношения для каждого слова
- [ ] Пагинация и лимиты слов в сессии

**Результат:** полноценные режимы Vocabulary и Grammar.

---

## Этап 5 — Speaking + Voice (2 недели)

- [x] VoiceProcessingService: download → convert → STT → analyze
- [x] Speaking-задания с оценкой 0–100
- [ ] Fallback STT (Google Cloud Speech / Whisper)
- [ ] Ограничение длительности голосовых
- [ ] Метрики fluency в реальном времени

**Результат:** ключевая функция Speaking работает end-to-end.

---

## Этап 6 — Listening (1–2 недели)

- [x] Генерация текста + TTS
- [x] 3 режима: transcribe, retell, questions
- [ ] Кэширование аудио
- [ ] Разные акценты (US/UK)
- [ ] Адаптивная скорость речи по уровню

**Результат:** режим Listening с аудио в Telegram.

---

## Этап 7 — Прогресс и геймификация (1 неделя)

- [x] UserStatistics, streak, rating
- [x] Achievements, level-up логика
- [x] Daily challenges, напоминания (cron)
- [ ] Лидерборд
- [ ] Push-уведомления по timezone пользователя

**Результат:** мотивация и удержание пользователей.

---

## Этап 8 — Production (1–2 недели)

- [ ] Webhook вместо polling для Telegram
- [ ] Health checks, graceful shutdown
- [ ] Логирование (Winston/Pino), Sentry
- [ ] CI/CD (GitHub Actions)
- [ ] Нагрузочное тестирование
- [ ] Backup PostgreSQL

**Результат:** деплой в production.

---

## Этап 9 — Масштабирование (ongoing)

- [ ] Redis для FSM и кэша
- [ ] Очереди (BullMQ) для voice/AI задач
- [ ] Reading и Writing режимы
- [ ] Admin panel
- [ ] A/B тестирование промптов

---

## Приоритеты MVP

1. Онбординг + главное меню
2. Vocabulary + Grammar (текст)
3. Speaking (голос)
4. Listening (аудио)
5. Статистика + daily challenge

## Команда (рекомендация)

| Роль | Задачи |
|------|--------|
| Backend | NestJS, Prisma, API |
| AI/ML | Промпты, оценка, STT/TTS |
| DevOps | Docker, CI/CD, мониторинг |
| QA | E2E тесты Telegram flow |
