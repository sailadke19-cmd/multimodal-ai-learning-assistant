from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from bson import ObjectId
from app.auth.jwt import get_current_user
from app.database.connection import get_db
from app.services import ai_service, file_service
from app.models.schemas import TutorRequest

router = APIRouter()


@router.post("/chat")
async def chat(body: TutorRequest, current_user=Depends(get_current_user), db=Depends(get_db)):
    context = None
    if body.material_id:
        doc = await db.study_materials.find_one({"_id": ObjectId(body.material_id)})
        if doc:
            context = doc.get("original_text", "")
    history = [m.dict() for m in (body.history or [])]
    response = await ai_service.chat_with_tutor(body.message, history, context, lang=body.language)
    return {"response": response}


@router.post("/tts")
async def tts(text: str, lang: str = "en", current_user=Depends(get_current_user)):
    path = file_service.text_to_speech(text, lang)
    if not path:
        raise HTTPException(503, "TTS not available")
    return FileResponse(path, media_type="audio/mpeg")