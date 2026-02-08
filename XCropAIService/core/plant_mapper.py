def detect_plant_from_labels(labels):
    text = " ".join(labels).lower()

    # Coconut
    if "cocos nucifera" in text or "coconut" in text:
        return "Coconut"

    # Rice
    if "oryza sativa" in text or "rice" in text:
        return "Rice"

    # Tomato
    if "solanum lycopersicum" in text or "tomato" in text:
        return "Tomato"

    # Brinjal
    if "solanum melongena" in text or "brinjal" in text or "eggplant" in text:
        return "Brinjal"

    # Chilli
    if "capsicum" in text or "chilli" in text:
        return "Chilli"

    # Banana
    if "musa" in text or "banana" in text:
        return "Banana"

    # Mango
    if "mangifera indica" in text or "mango" in text:
        return "Mango"

    # Groundnut
    if "arachis hypogaea" in text or "groundnut" in text or "peanut" in text:
        return "Groundnut"

    # Maize
    if "zea mays" in text or "maize" in text or "corn" in text:
        return "Maize"

    # Sugarcane
    if "saccharum officinarum" in text or "sugarcane" in text:
        return "Sugarcane"

    # Cotton
    if "gossypium" in text or "cotton" in text:
        return "Cotton"

    # Turmeric
    if "curcuma longa" in text or "turmeric" in text:
        return "Turmeric"

    return None
