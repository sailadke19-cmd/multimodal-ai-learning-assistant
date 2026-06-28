import json
import re
import logging
import asyncio
from typing import List, Optional
from app.config import settings

# ============================
# AI Configuration
# ============================
DEFAULT_MODEL = "llama-3.3-70b-versatile"
MAX_TEXT_LENGTH = 10000
MAX_OUTPUT_TOKENS = 4096

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_groq = None
_gemini = None


def _get_groq():
    try:
        from groq import Groq
        key = os.environ.get("GROQ_API_KEY") or settings.GROQ_API_KEY
        print(f"GROQ KEY : {key[:15]}")
        if not key:
            print("NO KEY FOUND!")
            return None
        client = Groq(api_key=key)
        print(f"CLIENT CREATED: {client}")
        return client 
    except Exception as e:
        print(f"GROQ ERROR: {e}")
        return None


def _get_gemini():
    global _gemini
    if _gemini is None and settings.GEMINI_API_KEY:
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            _gemini = genai.GenerativeModel("gemini-2.0-flash")
        except Exception as e:
            logger.exception(f"Gemini Error: {e}")
    return _gemini


async def _call_ai(prompt: str) -> str:
    provider = (settings.AI_PROVIDER or "").lower()
    print(f"DEBUG PROVIDER: {provider}")
    print(f" DEBUG KEY: {settings.GROQ_API_KEY[:15]}")

    if provider == "groq":
        client = _get_groq()
        print (f"DEBUG CLIENT:{client}")
        if client:
            try:
                resp = await asyncio.to_thread(
                     client.chat.completions.create,
                     model=DEFAULT_MODEL,
                     messages=[{"role": "user", "content": prompt}],
                    max_tokens=MAX_OUTPUT_TOKENS,
                    temperature=0.4,
                ) 

                return resp.choices[0].message.content

            except Exception as e:
                print(f"GROQ CALL ERROR: {e}")
                logger.exception(f"Groq Error: {e}")
                return f"AI not available ({str(e)}). Add a valid API key in .env file."
    model = _get_gemini()
    if model:
        try:
            response = await asyncio.to_thread(model.generate_content, prompt)
            return response.text
        except Exception as e:
            logger.exception(f"Gemini Error: {e}")

    return _offline_response(
    prompt,
    f"Error code: 401 - Invalid API Key"
)


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
    return (
    "AI service is currently unavailable.\n\n"
    f"Reason: {error or 'Unknown Error'}\n\n"
    "Please check your API key or internet connection."
)


def _parse_json(text: str):
    text = re.sub(r"```(?:json)?", "", text)
    text = text.replace("```", "")
    text = text.strip()

    try:
        return json.loads(text)

    except json.JSONDecodeError:

        start = text.find("[")

        end = text.rfind("]")

        if start != -1 and end != -1:
            try:
                return json.loads(text[start:end+1])
            except json.JSONDecodeError:
                return []
            
        return[]
    

def _parse_json_object(text: str):
    """
    Like _parse_json, but for responses expected to be a JSON object ({...})
    rather than an array ([...]). Kept separate from _parse_json so existing
    callers of _parse_json (which assume array output) are unaffected.
    Returns None on failure instead of [] so callers can distinguish
    "nothing parsed" from "AI legitimately returned an empty list".
    """
    cleaned = re.sub(r"```(?:json)?", "", text)
    cleaned = cleaned.replace("```", "").strip()

    try:
        parsed = json.loads(cleaned)
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1:
            try:
                parsed = json.loads(cleaned[start:end + 1])
                return parsed if isinstance(parsed, dict) else None
            except json.JSONDecodeError:
                return None
        return None


LANGS = {
    "en": "English",
    "hi": "Hindi",
    "mr": "Marathi"
    }
SYS = """
You are an expert educational AI assistant.

Always produce:

• Accurate information

• Clear explanations

• Student-friendly language

• Proper Markdown formatting

• Well-organized headings

• Bullet points whenever possible

• Examples whenever helpful

Never generate invalid JSON.
"""

async def generate_summary(
    text: str,
    lang: str = "en",
    summary_type: str = "bullet"
) -> str:

    language = LANGS.get(lang, "English")

    if summary_type == "paragraph":

        prompt = f"""
{SYS}

Write a professional summary in {language}.

Write only 3-5 paragraphs.

CONTENT:

{text[:MAX_TEXT_LENGTH]}
"""

    elif summary_type == "bullet":

        prompt = f"""
{SYS}

Convert the study material into structured study notes.

Return the output in Markdown format.

# Chapter Title

## Definition
- Point

## Key Concepts
- Point

## Important Points
- Point

## Advantages
- Point

## Disadvantages
- Point

## Applications
- Point

## Key Takeaways
- Point

CONTENT:

{text[:MAX_TEXT_LENGTH]}
"""

    elif summary_type == "exam":

        prompt = f"""
{SYS}

Create Exam Notes.

Include:

# Definition

# Important Points

# Formula

# Examples

# Applications

# Expected Exam Questions

CONTENT:

{text[:MAX_TEXT_LENGTH]}
"""

    else:

        prompt = f"""
{SYS}

Create Quick Revision Notes.

Include only:

- Definitions

- Keywords

- Formula

- Important Points

- 5 Key Takeaways

CONTENT:

{text[:MAX_TEXT_LENGTH]}
"""

    return await _call_ai(prompt)


