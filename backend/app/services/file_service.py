import os
import uuid
import tempfile
from pathlib import Path
from fastapi import UploadFile
from app.config import settings


async def save_upload(file: UploadFile):
    ext = Path(file.filename).suffix.lower()
    name = f"{uuid.uuid4()}{ext}"
    dest = os.path.join(settings.UPLOAD_DIR, name)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    content = await file.read()
    with open(dest, "wb") as f:
        f.write(content)
    return dest, ext.lstrip(".")


def extract_text_from_pdf(path: str) -> str:
    text = ""
    try:
        import pdfplumber
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    text += t + "\n"
        if text.strip():
            return text.strip()
    except:
        pass
    try:
        import PyPDF2
        with open(path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                t = page.extract_text()
                if t:
                    text += t + "\n"
    except:
        pass
    return text.strip() or "Could not extract text from PDF."


def transcribe_audio(path: str) -> str:
    try:
        import whisper
        model = whisper.load_model("base")
        result = model.transcribe(path)
        return result.get("text", "")
    except:
        return "Whisper not installed. Run: pip install openai-whisper"


def process_video(video_path: str) -> str:
    try:
        from moviepy.editor import VideoFileClip
        tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        tmp.close()
        clip = VideoFileClip(video_path)
        clip.audio.write_audiofile(tmp.name, logger=None)
        clip.close()
        text = transcribe_audio(tmp.name)
        os.unlink(tmp.name)
        return text
    except:
        return "Could not process video. Install MoviePy and FFmpeg."


def text_to_speech(text: str, lang: str = "en") -> str:
    try:
        from gtts import gTTS
        tts = gTTS(text=text[:500], lang=lang)
        out = os.path.join(settings.UPLOAD_DIR, f"tts_{uuid.uuid4()}.mp3")
        tts.save(out)
        return out
    except:
        return ""


def export_notes_to_pdf(notes: list, title: str) -> bytes:
    try:
        from fpdf import FPDF
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Arial", "B", 16)
        pdf.cell(0, 10, title[:60], ln=True)
        pdf.set_font("Arial", size=12)
        for i, note in enumerate(notes, 1):
            pdf.multi_cell(0, 8, f"{i}. {note}")
            pdf.ln(2)
        return pdf.output(dest="S").encode("latin-1")
    except:
        return b""