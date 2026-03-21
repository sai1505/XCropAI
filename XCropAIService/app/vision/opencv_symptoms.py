import cv2
import numpy as np


def opencv_symptoms(img_path):
    img = cv2.imread(img_path)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

    symptoms = []

    lower_yellow = np.array([20, 80, 80])
    upper_yellow = np.array([35, 255, 255])
    yellow_mask = cv2.inRange(hsv, lower_yellow, upper_yellow)

    if np.sum(yellow_mask) / img.size > 0.03:
        symptoms.append("yellow")

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 60, 255, cv2.THRESH_BINARY_INV)

    if np.sum(thresh) / img.size > 0.02:
        symptoms.append("spots")

    return symptoms
