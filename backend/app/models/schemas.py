from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List, Any
from datetime import datetime


class UserCreate(BaseModel):
    full_name: str = Field(..., min_length=2)
    email: EmailStr
    password: str = Field(..., min_length=6)
    language: str = "en"

    @validator("password")
    def password_max_length(cls, v):
        if len(v.encode("utf-8")) > 70:
            raise ValueError("Password too long, use less than 70 characters")
        return v[:70]


class UserLogin(BaseModel):
    email: EmailStr
    password: str

    @validator("password")
    def truncate_password(cls, v):
        return v[:70]


class UserOut(BaseModel):
    id: str
    full_name: str
    email: str
    language: str
    streak: int = 0
    total_score: int = 0
    created_at: datetime
    is_admin: bool = False


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    language: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class QuizResultIn(BaseModel):
    material_id: str
    answers: List[Any]
    time_taken_seconds: int = 0


class TutorMessage(BaseModel):
    role: str
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class TutorRequest(BaseModel):
    message: str
    material_id: Optional[str] = None
    history: Optional[List[TutorMessage]] = []
    language: str = "en"