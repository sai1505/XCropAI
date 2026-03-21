from fastapi import APIRouter, Depends, HTTPException
from . import services
from app.modules.auth.routes import get_current_user
from app.modules.users.services import verify_profile_service
from app.modules.users.schemas import UserProfileResponse

router = APIRouter(prefix="/users", tags=["User Actions"])


@router.get("/analytics/{chat_id}")
async def get_analytics(chat_id: str, user: dict = Depends(get_current_user)):
    return services.get_analytics_service(user["sub"], chat_id)


@router.get("/history")
async def get_history(user: dict = Depends(get_current_user)):
    # We can use the repository directly for simple list fetches
    from .repository import UserRepository

    return UserRepository().fetch_user_history(user["sub"]).data


@router.get("/history/{chat_id}")
async def get_chat_session(chat_id: str, user: dict = Depends(get_current_user)):
    # Simply call the service
    return services.get_chat_session_service(user["sub"], chat_id)


@router.delete("/history/{chat_id}")
async def delete_history(chat_id: str, user: dict = Depends(get_current_user)):
    from .repository import UserRepository

    UserRepository().delete_chat(user["sub"], chat_id)
    return {"status": "deleted"}


@router.get("/gallery")
async def get_image_gallery(user: dict = Depends(get_current_user)):
    return services.get_user_images_service(user["sub"])


@router.get("/profile")
async def get_profile(user: dict = Depends(get_current_user)):
    return services.sync_profile_service(user["sub"])


@router.patch("/profile")
async def update_profile(updates: dict, user: dict = Depends(get_current_user)):
    return services.sync_profile_service(user["sub"], updates)


@router.post("/verify-profile", response_model=UserProfileResponse)
def verify_profile(user: dict = Depends(get_current_user)):
    """
    Checks if a user profile exists in the DB.
    If not, creates it using JWT metadata.
    """
    return verify_profile_service(user)
