import os
import json
from PIL import Image
from google import genai
from google.genai import types
from app.core.gemini_client import GEMINI_API_KEY

client = genai.Client(api_key=GEMINI_API_KEY)


def analyze_plant_disease(image_path: str, plant_identity: str = "Plant") -> str:
    """
    Calls Gemini 2.5 Flash to get a precise disease name from an image.
    """
    if not os.path.exists(image_path):
        return "File Not Found"

    img = Image.open(image_path)

    prompt = f"""
    Act as a PhD Plant Pathologist. Analyze this {plant_identity} image with high precision.
    Identify the specific, exact name of the disease (e.g., 'Tomato Early Blight' instead of just 'Blight').
    If the plant is healthy, return 'Healthy'. 

    Step 1: Check if the image contains a plant, leaf, crop, or branch.
    - If NOT related to plants → return:
    {{"error": "Invalid image. Please upload a plant-related image."}}

    Step 2: If valid → analyze disease.

    Rules:
    1. Provide exact disease name (e.g., 'Tomato Early Blight').
    2. If healthy → return 'healthy'.

    Return ONLY JSON:
    - If invalid:
    {{"error": "Invalid image. Please upload a plant-related image."}}

    - If valid:
    {{"disease_name": "name"}}
    """

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[prompt, img],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema={
                    "type": "OBJECT",
                    "properties": {"disease_name": {"type": "STRING"}},
                    "required": ["disease_name"],
                },
                temperature=0.1,
            ),
        )

        # With mime_type="application/json", response.text is a pure JSON string
        result = json.loads(response.text)
        return result.get("disease_name", "Unknown")

    except Exception as e:
        print(f"❌ Gemini Service Error: {e}")
        return "Analysis Error"
