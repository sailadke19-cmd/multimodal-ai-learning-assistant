import json
import re
from typing import List, Optional
from app.config import settings

_groq = None
_gemini = None


def _get_groq():
    global _groq
    if _groq is None and settings.GROQ_API_KEY:
        try:
            from groq import Groq
            _groq = Groq(api_key=settings.GROQ_API_KEY)
        except Exception:
            pass
    return _groq


def _get_gemini():
    global _gemini
    if _gemini is None and settings.GEMINI_API_KEY:
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            _gemini = genai.GenerativeModel("gemini-2.0-flash")
        except Exception:
            pass
    return _gemini


async def _call_ai(prompt: str) -> str:
    provider = settings.AI_PROVIDER

    if provider == "groq":
        client = _get_groq()
        if client:
            try:
                resp = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=2000,
                )
                return resp.choices[0].message.content
            except Exception as e:
                return _offline_response(prompt, str(e))

    model = _get_gemini()
    if model:
        try:
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            return _offline_response(prompt, str(e))

    return _offline_response(prompt, "No AI provider configured")


def _offline_response(prompt: str, error: str = "") -> str:
    if "summary" in prompt.lower():
        return f"AI not available ({error}). Add a valid API key in .env file."
    if "topics" in prompt.lower():
        return '["General Topic"]'
    if "question" in prompt.lower() or "mcq" in prompt.lower():
        return '[]'
    if "flashcard" in prompt.lower():
        return '[]'
    if "notes" in prompt.lower():
        return f'["AI not available: {error[:100]}", "Add valid API key in .env"]'
    return f"AI error: {error}"


def _parse_json(text: str):
    text = re.sub(r"```(?:json)?", "", text).strip().rstrip("```").strip()
    return json.loads(text)


LANGS = {"en": "English", "hi": "Hindi", "mr": "Marathi"}
SYS = "You are an expert educational AI assistant. Always produce clear, accurate, student-friendly content."


async def generate_summary(text: str, lang: str = "en") -> str:
    language = LANGS.get(lang, "English")
    return await _call_ai(
        f"{SYS}\n\nWrite a clear summary in {language} (3-5 paragraphs):\n\n{text[:6000]}"
    )


async def generate_notes(text: str, lang: str = "en") -> List[str]:
    language = LANGS.get(lang, "English")
    raw = await _call_ai(
        f"{SYS}\n\nExtract 10 key study notes in {language}. "
        f"Return ONLY a JSON array of strings, no markdown.\n\n{text[:6000]}"
    )
    try:
        return _parse_json(raw)
    except Exception:
        return [line.strip("- •").strip() for line in raw.split("\n") if line.strip()][:10]


async def generate_topics(text: str) -> List[str]:
    raw = await _call_ai(
        f"List 5 main topics from this text. Return ONLY a JSON array of short strings, no markdown.\n\n{text[:4000]}"
    )
    try:
        return _parse_json(raw)
    except Exception:
        return ["General Topic"]


async def generate_mcqs(text: str, n: int = 10, lang: str = "en") -> list:
    language = LANGS.get(lang, "English")
    raw = await _call_ai(f"""
{SYS}

Generate {n} multiple choice questions in {language}.
Return ONLY a valid JSON array, no markdown formatting. Each item:
{{
  "question": "question text",
  "type": "mcq",
  "options": [
    {{"label": "A", "text": "option", "is_correct": false}},
    {{"label": "B", "text": "option", "is_correct": true}},
    {{"label": "C", "text": "option", "is_correct": false}},
    {{"label": "D", "text": "option", "is_correct": false}}
  ],
  "correct_answer": "B",
  "explanation": "brief explanation"
}}

CONTENT:
{text[:5000]}
""")
    try:
        return _parse_json(raw)
    except Exception:
        return []


async def generate_flashcards(text: str, n: int = 15, lang: str = "en") -> list:
    language = LANGS.get(lang, "English")
    raw = await _call_ai(f"""
{SYS}

Create {n} flashcards in {language}.
Return ONLY a valid JSON array, no markdown formatting:
{{"question": "term", "answer": "explanation", "topic": "topic"}}

CONTENT:
{text[:5000]}
""")
    try:
        return _parse_json(raw)
    except Exception:
        return []


async def chat_with_tutor(
    message: str, history: list,
    context: Optional[str], lang: str = "en"
) -> str:
    language = LANGS.get(lang, "English")
    ctx = f"\n\nSTUDY MATERIAL:\n{context[:3000]}" if context else ""
    hist = ""
    for m in history[-6:]:
        role = "Student" if m["role"] == "user" else "Tutor"
        hist += f"{role}: {m['content']}\n"
    return await _call_ai(
        f"You are a friendly AI tutor. Respond in {language}.{ctx}\n\n{hist}\nStudent: {message}\nTutor:"
    )


async def generate_study_plan(topics: List[str], lang: str = "en") -> str:
    language = LANGS.get(lang, "English")
    return await _call_ai(
        f"{SYS}\n\nCreate a 7-day study plan in {language} for: {', '.join(topics)}."
    )