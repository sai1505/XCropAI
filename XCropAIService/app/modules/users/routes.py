from fastapi import APIRouter, Depends
from app.modules.auth.routes import get_current_user
from app.modules.users.services import verify_profile_service

router = APIRouter()


@router.post("/verify-profile")
def verify_profile(user=Depends(get_current_user)):
    return verify_profile_service(user)
