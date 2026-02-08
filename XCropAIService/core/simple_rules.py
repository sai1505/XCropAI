import json
import os
import cv2
import numpy as np
from core.utils import crop_center_leaf, detect_holes, fungal_texture


AUTO_STATS_FILE = "data/auto_threshold_stats.json"


def save_auto_stats(entry):
    try:
        if os.path.exists(AUTO_STATS_FILE):
            data = json.load(open(AUTO_STATS_FILE))
        else:
            data = []

        data.append(entry)
        json.dump(data[-2000:], open(AUTO_STATS_FILE, "w"))  # keep last 2000 samples
    except:
        pass


def classify_shape(dark_mask, img):
    """Detect spot vs streak vs patch using contours + line detection"""
    mask = (dark_mask > 0).astype("uint8") * 255

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    small_spots = 0
    elongated = 0
    large_patch = 0

    for c in contours:
        area = cv2.contourArea(c)
        if area < 8:
            continue

        x, y, w, h = cv2.boundingRect(c)
        aspect = max(w, h) / (min(w, h) + 1e-5)

        if area < 120 and aspect < 2:
            small_spots += 1
        elif aspect > 4:
            elongated += 1
        elif area > 400:
            large_patch += 1

    if elongated >= 3:
        return "streak"
    if small_spots > 40:
        return "spot"
    if large_patch >= 2:
        return "patch"
    return "mixed"


def detect_disease_production(labels, img_path=None, plant=None, ml_model=None):

    if img_path is None:
        return ["Unknown"], "none", 0.0

    img = cv2.imread(img_path)
    if img is None:
        return ["Unknown"], "none", 0.0

    img = crop_center_leaf(img)

    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    total = img.shape[0] * img.shape[1]

    # ---------- COLOR MASKS ----------
    yellow = cv2.inRange(hsv, (15, 30, 30), (40, 255, 255))
    green = cv2.inRange(hsv, (35, 40, 40), (85, 255, 255))
    dark = cv2.inRange(gray, 0, 75)
    brown = cv2.inRange(hsv, (5, 80, 50), (20, 255, 200))
    red = cv2.inRange(hsv, (0, 80, 60), (10, 255, 255))

    yellow_ratio = np.sum(yellow > 0) / total
    dark_ratio = np.sum(dark > 0) / total
    green_ratio = np.sum(green > 0) / total
    brown_ratio = np.sum(brown > 0) / total
    red_ratio = np.sum(red > 0) / total

    hole_ratio = detect_holes(gray)
    texture_val = fungal_texture(gray)

    shape = classify_shape(dark, img)

    text = " ".join(labels).lower()

    # ---------- SCORE ----------
    score = {
        "Leaf_Blight": 0,
        "Leaf_Spot": 0,
        "Rust": 0,
        "Red_Rot": 0,
        "Patch_Disease": 0,
        "Pest_Damage": 0,
        "Yellowing": 0,
        "Nutrient_Deficiency": 0,
    }

    # ---------- SHAPE RULES ----------
    if shape == "spot":
        score["Leaf_Spot"] += 0.8
    elif shape == "streak":
        score["Leaf_Blight"] += 0.7
    elif shape == "patch":
        score["Patch_Disease"] += 0.7

    # ---------- RUST vs RED ROT ----------
    if red_ratio > 0.02 and shape == "streak":
        score["Red_Rot"] += 0.9
    elif brown_ratio > 0.02 and texture_val > 18:
        score["Rust"] += 0.8

    # ---------- GENERIC ----------
    if dark_ratio > 0.06:
        score["Leaf_Spot"] += 0.4

    if hole_ratio > 0.015:
        score["Pest_Damage"] += 0.6

    # ---------- NUTRIENT ----------
    if yellow_ratio > 0.18 and dark_ratio < 0.02:
        score["Nutrient_Deficiency"] += 0.7
    elif yellow_ratio > 0.18:
        score["Yellowing"] += 0.3

    # ---------- CROP TUNING ----------
    if plant == "Coconut":
        if texture_val > 20 and brown_ratio > 0.02:
            score["Leaf_Spot"] += 0.8

    if plant == "Sugarcane":
        if red_ratio > 0.02:
            score["Red_Rot"] += 0.7

    # ---------- LABEL BOOST ----------
    if "rust" in text:
        score["Rust"] += 0.3
    if "rot" in text:
        score["Red_Rot"] += 0.3
    if "spot" in text:
        score["Leaf_Spot"] += 0.3
    if "blight" in text:
        score["Leaf_Blight"] += 0.3

    # ---------- PICK TOP 2 (MULTI DISEASE) ----------
    sorted_scores = sorted(score.items(), key=lambda x: x[1], reverse=True)
    diseases = [d for d, s in sorted_scores if s > 0.35][:2]

    if not diseases:
        return ["Unknown"], "none", 0.0

    confidence = min(sorted_scores[0][1], 1.0)

    # ---------- STAGE ----------
    severity = yellow_ratio + dark_ratio + brown_ratio + hole_ratio

    if severity < 0.12:
        stage = "early"
    elif severity < 0.28:
        stage = "mid"
    else:
        stage = "severe"

    # ---------- AUTO LEARN LOG ----------
    save_auto_stats(
        {
            "plant": plant,
            "yellow": yellow_ratio,
            "dark": dark_ratio,
            "brown": brown_ratio,
            "red": red_ratio,
            "holes": hole_ratio,
            "texture": texture_val,
            "shape": shape,
            "result": diseases[0],
        }
    )

    return diseases, stage, round(confidence, 3)