NOTES_FIELDS = [
    "chapter_title",
    "definition",
    "key_concepts",
    "important_points",
    "workflow",
    "advantages",
    "disadvantages",
    "applications",
    "formula",
    "example",
    "key_takeaways",
]

# Which fields each summary_type should populate. Modes omit fields that
# don't make sense for them (e.g. "revision" skips workflow/advantages).
NOTES_MODE_FIELDS = {
    "paragraph": NOTES_FIELDS,
    "bullet": NOTES_FIELDS,
    "exam": [
        "chapter_title", "definition", "important_points",
        "formula", "example", "applications", "key_takeaways",
    ],
    "revision": [
        "chapter_title", "definition", "formula",
        "important_points", "key_takeaways",
    ],
}


async def generate_structured_notes(
    text: str,
    lang: str = "en",
    summary_type: str = "bullet",
) -> dict:
    """
    Returns Smart Study Notes as structured JSON (Feature 1), shaped
    differently depending on summary_type (Feature 2's four modes:
    paragraph / bullet / exam / revision).

    This is additive: generate_summary() above is untouched, so any
    existing caller of generate_summary keeps working exactly as before.
    Callers that want structured fields (for PDFs, mind maps, cheat
    sheets, etc.) should call this function instead.

    On failure, returns {"error": "<message>"} instead of raising, so
    callers can check for the "error" key the same way other functions
    in this file return [] on failure.
    """
    language = LANGS.get(lang, "English")
    fields = NOTES_MODE_FIELDS.get(summary_type, NOTES_FIELDS)

    schema_lines = []
    for f in fields:
        if f in ("definition", "example", "chapter_title"):
            schema_lines.append(f'  "{f}": "string"')
        else:
            schema_lines.append(f'  "{f}": ["string", "..."]')
    schema = "{\n" + ",\n".join(schema_lines) + "\n}"

    prompt = f"""
{SYS}

Convert the study material below into Smart Study Notes, in {language}.

Return ONLY a single valid JSON object, no markdown fences, no commentary.
Use exactly these keys (omit none, omit no others):

{schema}

Rules:
- String fields are plain text (1-3 sentences).
- Array fields are short, individual points as separate array items (not one long string).
- If a field genuinely doesn't apply to this content, return an empty string or empty array for it, but keep the key.

CONTENT:

{text[:MAX_TEXT_LENGTH]}
"""

    raw = await _call_ai(prompt)
    parsed = _parse_json_object(raw)

    if parsed is None:
        return {"error": "Could not parse AI response into structured notes."}

    # Ensure every expected key is present even if the model dropped one,
    # so frontend code can rely on key presence without extra None-checks.
    result = {}
    for f in fields:
        if f in parsed:
            result[f] = parsed[f]
        else:
            result[f] = "" if f in ("definition", "example", "chapter_title") else []
    return result


async def generate_notes(text: str, lang: str = "en") -> List[str]:
    language = LANGS.get(lang, "English")
    raw = await _call_ai(
        f"{SYS}\n\nExtract 10 key study notes in {language}. "
        f"Return ONLY a JSON array of strings, no markdown.\n\n{text[:MAX_TEXT_LENGTH]}"
    )
    try:
        return _parse_json(raw)
    except Exception:
        return [line.strip("- •").strip() for line in raw.split("\n") if line.strip()][:10]


async def generate_topics(text: str) -> List[str]:
    raw = await _call_ai(
        f"List 5 main topics from this text. Return ONLY a JSON array of short strings, no markdown.\n\n{text[:MAX_TEXT_LENGTH]}"
    )
    try:
        return _parse_json(raw)
    except Exception:
        return ["General Topic"]


async def generate_mcqs(
    text: str,
    n: int = 10,
    lang: str = "en",
    difficulty: str = "Mixed"
) -> list:
    language = LANGS.get(lang, "English")
    raw = await _call_ai(f"""
{SYS}

Generate {n} multiple choice questions in {language}.

Difficulty: {difficulty}

Return ONLY a valid JSON array, no markdown. Each item:
{{
    "question": "",
    "type": "mcq",
    "difficulty": "Easy",
    "bloom_level": "Understand",
    "options": [
        {{"label": "a", "text": "option a", "is_correct": false}},
        {{"label": "b", "text": "option b", "is_correct": true}},
        {{"label": "c", "text": "option c", "is_correct": false}},
        {{"label": "d", "text": "option d", "is_correct": false}}
    ],
    "correct_answer": "A",
    "explanation": "..."
}}

CONTENT:
{text[:MAX_TEXT_LENGTH]}
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
{text[:MAX_TEXT_LENGTH]}
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
    ctx = f"\n\nSTUDY MATERIAL:\n{context[:MAX_TEXT_LENGTH//2]}" if context else ""
    hist = ""
    for m in history[-6:]:
        role = "Student" if m["role"] == "user" else "Tutor"
        hist += f"{role}: {m['content']}\n"
    return await _call_ai(
        f"""You are an expert AI tutor.
Rules:
- Answer simply.
- Give examples.
- If student asks programming questions, provide code.
- If mathematical question, show step-by-step solution.
- Respond in Markdown.
- If answer is unknown, say "I don't know."
Respond in {language}.{ctx}

{hist}
Student: {message}
Tutor:"""
    )


async def generate_study_plan(topics: List[str], lang: str = "en") -> str:
    language = LANGS.get(lang, "English")
    return await _call_ai(
        f"{SYS}\n\nCreate a 7-day study plan in {language} for: {', '.join(topics)}."
    )
