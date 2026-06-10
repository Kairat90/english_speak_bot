-- CreateEnum
CREATE TYPE "SkillType" AS ENUM ('SPEAKING', 'LISTENING', 'VOCABULARY', 'GRAMMAR', 'READING', 'WRITING');
CREATE TYPE "CEFRLevel" AS ENUM ('BEGINNER', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2');
CREATE TYPE "TaskType" AS ENUM ('VOCABULARY_LEARN', 'VOCABULARY_TEST', 'VOCABULARY_TRANSLATE', 'VOCABULARY_SENTENCE', 'VOCABULARY_CUSTOM_SENTENCE', 'GRAMMAR_EXERCISE', 'SPEAKING_TOPIC', 'LISTENING_TRANSCRIBE', 'LISTENING_RETELL', 'LISTENING_QUESTIONS', 'READING_COMPREHENSION', 'WRITING_ESSAY', 'DAILY_CHALLENGE');
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'SKIPPED');
CREATE TYPE "LessonStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "OnboardingStep" AS ENUM ('NAME', 'GOAL', 'DAILY_TIME', 'SPEAKING_LEVEL', 'LISTENING_LEVEL', 'VOCABULARY_LEVEL', 'GRAMMAR_LEVEL', 'READING_LEVEL', 'WRITING_LEVEL', 'COMPLETED');
CREATE TYPE "VoiceSubmissionStatus" AS ENUM ('PENDING', 'DOWNLOADED', 'CONVERTED', 'TRANSCRIBED', 'ANALYZED', 'FAILED');
CREATE TYPE "AchievementType" AS ENUM ('FIRST_LESSON', 'STREAK_7', 'STREAK_30', 'VOCABULARY_100', 'SPEAKING_MASTER', 'GRAMMAR_GURU', 'PERFECT_SCORE', 'LEVEL_UP');
CREATE TYPE "DailyChallengeStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "telegram_id" BIGINT NOT NULL,
    "username" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "display_name" TEXT,
    "language_code" TEXT NOT NULL DEFAULT 'ru',
    "learning_goal" TEXT,
    "daily_minutes" INTEGER NOT NULL DEFAULT 15,
    "onboarding_step" "OnboardingStep" NOT NULL DEFAULT 'NAME',
    "is_onboarded" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "current_state" TEXT,
    "state_data" JSONB,
    "rating" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_skills" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "skill" "SkillType" NOT NULL,
    "level" "CEFRLevel" NOT NULL DEFAULT 'BEGINNER',
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_skills_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "learning_plans" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "focus_areas" JSONB NOT NULL,
    "weekly_goals" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lessons" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "learning_plan_id" TEXT,
    "skill" "SkillType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "LessonStatus" NOT NULL DEFAULT 'PLANNED',
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "lesson_id" TEXT,
    "type" "TaskType" NOT NULL,
    "skill" "SkillType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "level" "CEFRLevel" NOT NULL,
    "pass_score" INTEGER NOT NULL DEFAULT 70,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "task_attempts" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "attempt_num" INTEGER NOT NULL,
    "user_answer" TEXT,
    "answer_type" TEXT NOT NULL DEFAULT 'text',
    "score" INTEGER,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "errors" JSONB,
    "feedback" JSONB,
    "duration_sec" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_attempts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vocabulary_words" (
    "id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "transcription" TEXT,
    "translation" TEXT NOT NULL,
    "example" TEXT,
    "audio_url" TEXT,
    "level" "CEFRLevel" NOT NULL DEFAULT 'A1',
    "part_of_speech" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vocabulary_words_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vocabulary_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "word_id" TEXT NOT NULL,
    "familiarity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "correct_count" INTEGER NOT NULL DEFAULT 0,
    "wrong_count" INTEGER NOT NULL DEFAULT 0,
    "next_review_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "interval_days" INTEGER NOT NULL DEFAULT 1,
    "ease_factor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "last_reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vocabulary_progress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "grammar_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "level" "CEFRLevel" NOT NULL,
    "tasks_total" INTEGER NOT NULL DEFAULT 0,
    "tasks_passed" INTEGER NOT NULL DEFAULT 0,
    "average_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "weak_points" JSONB NOT NULL DEFAULT '[]',
    "last_practiced" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grammar_progress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "listening_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "level" "CEFRLevel" NOT NULL,
    "tasks_total" INTEGER NOT NULL DEFAULT 0,
    "tasks_passed" INTEGER NOT NULL DEFAULT 0,
    "average_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "weak_points" JSONB NOT NULL DEFAULT '[]',
    "last_practiced" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listening_progress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "speaking_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "level" "CEFRLevel" NOT NULL,
    "tasks_total" INTEGER NOT NULL DEFAULT 0,
    "tasks_passed" INTEGER NOT NULL DEFAULT 0,
    "average_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fluency_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "weak_points" JSONB NOT NULL DEFAULT '[]',
    "last_practiced" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "speaking_progress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "type" "AchievementType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT,
    "threshold" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_achievements" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "achievement_id" TEXT NOT NULL,
    "earned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "daily_challenges" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "DailyChallengeStatus" NOT NULL DEFAULT 'PENDING',
    "score" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_challenges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_statistics" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tasks_completed" INTEGER NOT NULL DEFAULT 0,
    "tasks_failed" INTEGER NOT NULL DEFAULT 0,
    "average_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "longest_streak" INTEGER NOT NULL DEFAULT 0,
    "total_study_minutes" INTEGER NOT NULL DEFAULT 0,
    "last_study_date" TIMESTAMP(3),
    "error_history" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_statistics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "voice_submissions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "telegram_file_id" TEXT NOT NULL,
    "original_path" TEXT,
    "converted_path" TEXT,
    "transcript" TEXT,
    "duration_sec" INTEGER,
    "status" "VoiceSubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "analysis_result" JSONB,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_submissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_feedbacks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "task_id" TEXT,
    "prompt_type" TEXT NOT NULL,
    "request" JSONB NOT NULL,
    "response" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "tokens_used" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_telegram_id_key" ON "users"("telegram_id");
