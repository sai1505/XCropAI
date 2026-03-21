from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.modules.users.routes import router as users_router


app = FastAPI(
    title="XCropAI",
    version="1.0.0",
    description="Crop Diseaese Detection API",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or "*” for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users_router, prefix="/api/users")
