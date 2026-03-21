import os
from dotenv import load_dotenv

load_dotenv(override=True)

BASE_DIR = os.getcwd()
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")

os.makedirs(OUTPUT_DIR, exist_ok=True)

PLANTNET_KEY = os.getenv("PLANTNET_API_KEY")
MODEL_PATH = "model/plant_model.h5"
