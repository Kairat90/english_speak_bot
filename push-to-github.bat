@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo === English Speak Bot — push to GitHub ===
echo.

if not exist .git (
  echo [ERROR] Git repo not found. Run: git init
  pause
  exit /b 1
)

git remote get-url origin >nul 2>&1
if errorlevel 1 (
  git remote add origin https://github.com/Kairat90/english_speak_bot.git
)

git add -A

REM Не коммитим секреты и мусор
git reset HEAD .env 2>nul
git reset HEAD "Текстовый документ.txt" 2>nul

echo.
echo === Staged files (.env must NOT appear) ===
git status --short
echo.

git diff --cached --name-only | findstr /i /r "\\.env$ \\.env\." >nul
if %errorlevel%==0 (
  echo [ERROR] .env is staged! Aborting.
  pause
  exit /b 1
)

git diff --cached --quiet
if %errorlevel%==0 (
  echo No changes to commit. Pushing existing commits...
  goto push
)

git commit -m "Migrate AI stack to DeepSeek and local audio-server" -m "Replace Gemini with OpenAI-compatible DeepSeek provider. Add Python audio-server (faster-whisper STT + Edge TTS) with CPU/GPU launch scripts, env loading fix, and updated setup docs."

:push
git branch -M main
git push -u origin main

if errorlevel 1 (
  echo.
  echo [ERROR] Push failed. Check GitHub auth ^(git credential manager / PAT^).
  pause
  exit /b 1
)

echo.
echo Done: https://github.com/Kairat90/english_speak_bot
pause
