from pydantic_settings import BaseSettings
from typing import Optional
from dotenv import load_dotenv
from pathlib import Path

# Load .env from project root (ai-prep-tutor/.env)
BASE_DIR = Path(__file__).resolve().parent.parent  # points to backend/
load_dotenv(BASE_DIR.parent / ".env")  # loads from project root

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
        env_file = ".env"
        case_sensitive = True

settings = Settings()