CREATE UNIQUE INDEX "user_skills_user_id_skill_key" ON "user_skills"("user_id", "skill");
CREATE UNIQUE INDEX "vocabulary_words_word_translation_key" ON "vocabulary_words"("word", "translation");
CREATE UNIQUE INDEX "vocabulary_progress_user_id_word_id_key" ON "vocabulary_progress"("user_id", "word_id");
CREATE UNIQUE INDEX "grammar_progress_user_id_topic_key" ON "grammar_progress"("user_id", "topic");
CREATE UNIQUE INDEX "listening_progress_user_id_level_key" ON "listening_progress"("user_id", "level");
CREATE UNIQUE INDEX "speaking_progress_user_id_level_key" ON "speaking_progress"("user_id", "level");
CREATE UNIQUE INDEX "achievements_type_key" ON "achievements"("type");
CREATE UNIQUE INDEX "user_achievements_user_id_achievement_id_key" ON "user_achievements"("user_id", "achievement_id");
CREATE UNIQUE INDEX "daily_challenges_task_id_key" ON "daily_challenges"("task_id");
CREATE UNIQUE INDEX "daily_challenges_user_id_date_key" ON "daily_challenges"("user_id", "date");
CREATE UNIQUE INDEX "user_statistics_user_id_key" ON "user_statistics"("user_id");

-- AddForeignKey
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "learning_plans" ADD CONSTRAINT "learning_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_learning_plan_id_fkey" FOREIGN KEY ("learning_plan_id") REFERENCES "learning_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "task_attempts" ADD CONSTRAINT "task_attempts_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "task_attempts" ADD CONSTRAINT "task_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vocabulary_progress" ADD CONSTRAINT "vocabulary_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vocabulary_progress" ADD CONSTRAINT "vocabulary_progress_word_id_fkey" FOREIGN KEY ("word_id") REFERENCES "vocabulary_words"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "grammar_progress" ADD CONSTRAINT "grammar_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "listening_progress" ADD CONSTRAINT "listening_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "speaking_progress" ADD CONSTRAINT "speaking_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "daily_challenges" ADD CONSTRAINT "daily_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "daily_challenges" ADD CONSTRAINT "daily_challenges_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_statistics" ADD CONSTRAINT "user_statistics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "voice_submissions" ADD CONSTRAINT "voice_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_feedbacks" ADD CONSTRAINT "ai_feedbacks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_feedbacks" ADD CONSTRAINT "ai_feedbacks_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
