from dotenv import load_dotenv
from pathlib import Path

# Load .env from backend directory before any other imports
BASE_DIR = Path(__file__).resolve().parent.parent  # points to backend/
load_dotenv(BASE_DIR / ".env")  # loads from backend directory

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, protected, files, ai_processing, deletion, folders
from app.config import settings

app = FastAPI(
    title="AI Exam-Prep Tutor API",
    description="Backend API for AI-powered exam preparation tool",
    version="1.0.0"
)

# Add CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["authentication"])
app.include_router(protected.router, prefix="/protected", tags=["protected"])
app.include_router(files.router, prefix="/files", tags=["files"])
app.include_router(ai_processing.router, prefix="/ai", tags=["ai-processing"])
app.include_router(deletion.router, prefix="/delete", tags=["deletion"])
app.include_router(folders.router, prefix="/folders", tags=["folders"])

@app.get("/")
async def root():
    return {"message": "AI Exam-Prep Tutor API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.FASTAPI_HOST,
        port=settings.FASTAPI_PORT,
        reload=True
    )
