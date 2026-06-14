from fastapi import APIRouter, Depends
from datetime import datetime, timedelta
from app.auth.jwt import get_current_user
from app.database.connection import get_db

router = APIRouter()


@router.get("/dashboard")
async def dashboard(current_user=Depends(get_current_user), db=Depends(get_db)):
    uid = str(current_user["_id"])
    total_uploads = await db.study_materials.count_documents({"user_id": uid})
    total_quizzes = await db.quiz_results.count_documents({"user_id": uid})
    total_flashcard_sets = await db.flashcards.count_documents({"user_id": uid})
    pipe = [{"$match": {"user_id": uid}}, {"$group": {"_id": None, "avg": {"$avg": "$percentage"}}}]
    avg_doc = await db.quiz_results.aggregate(pipe).to_list(1)
    avg_score = round(avg_doc[0]["avg"], 1) if avg_doc else 0
    since = datetime.utcnow() - timedelta(days=7)
    recent = []
    async for m in db.study_materials.find({"user_id": uid, "upload_date": {"$gte": since}}).sort("upload_date", -1).limit(5):
        recent.append({
            "id": str(m["_id"]), "file_name": m["file_name"],
            "file_type": m["file_type"], "topics": m.get("topics", []),
            "upload_date": m["upload_date"].isoformat(),
        })
    weekly = []
    for i in range(6, -1, -1):
        day = datetime.utcnow().date() - timedelta(days=i)
        start = datetime(day.year, day.month, day.day)
        end = start + timedelta(days=1)
        uploads = await db.study_materials.count_documents({"user_id": uid, "upload_date": {"$gte": start, "$lt": end}})
        quizzes = await db.quiz_results.count_documents({"user_id": uid, "timestamp": {"$gte": start, "$lt": end}})
        sc = await db.quiz_results.aggregate([
            {"$match": {"user_id": uid, "timestamp": {"$gte": start, "$lt": end}}},
            {"$group": {"_id": None, "avg": {"$avg": "$percentage"}}}
        ]).to_list(1)
        weekly.append({"date": day.strftime("%a"), "uploads": uploads, "quizzes": quizzes,
                       "score": round(sc[0]["avg"], 1) if sc else 0})
    return {
        "total_uploads": total_uploads, "total_quizzes": total_quizzes,
        "total_flashcard_sets": total_flashcard_sets, "average_score": avg_score,
        "streak": current_user.get("streak", 0), "recent_uploads": recent, "weekly_activity": weekly,
    }


@router.get("/study-plan")
async def study_plan(current_user=Depends(get_current_user), db=Depends(get_db)):
    from app.services.ai_service import generate_study_plan
    uid = str(current_user["_id"])
    topics = set()
    async for m in db.study_materials.find({"user_id": uid}).sort("upload_date", -1).limit(10):
        for t in m.get("topics", []):
            topics.add(t)
    topic_list = list(topics)[:8] or ["General Studies"]
    plan = await generate_study_plan(topic_list, current_user.get("language", "en"))
    return {"plan": plan, "topics": topic_list}