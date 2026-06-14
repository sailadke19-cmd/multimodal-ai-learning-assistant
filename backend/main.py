from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from app.database.connection import connect_db, close_db
from app.routes import auth, materials, quiz, flashcards, progress, tutor, admin
from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    yield
    await close_db()


app = FastAPI(title="AI Learning Assistant", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth.router,       prefix="/api/auth",       tags=["Auth"])
app.include_router(materials.router,  prefix="/api/materials",  tags=["Materials"])
app.include_router(quiz.router,       prefix="/api/quiz",       tags=["Quiz"])
app.include_router(flashcards.router, prefix="/api/flashcards", tags=["Flashcards"])
app.include_router(progress.router,   prefix="/api/progress",   tags=["Progress"])
app.include_router(tutor.router,      prefix="/api/tutor",      tags=["Tutor"])
app.include_router(admin.router,      prefix="/api/admin",      tags=["Admin"])


@app.get("/api/health")
async def health():
    return {"status": "ok"}