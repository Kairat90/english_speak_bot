export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',

  database: {
    url: process.env.DATABASE_URL,
  },

  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN,
    webhookUrl: process.env.TELEGRAM_WEBHOOK_URL,
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET,
  },

  ai: {
    baseUrl: process.env.AI_BASE_URL || 'https://api.deepseek.com',
    apiKey: process.env.AI_API_KEY || process.env.DEEPSEEK_API_KEY,
    model: process.env.AI_MODEL || 'deepseek-chat',
  },

  audio: {
    serverUrl: process.env.AUDIO_SERVER_URL || 'http://127.0.0.1:8001',
    ttsVoice: process.env.TTS_VOICE || 'en-US-AriaNeural',
    whisperModel: process.env.WHISPER_MODEL || 'small',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  voice: {
    tempDir: process.env.VOICE_TEMP_DIR || './tmp/voice',
    ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
  },

  thresholds: {
    speaking: parseInt(process.env.SPEAKING_PASS_THRESHOLD || '70', 10),
    grammar: parseInt(process.env.GRAMMAR_PASS_THRESHOLD || '70', 10),
    listening: parseInt(process.env.LISTENING_PASS_THRESHOLD || '70', 10),
    vocabulary: parseInt(process.env.VOCABULARY_PASS_THRESHOLD || '70', 10),
  },

  srs: {
    initialIntervalDays: parseInt(process.env.SRS_INITIAL_INTERVAL_DAYS || '1', 10),
    easyMultiplier: parseFloat(process.env.SRS_EASY_MULTIPLIER || '2.5'),
    hardMultiplier: parseFloat(process.env.SRS_HARD_MULTIPLIER || '0.5'),
  },

  notifications: {
    dailyReminderCron: process.env.DAILY_REMINDER_CRON || '0 9 * * *',
    timezone: process.env.TIMEZONE || 'Europe/Moscow',
  },
});
