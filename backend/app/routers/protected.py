from fastapi import APIRouter, Depends
from app.deps import get_current_user, User

router = APIRouter()

@router.get("/ping")
async def protected_ping(current_user: User = Depends(get_current_user)):
    """
    Protected endpoint that requires authentication.
    Returns a simple ping response with user information.
    """
    return {
        "msg": "pong",
        "user": {
            "id": current_user.id,
            "email": current_user.email
        }
    }
