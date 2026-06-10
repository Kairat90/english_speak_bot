@echo off
cd /d "%~dp0"

if not exist venv (
  echo Creating Python venv...
  python -m venv venv
)

call venv\Scripts\activate.bat
pip install -r requirements.txt
pip install nvidia-cublas-cu12 nvidia-cudnn-cu12

REM DLL для faster-whisper (cublas64_12.dll) — из pip-пакетов, не из CUDA Toolkit 13
for /d %%D in ("venv\Lib\site-packages\nvidia*") do (
  if exist "%%D\cublas\bin" set "PATH=%%D\cublas\bin;%PATH%"
  if exist "%%D\cudnn\bin" set "PATH=%%D\cudnn\bin;%PATH%"
)

REM Опционально: CUDA Toolkit (если установлен)
if exist "C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v13.3\bin" (
  set "PATH=C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v13.3\bin;%PATH%"
)
if exist "C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.6\bin" (
  set "PATH=C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.6\bin;%PATH%"
)

echo.
echo === GPU mode ===
echo WHISPER: small / cuda / int8_float16
echo Проверка cublas64_12.dll:
where cublas64_12.dll 2>nul || echo [WARN] cublas64_12.dll не в PATH — см. docs/SETUP_AI_STACK.md
echo.

set WHISPER_MODEL=small
set WHISPER_DEVICE=cuda
set WHISPER_COMPUTE_TYPE=int8_float16
uvicorn main:app --host 127.0.0.1 --port 8001
