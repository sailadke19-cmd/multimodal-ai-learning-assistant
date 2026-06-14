from fastapi import APIRouter, Depends
from app.auth.jwt import get_admin_user
from app.database.connection import get_db

router = APIRouter()


@router.get("/stats")
async def stats(admin=Depends(get_admin_user), db=Depends(get_db)):
    pipe = [{"$group": {"_id": None, "avg": {"$avg": "$percentage"}}}]
    doc = await db.quiz_results.aggregate(pipe).to_list(1)
    return {
        "total_users": await db.users.count_documents({}),
        "total_materials": await db.study_materials.count_documents({}),
        "total_quizzes": await db.quiz_results.count_documents({}),
        "total_flashcard_sets": await db.flashcards.count_documents({}),
        "platform_avg_score": round(doc[0]["avg"], 1) if doc else 0,
    }


@router.get("/users")
async def list_users(admin=Depends(get_admin_user), db=Depends(get_db)):
    users = []
    async for u in db.users.find({}).limit(100):
        users.append({
            "id": str(u["_id"]), "full_name": u["full_name"], "email": u["email"],
            "streak": u.get("streak", 0), "total_score": u.get("total_score", 0),
            "is_admin": u.get("is_admin", False), "created_at": u["created_at"].isoformat(),
        })
    return users