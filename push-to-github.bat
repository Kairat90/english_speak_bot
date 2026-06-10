@echo off
cd /d "%~dp0"

if not exist .git git init

git remote remove origin 2>nul
git remote add origin https://github.com/Kairat90/english_speak_bot.git

git add -A

echo.
echo === Staged files ( .env must NOT be listed ) ===
git status --short
echo.

git diff --cached --name-only | findstr /i "\\.env$" >nul
if %errorlevel%==0 (
  echo ERROR: .env is staged! Aborting.
  git reset HEAD .env
  exit /b 1
)

git commit -m "Initial commit: English learning Telegram bot with NestJS, Prisma and Gemini"
git branch -M main
git push -u origin main

echo.
echo Done: https://github.com/Kairat90/english_speak_bot
