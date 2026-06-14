from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from bson import ObjectId
from app.auth.jwt import get_current_user
from app.database.connection import get_db
from app.services import ai_service
from app.models.schemas import QuizResultIn

router = APIRouter()


@router.get("/generate/{material_id}")
async def generate_quiz(material_id: str, n: int = 10, current_user=Depends(get_current_user), db=Depends(get_db)):
    doc = await db.study_materials.find_one({
        "_id": ObjectId(material_id), "user_id": str(current_user["_id"])
    })
    if not doc:
        raise HTTPException(404, "Material not found")
    questions = await ai_service.generate_mcqs(doc["original_text"], n=n, lang=doc.get("language", "en"))
    return {"material_id": material_id, "questions": questions, "total": len(questions)}


@router.post("/submit/{material_id}")
async def submit_quiz(material_id: str, body: QuizResultIn, current_user=Depends(get_current_user), db=Depends(get_db)):
    doc = await db.study_materials.find_one({"_id": ObjectId(material_id)})
    if not doc:
        raise HTTPException(404, "Material not found")
    total = len(body.answers)
    score = sum(1 for a in body.answers if a.get("is_correct"))
    pct = round(score / total * 100, 1) if total else 0
    result = {
        "user_id": str(current_user["_id"]),
        "material_id": material_id,
        "score": score, "total": total, "percentage": pct,
        "topic": ", ".join(doc.get("topics", ["General"])[:2]),
        "time_taken_seconds": body.time_taken_seconds,
        "timestamp": datetime.utcnow(),
    }
    res = await db.quiz_results.insert_one(result)
    await db.users.update_one({"_id": current_user["_id"]}, {"$inc": {"total_score": score}})
    return {"id": str(res.inserted_id), "score": score, "total": total, "percentage": pct,
            "message": "Great job!" if pct >= 70 else "Keep practicing!"}


@router.get("/history")
async def quiz_history(current_user=Depends(get_current_user), db=Depends(get_db)):
    results = []
    async for r in db.quiz_results.find({"user_id": str(current_user["_id"])}).sort("timestamp", -1).limit(20):
        results.append({
            "id": str(r["_id"]), "score": r["score"], "total": r["total"],
            "percentage": r["percentage"], "topic": r["topic"],
            "timestamp": r["timestamp"].isoformat(),
        })
    return results