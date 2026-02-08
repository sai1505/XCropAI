import cv2
from fastapi import APIRouter, Form, UploadFile, File, HTTPException, Depends
import os
import shutil
import numpy as np
from datetime import datetime
from services.stress import encode_image
from services.thermal import rgb_to_pseudo_thermal
from services.stress import detect_stress
from services.stats import generate_plant_stats
from services.llm import (
    ask_groq_followup,
    ask_groq_for_analysis,
    ask_groq_for_prevention,
)
from core.config import OUTPUT_DIR
from core.merge import merged_labels
from core.simple_rules import detect_disease_production
from core.plant_mapper import detect_plant_from_labels
import json

router = APIRouter(prefix="/analyze", tags=["Plant Analysis"])

with open("data/andhra_crops_diseases.json") as f:
    CROP_DB = json.load(f)


@router.post("")
async def analyze_plant(name: str = Form(...), image: UploadFile = File(...)):
    # --------------------------------------------------
    # Validate image
    # --------------------------------------------------
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid image file")

    # --------------------------------------------------
    # Save image
    # --------------------------------------------------
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    image_path = os.path.join(OUTPUT_DIR, image.filename)

    with open(image_path, "wb") as f:
        shutil.copyfileobj(image.file, f)

    # --------------------------------------------------
    # Image → Thermal → Stress
    # --------------------------------------------------
    # Convert thermal to grayscale for mask generation
    gray, thermal = rgb_to_pseudo_thermal(image_path)
    original_img = cv2.imread(image_path)
    original_b64 = encode_image(original_img)

    stress_result = detect_stress(gray, thermal)
    stress_percentage = stress_result["stress_percentage"]
    enhanced_b64 = stress_result["images"]["enhanced"]
    thermal_b64 = stress_result["images"]["thermal"]

    # Ensure gray is 2D (already is, but safe)
    if gray.ndim == 3:
        gray = gray[:, :, 0]

    # Convert thermal (color) to grayscale
    thermal_gray = cv2.cvtColor(thermal, cv2.COLOR_BGR2GRAY)

    # Create disease mask from thermal grayscale
    raw_mask = (thermal_gray > np.mean(thermal_gray)).astype(np.uint8)

    # Resize mask to match gray
    disease_mask = cv2.resize(
        raw_mask, (gray.shape[1], gray.shape[0]), interpolation=cv2.INTER_NEAREST
    )

    # --------------------------------------------------
    # Deterministic stats (SOURCE OF TRUTH)
    # --------------------------------------------------
    stats = generate_plant_stats(
        gray=gray, disease_mask=disease_mask, stress_percentage=stress_percentage
    )

    prevention = ask_groq_for_prevention(name, stats)

    # --------------------------------------------------
    # LLM reasoning (QUALITATIVE ONLY)
    # --------------------------------------------------
    llm_analysis = ask_groq_for_analysis(name, stats)

    # --------------------------------------------------
    # API response (DB + dashboard ready)
    # --------------------------------------------------

    labels = merged_labels(image_path)

    plant = detect_plant_from_labels(labels)

    if plant is None:
        return {"plant": "Unknown", "disease": "Unknown", "confidence": 0}

    disease, stage, conf = detect_disease_production(labels, image_path, plant)

    return {
        "name": name,
        "disease_name": disease,
        "stats": stats,
        "images": {
            "original": original_b64,
            "enhanced": enhanced_b64,
            "thermal": thermal_b64,
        },
        "llm_analysis": llm_analysis,
        "prevention": prevention,
        "meta": {"generated_at": datetime.utcnow().isoformat()},
    }


@router.post("/chat")
async def follow_up_chat(payload: dict):
    if "stats" not in payload or "question" not in payload:
        raise HTTPException(status_code=400, detail="Invalid chat payload")

    name = payload.get("name", "the plant")

    return ask_groq_followup(
        name,
        payload["stats"],
        payload.get("previous_response", ""),
        payload["question"],
    )
