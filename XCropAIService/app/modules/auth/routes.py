from fastapi import APIRouter, Depends
from app.modules.auth.utils import verify_token

router = APIRouter()


@router.get("/me")
def get_current_user(payload: dict = Depends(verify_token)):
    return payload
