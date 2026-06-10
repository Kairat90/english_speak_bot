@echo off
cd /d "%~dp0"

if not exist venv (
  echo Creating Python venv...
  python -m venv venv
)

call venv\Scripts\activate.bat
pip install -r requirements.txt

echo Starting audio server on http://127.0.0.1:8001
REM CPU по умолчанию — стабильно на Windows без CUDA Toolkit 12
REM Для GPU: start-gpu.bat (нужен cublas64_12.dll)
set WHISPER_MODEL=small
set WHISPER_DEVICE=cpu
set WHISPER_COMPUTE_TYPE=int8
uvicorn main:app --host 127.0.0.1 --port 8001
