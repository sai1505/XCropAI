from pydantic import BaseModel, EmailStr
from typing import Optional

class UserProfileBase(BaseModel):
    id: str
    email: EmailStr
    display_name: str
    role: Optional[str] = "Farmer"
    gender: Optional[str] = None
    cover_image: Optional[str] = None

class UserProfileResponse(BaseModel):
    status: str
    profile: Optional[UserProfileBase] = None