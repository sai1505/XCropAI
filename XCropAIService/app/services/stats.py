import numpy as np
from scipy.stats import entropy

def generate_plant_stats(gray, disease_mask, stress_percentage):
    if gray.size == 0:
        raise ValueError("Empty image provided")

    if disease_mask.shape != gray.shape:
        raise ValueError("disease_mask must match image shape")

    infected_ratio = (
        np.sum(disease_mask > 0) / gray.size
        if gray.size > 0 else 0
    )

    severity = (infected_ratio * 100 * 0.6) + (stress_percentage * 0.4)

    if severity < 20:
        stage = "HEALTHY"
    elif severity < 40:
        stage = "EARLY_STRESS"
    elif severity < 65:
        stage = "MODERATE_STRESS"
    else:
        stage = "SEVERE_STRESS"

    health_score = max(0, 100 - severity)

    survivability_score = round(
        max(0.2, health_score / 100), 2
    )

    life_expectancy_band = (
        "LONG" if health_score > 70
        else "MEDIUM" if health_score > 40
        else "SHORT"
    )

    return {
        "image_analysis": {
            "mean_intensity": float(np.mean(gray)),
            "std_intensity": float(np.std(gray)),
            "entropy": float(entropy(np.histogram(gray, bins=256)[0] + 1)),
            "infected_area_percent": round(infected_ratio * 100, 2),
        },
        "plant_health": {
            "stress_percentage": stress_percentage,
            "disease_stage": stage,
            "health_score": round(health_score, 2),
            "survivability_score": survivability_score,
            "life_expectancy_band": life_expectancy_band,
            "recovery_potential": (
                "HIGH" if health_score > 70
                else "MEDIUM" if health_score > 40
                else "LOW"
            ),
            "care_urgency": (
                "LOW" if health_score > 70
                else "MEDIUM" if health_score > 40
                else "HIGH"
            ),
        }
    }
