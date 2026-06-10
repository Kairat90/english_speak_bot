# Установка AI-стека: DeepSeek + faster-whisper + Edge TTS

## Архитектура

```
Telegram Bot (NestJS :3000)
    │
    ├── DeepSeek API ────── текст: задания, проверка, планы
    │
    └── Audio Server (:8001) ── Python FastAPI
            ├── faster-whisper ── STT (голос → текст)
            └── edge-tts ──────── TTS (текст → аудио)
```

---

## 1. DeepSeek API

1. Зарегистрируйтесь: https://platform.deepseek.com
2. Создайте API key
3. Пополните баланс (минимум ~$2)
4. В `.env`:

```env
AI_BASE_URL=https://api.deepseek.com
AI_API_KEY=sk-ваш_ключ
AI_MODEL=deepseek-chat
```

---

## 2. faster-whisper (STT)

### Требования

- **Python 3.10–3.12**
- **NVIDIA драйвер** (последний)
- **CUDA** — faster-whisper подтянет через CTranslate2 автоматически
- **RTX 3050 6GB** — модель `small` (~2 GB VRAM) ✅

### Установка (Windows)

```powershell
cd d:\cursor_projects\english_speak_bot\services\audio-server

# Создать виртуальное окружение
python -m venv venv
.\venv\Scripts\activate

# Установить зависимости
pip install -r requirements.txt
```

Первая установка скачает модель `small` (~500 MB) при первом запросе.

### Проверка GPU

```powershell
python -c "import torch; print('CUDA:', torch.cuda.is_available())"
```

Если `CUDA: False` — whisper будет на CPU (медленно). Обновите драйвер NVIDIA.

### Запуск audio-server

```powershell
# Вариант 1 — скрипт
.\start.bat

# Вариант 2 — вручную
.\venv\Scripts\activate
set WHISPER_MODEL=small
set WHISPER_DEVICE=cuda
set WHISPER_COMPUTE_TYPE=float16
uvicorn main:app --host 127.0.0.1 --port 8001
```

Проверка: http://127.0.0.1:8001/health

### Тест STT

```powershell
curl -X POST http://127.0.0.1:8001/transcribe -F "file=@test.wav"
```

---

## 3. Edge TTS

Устанавливается вместе с `requirements.txt` (`edge-tts`).

**Ключ не нужен** — бесплатный сервис Microsoft.

### Голоса для английского

| Голос | Описание |
|-------|----------|
| `en-US-AriaNeural` | женский, US (по умолчанию) |
| `en-US-GuyNeural` | мужской, US |
| `en-GB-SoniaNeural` | женский, British |
| `en-GB-RyanNeural` | мужской, British |

Сменить в `.env`:
```env
TTS_VOICE=en-GB-SoniaNeural
```

### Тест TTS

```powershell
curl -X POST http://127.0.0.1:8001/tts ^
  -H "Content-Type: application/json" ^
  -d "{\"text\": \"Hello, how are you?\"}" ^
  --output test.mp3
```

Или из Python:
```powershell
edge-tts --text "Hello world" --write-media hello.mp3 --voice en-US-AriaNeural
```

---

## 4. Запуск всего проекта

**Терминал 1 — Audio Server:**
```powershell
cd services\audio-server
.\start.bat
```

**Терминал 2 — Telegram Bot:**
```powershell
cd d:\cursor_projects\english_speak_bot
npm run start:dev
```

---

## Ошибка `cublas64_12.dll is not found`

Whisper загружается на GPU, но при распознавании падает — **нет библиотек CUDA 12**.

### Быстрое решение (рекомендуется)

Перезапустите audio-server на **CPU**:

```powershell
cd services\audio-server
.\start.bat
```

В `/health` должно быть: `"whisper_device": "cpu/int8"`.

Для голосовых 5–10 сек на CPU `small` — **10–30 секунд** распознавания. Это нормально.

### GPU-ускорение (RTX 3050)

**Важно:** faster-whisper ищет `cublas64_12.dll` (CUDA **12**), а не 13.
CUDA Toolkit 13.3 сам по себе может **не** дать эту DLL.
Надёжный способ — pip-пакеты `nvidia-cublas-cu12` (уже в `start-gpu.bat`).

#### Шаги после установки CUDA Toolkit 13.3

1. **Перезагрузите ПК** (чтобы PATH обновился)
2. Откройте **новый** PowerShell
3. Проверьте драйвер:
   ```powershell
   nvidia-smi
   ```
4. Запустите audio-server в GPU-режиме:
   ```powershell
   cd d:\cursor_projects\english_speak_bot\services\audio-server
   .\start-gpu.bat
   ```
5. В логе должно быть: `Whisper loaded: cuda/int8_float16`
6. Проверьте http://127.0.0.1:8001/health → `"whisper_device": "cuda/int8_float16"`
7. Отправьте голосовое в боте (Speaking) — должно быть **2–5 сек** вместо 10–30 на CPU

#### Если снова `cublas64_12.dll`

В активированном venv:
```powershell
pip install nvidia-cublas-cu12 nvidia-cudnn-cu12
where cublas64_12.dll
```

Если `where` ничего не нашёл — найдите вручную:
```
services\audio-server\venv\Lib\site-packages\nvidia\cublas\bin\cublas64_12.dll
```

Добавьте эту папку в PATH и перезапустите `start-gpu.bat`.

#### CUDA Toolkit 12 vs 13

| Компонент | Зачем |
|-----------|-------|
| **nvidia-cublas-cu12** (pip) | даёт `cublas64_12.dll` — **главное для Whisper** |
| CUDA Toolkit 13.3 | драйвер/runtime, полезен но не заменяет cu12 DLL |
| Драйвер NVIDIA | уже есть (nvidia-smi работает) |

---

## RTX 3050 6GB — что ожидать

| Модель whisper | VRAM | Скорость | Качество EN |
|----------------|------|----------|-------------|
| `base` | ~1 GB | очень быстро | среднее |
| **`small`** ✅ | ~2 GB | быстро | хорошее |
| `medium` | ~5 GB | медленно | отличное |

Рекомендация: **`small`** — оптимально для 3050.

Если не хватает VRAM (другие приложения заняли память):
```env
WHISPER_DEVICE=cpu
```
или в `start.bat`: `set WHISPER_COMPUTE_TYPE=int8`

---

## Плюсы и минусы

### Плюсы
- Нет квот Gemini 429/503
- DeepSeek дешевле (~$0.14/1M input tokens)
- STT локально — приватность, бесплатно
- Edge TTS бесплатно, качественные голоса
- 3050 6GB хватает для whisper `small`

### Минусы
- **2 процесса** — NestJS + Python audio-server
- Первый запрос STT медленный (загрузка модели ~10–30 сек)
- Edge TTS требует интернет (Microsoft)
- DeepSeek требует интернет + баланс
- При нескольких пользователях STT идёт в очередь (один GPU)

---

## Частые ошибки

| Ошибка | Решение |
|--------|---------|
| `Whisper STT failed: connect ECONNREFUSED` | Запустите audio-server |
| `CUDA out of memory` | Закройте игры, используйте `small` или `WHISPER_DEVICE=cpu` |
| `AI_API_KEY не задан` | Заполните DeepSeek ключ в `.env` |
| `Edge TTS failed` | Проверьте интернет |
| Аудио не отправляется в Telegram | Listening теперь отправляет `.mp3` как audio |
