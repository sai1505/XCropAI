import cv2
from app.core.config import OUTPUT_DIR
import os
import re

def rgb_to_pseudo_thermal(image_path: str):
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError("Image not found")

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    clahe = cv2.createCLAHE(3.0, (8, 8))
    enhanced = clahe.apply(gray)

    thermal = cv2.applyColorMap(enhanced, cv2.COLORMAP_INFERNO)

    # 🔹 filename handling
    filename = os.path.basename(image_path)
    name, ext = os.path.splitext(filename)

    # sanitize (important)
    safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', name)

    gray_path = os.path.join(OUTPUT_DIR, f"{safe_name}_gray{ext}")
    thermal_path = os.path.join(OUTPUT_DIR, f"{safe_name}_thermal{ext}")

    cv2.imwrite(gray_path, gray)
    cv2.imwrite(thermal_path, thermal)

    return enhanced, thermal
