from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from bson import ObjectId
from app.auth.jwt import get_current_user
from app.database.connection import get_db
from app.services import ai_service

router = APIRouter()


@router.get("/generate/{material_id}")
async def generate(material_id: str, n: int = 15, current_user=Depends(get_current_user), db=Depends(get_db)):
    doc = await db.study_materials.find_one({
        "_id": ObjectId(material_id), "user_id": str(current_user["_id"])
    })
    if not doc:
        raise HTTPException(404, "Material not found")
    cards = await ai_service.generate_flashcards(doc["original_text"], n=n, lang=doc.get("language", "en"))
    res = await db.flashcards.insert_one({
        "user_id": str(current_user["_id"]),
        "material_id": material_id,
        "cards": cards,
        "created_at": datetime.utcnow(),
    })
    return {"id": str(res.inserted_id), "cards": cards, "total": len(cards)}


@router.get("/")
async def list_sets(current_user=Depends(get_current_user), db=Depends(get_db)):
    sets = []
    async for s in db.flashcards.find({"user_id": str(current_user["_id"])}).sort("created_at", -1).limit(20):
        sets.append({"id": str(s["_id"]), "material_id": s["material_id"],
                     "total": len(s.get("cards", [])), "created_at": s["created_at"].isoformat()})
    return sets