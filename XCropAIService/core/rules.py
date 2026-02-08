def rule_engine(labels):
    text = " ".join(labels)

    if "yellow" in text and "spots" in text:
        return "Leaf Blight"

    if "yellow" in text:
        return "Nutrient Deficiency"

    if "spots" in text:
        return "Leaf Spot"

    if "fungus" in text or "mold" in text:
        return "Fungal Infection"

    return "Unknown"
