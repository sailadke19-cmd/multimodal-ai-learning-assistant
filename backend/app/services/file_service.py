import os
import uuid
import aiofiles
from pathlib import Path
from app.config import settings

UPLOAD_DIR = Path(settings.UPLOAD_DIR)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


async def save_upload(file) -> tuple[str, str]:
    ext = file.filename.rsplit(".", 1)[-1].lower()
    unique_name = f"{uuid.uuid4()}.{ext}"
    file_path = UPLOAD_DIR / unique_name
    async with aiofiles.open(file_path, "wb") as f:
        content = await file.read()
        await f.write(content)
    return str(file_path), unique_name


def extract_text_from_pdf(file_path: str) -> str:
    text = ""
    try:
        import pdfplumber
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        print(f"pdfplumber error: {e}")
    if not text.strip():
        try:
            import PyPDF2
            with open(file_path, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                for page in reader.pages:
                    text += page.extract_text() or ""
        except Exception as e:
            print(f"PyPDF2 error: {e}")
    return text.strip()


def transcribe_audio(file_path: str) -> str:
    try:
        import whisper
        model = whisper.load_model("base")
        result = model.transcribe(file_path)
        return result["text"]
    except Exception as e:
        print(f"Whisper error: {e}")
        return ""


def process_video(file_path: str) -> str:
    try:
        from moviepy.editor import VideoFileClip
        audio_path = file_path.rsplit(".", 1)[0] + "_audio.wav"
        clip = VideoFileClip(file_path)
        clip.audio.write_audiofile(audio_path, verbose=False, logger=None)
        clip.close()
        return transcribe_audio(audio_path)
    except Exception as e:
        print(f"Video processing error: {e}")
        return ""


def text_to_speech(text: str, lang: str = "en") -> str:
    try:
        from gtts import gTTS
        import tempfile
        lang_map = {"en": "en", "hi": "hi", "mr": "mr"}
        tts_lang = lang_map.get(lang, "en")
        tts = gTTS(text=text[:500], lang=tts_lang)
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
        tts.save(tmp.name)
        return tmp.name
    except Exception as e:
        print(f"TTS error: {e}")
        return ""