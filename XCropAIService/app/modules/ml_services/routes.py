import cv2
import os
import shutil
import numpy as np
import time
from datetime import datetime
from fastapi import APIRouter, Form, UploadFile, File, HTTPException, Depends
from app.modules.auth.utils import verify_token, security

# ML Services
from app.modules.ml_services.services.stress import encode_image, detect_stress
from app.modules.ml_services.services.thermal import rgb_to_pseudo_thermal
from app.modules.ml_services.services.stats import generate_plant_stats
from app.modules.ml_services.services.llm import (
    ask_groq_followup,
    ask_groq_for_analysis,
    ask_groq_for_prevention,
)
from app.core.config import OUTPUT_DIR
from app.core.merge import merged_labels
from app.core.simple_rules import detect_disease_production
from app.core.plant_mapper import detect_plant_from_labels

# Security & DB
from app.modules.auth.utils import verify_token
from app.modules.users.repository import UserRepository
from app.modules.ml_services.schemas import AnalysisResponse, ChatPayload

router = APIRouter(prefix="/analyze", tags=["Plant Analysis"])
repo = UserRepository()


@router.post("", response_model=AnalysisResponse)
@router.post("", response_model=AnalysisResponse)
async def analyze_plant(
    name: str = Form(...),
    image: UploadFile = File(...),
    user: dict = Depends(verify_token),
    token: str = Depends(security),
):
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid image file")

    user_id = user["sub"]
    user_email = user.get("email")
    ts = int(time.time())
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # 1. Save Original Image
    temp_orig = os.path.join(OUTPUT_DIR, f"{ts}_orig.png")
    with open(temp_orig, "wb") as f:
        shutil.copyfileobj(image.file, f)

    try:
        # 2. AI Logic (Thermal & Stress)
        gray, thermal = rgb_to_pseudo_thermal(temp_orig)
        stress_result = detect_stress(gray, thermal)

        thermal_gray = cv2.cvtColor(thermal, cv2.COLOR_BGR2GRAY)

        raw_mask = (thermal_gray > np.mean(thermal_gray)).astype(np.uint8) * 255

        disease_mask = cv2.resize(
            raw_mask, (gray.shape[1], gray.shape[0]), interpolation=cv2.INTER_NEAREST
        )

        enhanced_np = stress_result["images_raw"]["enhanced"]
        thermal_np = stress_result["images_raw"]["thermal"]

        # Save Enhanced & Thermal as temp files for direct upload
        temp_enh = os.path.join(OUTPUT_DIR, f"{ts}_enh.png")
        temp_therm = os.path.join(OUTPUT_DIR, f"{ts}_therm.png")

        # Assuming detect_stress returns raw numpy arrays for saving
        cv2.imwrite(temp_enh, enhanced_np)
        cv2.imwrite(temp_therm, thermal_np)

        # 3. Stats, LLM & Disease Logic
        stats = generate_plant_stats(
            gray=gray,
            disease_mask=disease_mask,
            stress_percentage=stress_result["stress_percentage"],
        )

        prevention = ask_groq_for_prevention(name, stats)
        llm_analysis = ask_groq_for_analysis(name, stats)

        disease = "Unknown"
        labels = merged_labels(temp_orig)
        plant = detect_plant_from_labels(labels)
        if plant:
            disease, _, _ = detect_disease_production(labels, temp_orig, plant)

        # 4. ☁️ DIRECT CLOUD UPLOAD (Paths stored in DB)
        paths = {
            "original": repo.upload_file(user_id, ts, "orig", temp_orig),
            "enhanced": repo.upload_file(user_id, ts, "enh", temp_enh),
            "thermal": repo.upload_file(user_id, ts, "therm", temp_therm),
        }

        # 5. Save record to DB
        chat_id = repo.save_analysis(
            user_id,
            {
                "name": name,
                "email": user_email,
                "disease_name": disease,
                "image_paths": paths,
                "stats": stats,
                "llm_analysis": llm_analysis,
                "prevention": prevention,
            },
        )

        # 6. Return response with SIGNED URLs for immediate display
        return {
            "chat_id": chat_id,
            "name": name,
            "disease_name": disease,
            "stats": stats,
            "images": {
                "original": repo.get_signed_url(paths["original"]),
                "enhanced": repo.get_signed_url(paths["enhanced"]),
                "thermal": repo.get_signed_url(paths["thermal"]),
            },
            "llm_analysis": llm_analysis,
            "prevention": prevention,
            "meta": {"generated_at": datetime.utcnow().isoformat()},
        }

    finally:
        # Cleanup ALL temp files from the local server
        for p in [temp_orig, temp_enh, temp_therm]:
            if os.path.exists(p):
                os.remove(p)


@router.post("/chat")
async def follow_up_chat(
    payload: ChatPayload,
    user: dict = Depends(verify_token),
    token: str = Depends(security),
):
    ai_response = ask_groq_followup(
        payload.name, payload.stats, payload.previous_response, payload.question
    )

    # Optional: Update the DB with the new message if chatId is provided
    return ai_response
