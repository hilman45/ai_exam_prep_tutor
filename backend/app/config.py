from pydantic_settings import BaseSettings
from typing import Optional
from pathlib import Path

class Settings(BaseSettings):
    # Supabase configuration
    SUPABASE_URL: str = "https://your-project.supabase.co"
    SUPABASE_SERVICE_KEY: str = "your-service-role-key"
    SUPABASE_ANON_KEY: Optional[str] = "your-anon-key"
    
    # FastAPI configuration
    FASTAPI_HOST: str = "127.0.0.1"
    FASTAPI_PORT: int = 8000
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    
    class Config:
        env_file = Path(__file__).resolve().parent.parent.parent / ".env"  # project root
        env_file_encoding = "utf-8"
        case_sensitive = True

settings = Settings()
