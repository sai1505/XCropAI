from fastapi import APIRouter, Depends, Request
from app.modules.auth.utils import verify_token, security

router = APIRouter()


@router.get("/me")
def get_current_user(
    request: Request,
    token=Depends(security),
    payload: dict = Depends(verify_token),
):
    return payload
