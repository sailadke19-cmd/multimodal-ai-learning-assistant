from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from bson import ObjectId

from app.models.schemas import UserCreate, UserLogin, Token, UserOut, UserUpdate
from app.auth.jwt import hash_password, verify_password, create_access_token, get_current_user
from app.database.connection import get_db

router = APIRouter()


def _user_out(u):
    return UserOut(
        id=str(u["_id"]),
        full_name=u["full_name"],
        email=u["email"],
        language=u.get("language", "en"),
        streak=u.get("streak", 0),
        total_score=u.get("total_score", 0),
        created_at=u.get("created_at", datetime.utcnow()),
        is_admin=u.get("is_admin", False),
    )


@router.post("/register", status_code=201)
async def register(body: UserCreate, db=Depends(get_db)):
    try:
        existing = await db.users.find_one({"email": body.email})
        if existing:
            raise HTTPException(400, "Email already registered")
        doc = {
            "full_name": body.full_name,
            "email": body.email,
            "password_hash": hash_password(body.password),
            "language": body.language,
            "streak": 0,
            "total_score": 0,
            "is_admin": False,
            "created_at": datetime.utcnow(),
            "last_active": datetime.utcnow(),
        }
        res = await db.users.insert_one(doc)
        doc["_id"] = res.inserted_id
        token = create_access_token({"sub": str(res.inserted_id)})
        user = _user_out(doc)
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": user.dict()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Registration error: {str(e)}")


@router.post("/login")
async def login(body: UserLogin, db=Depends(get_db)):
    try:
        user = await db.users.find_one({"email": body.email})
        if not user or not verify_password(body.password, user["password_hash"]):
            raise HTTPException(401, "Wrong email or password")
        today = datetime.utcnow().date()
        last = user.get("last_active")
        streak = user.get("streak", 0)
        if last:
            delta = (today - last.date()).days
            streak = streak + 1 if delta == 1 else (streak if delta == 0 else 1)
        else:
            streak = 1
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"last_active": datetime.utcnow(), "streak": streak}},
        )
        user["streak"] = streak
        token = create_access_token({"sub": str(user["_id"])})
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": _user_out(user).dict()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Login error: {str(e)}")


@router.get("/me")
async def me(current_user=Depends(get_current_user)):
    return _user_out(current_user).dict()


@router.patch("/me")
async def update_me(body: UserUpdate, current_user=Depends(get_current_user), db=Depends(get_db)):
    updates = {k: v for k, v in body.dict().items() if v is not None}
    if updates:
        await db.users.update_one({"_id": current_user["_id"]}, {"$set": updates})
    user = await db.users.find_one({"_id": current_user["_id"]})
    return _user_out(user).dict()


@router.post("/forgot-password")
async def forgot_password(email: str, db=Depends(get_db)):
    return {"message": "If that email exists, a reset link has been sent."}