from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "AI Learning Assistant"
    SECRET_KEY: str = "mysecretkey12345678901234567890ab"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "ai_learning_assistant"
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    AI_PROVIDER: str = "groq"
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE_MB: int = 100
    ALLOWED_ORIGINS: list = ["http://localhost:5173", "http://localhost:5174"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()