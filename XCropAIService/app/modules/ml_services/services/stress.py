import cv2
import numpy as np
from app.core.config import OUTPUT_DIR
import base64


def encode_image(img):
    _, buffer = cv2.imencode(".png", img)
    return base64.b64encode(buffer).decode("utf-8")


def detect_stress(enhanced_gray, thermal_img):
    threshold = int(0.65 * 255)
    _, mask = cv2.threshold(enhanced_gray, threshold, 255, cv2.THRESH_BINARY)

    kernel = np.ones((5, 5), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

    stressed = np.count_nonzero(mask)
    total = mask.size
    percentage = round((stressed / total) * 100, 2)

    overlay = thermal_img.copy()
    overlay[mask == 255] = [0, 0, 255]

    return {
        "stress_percentage": percentage,
        "images": {
            "enhanced": encode_image(enhanced_gray),
            "thermal": encode_image(thermal_img),
        },
        "images_raw": {
            "enhanced": enhanced_gray,  # Raw CV2 array
            "thermal": thermal_img,  # Raw CV2 array
        },
    }
