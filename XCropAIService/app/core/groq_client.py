import os
from dotenv import load_dotenv
from groq import Groq

load_dotenv(override=True)

def get_groq_client() -> Groq:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise EnvironmentError("GROQ_API_KEY not set")
    return Groq(api_key=api_key)
