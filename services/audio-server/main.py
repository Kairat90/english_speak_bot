"""
Audio microservice: STT (faster-whisper) + TTS (edge-tts).
Запуск: uvicorn main:app --host 127.0.0.1 --port 8001
"""

import logging
import os
import shutil
import tempfile
import traceback
from contextlib import asynccontextmanager
from pathlib import Path

import edge_tts
import uvicorn
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from faster_whisper import WhisperModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("audio-server")

WHISPER_MODEL = os.getenv("WHISPER_MODEL", "small")
WHISPER_DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
WHISPER_COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
TTS_VOICE = os.getenv("TTS_VOICE", "en-US-AriaNeural")

whisper_model: WhisperModel | None = None
whisper_device_used: str = ""


def is_cuda_runtime_error(exc: BaseException) -> bool:
    msg = str(exc).lower()
    return any(
        token in msg
        for token in ("cublas", "cudnn", "cuda", "cudart", "dll is not found", "cannot be loaded")
    )


def load_whisper_model(device: str, compute_type: str) -> WhisperModel:
    global whisper_device_used
    logger.info("Loading Whisper '%s' on %s (%s)...", WHISPER_MODEL, device, compute_type)
    model = WhisperModel(WHISPER_MODEL, device=device, compute_type=compute_type)
    whisper_device_used = f"{device}/{compute_type}"
    logger.info("Whisper loaded: %s", whisper_device_used)
    return model


def init_whisper_model() -> WhisperModel:
    """Загрузка с fallback: cuda → cpu."""
    attempts = [
        (WHISPER_DEVICE, WHISPER_COMPUTE_TYPE),
        ("cuda", "int8_float16"),
        ("cuda", "int8"),
        ("cpu", "int8"),
    ]

    seen: set[tuple[str, str]] = set()
    last_error: Exception | None = None

    for device, compute_type in attempts:
        key = (device, compute_type)
        if key in seen:
            continue
        seen.add(key)

        try:
            return load_whisper_model(device, compute_type)
        except Exception as exc:
            last_error = exc
            logger.warning("Whisper load failed (%s/%s): %s", device, compute_type, exc)

    raise RuntimeError(f"Could not load Whisper model: {last_error}")


def switch_to_cpu() -> None:
    """Переключение на CPU при ошибке CUDA во время распознавания."""
    global whisper_model
    logger.warning("CUDA недоступна (cublas/cudnn). Переключаю Whisper на CPU...")
    whisper_model = load_whisper_model("cpu", "int8")


def run_transcribe(model: WhisperModel, audio_path: str):
    return model.transcribe(
        audio_path,
        language="en",
        beam_size=5,
        vad_filter=True,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    global whisper_model

    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        logger.error("ffmpeg NOT FOUND in PATH!")
        logger.error("Install: winget install Gyan.FFmpeg")
    else:
        logger.info("ffmpeg found: %s", ffmpeg)

    whisper_model = init_whisper_model()

    if whisper_device_used.startswith("cuda"):
        logger.info(
            "Если при распознавании ошибка cublas64_12.dll — "
            "перезапустите с WHISPER_DEVICE=cpu или установите CUDA 12 (см. docs/SETUP_AI_STACK.md)"
        )

    yield


app = FastAPI(title="English Bot Audio Service", lifespan=lifespan)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    if isinstance(exc, HTTPException):
        raise exc
    logger.error("Unhandled error: %s\n%s", exc, traceback.format_exc())
    return JSONResponse(status_code=500, content={"detail": str(exc)})


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "whisper_model": WHISPER_MODEL,
        "whisper_device": whisper_device_used or WHISPER_DEVICE,
        "ffmpeg": shutil.which("ffmpeg"),
        "tts_voice": TTS_VOICE,
    }


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    global whisper_model

    if whisper_model is None:
        raise HTTPException(503, "Whisper model not loaded")

    if not shutil.which("ffmpeg"):
        raise HTTPException(500, "ffmpeg не найден в PATH. Установите: winget install Gyan.FFmpeg")

    suffix = Path(file.filename or "audio.wav").suffix or ".wav"
    content = await file.read()

    if not content:
        raise HTTPException(400, "Empty audio file received")

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        logger.info("Transcribing %s (%d bytes) on %s...", file.filename, len(content), whisper_device_used)

        try:
            segments, info = run_transcribe(whisper_model, tmp_path)
            text = " ".join(segment.text.strip() for segment in segments).strip()
        except RuntimeError as exc:
            if is_cuda_runtime_error(exc) and not whisper_device_used.startswith("cpu"):
                switch_to_cpu()
                segments, info = run_transcribe(whisper_model, tmp_path)
                text = " ".join(segment.text.strip() for segment in segments).strip()
            else:
                raise

        if not text:
            logger.warning("Empty transcript, detected language: %s", info.language)

        return {"text": text, "language": info.language or "en"}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Transcribe failed: %s\n%s", exc, traceback.format_exc())
        raise HTTPException(500, f"Whisper error: {exc}") from exc
    finally:
        if tmp_path:
            Path(tmp_path).unlink(missing_ok=True)


class TtsRequest(BaseModel):
    text: str
    voice: str | None = None


@app.post("/tts")
async def text_to_speech(req: TtsRequest):
    if not req.text.strip():
        raise HTTPException(400, "Text is empty")

    voice = req.voice or TTS_VOICE
    out = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
    out.close()

    try:
        communicate = edge_tts.Communicate(req.text, voice)
        await communicate.save(out.name)
        return FileResponse(out.name, media_type="audio/mpeg", filename="speech.mp3")
    except Exception as exc:
        Path(out.name).unlink(missing_ok=True)
        raise HTTPException(500, f"TTS failed: {exc}") from exc


if __name__ == "__main__":
    port = int(os.getenv("AUDIO_SERVER_PORT", "8001"))
    uvicorn.run("main:app", host="127.0.0.1", port=port, reload=False)
