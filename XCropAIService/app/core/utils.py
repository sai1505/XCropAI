def clean_name(name):
    return name.replace("___", " - ").replace("__", " - ")


import cv2
import numpy as np


# ---------------- CROP CENTER LEAF ----------------
def crop_center_leaf(img):
    """
    Removes background edges and focuses on leaf center
    """
    h, w = img.shape[:2]
    return img[int(h * 0.15) : int(h * 0.9), int(w * 0.08) : int(w * 0.92)]


# ---------------- HOLE / PEST DETECTION ----------------
def detect_holes(gray):
    """
    Detects holes / bite / insect damage using edge density
    """
    edges = cv2.Canny(gray, 60, 120)
    hole_ratio = np.sum(edges > 0) / (gray.shape[0] * gray.shape[1])
    return hole_ratio


# ---------------- FUNGAL TEXTURE ----------------
def fungal_texture(gray):
    """
    Detects fungal / mold texture using surface variation
    Higher value → fungal probability
    """
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    texture = np.std(blur)
    return texture
