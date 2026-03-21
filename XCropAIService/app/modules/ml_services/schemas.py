from pydantic import BaseModel
from typing import List, Dict, Any, Optional, Union


class ImageSet(BaseModel):
    original: str  # Base64 or Signed URL
    enhanced: str
    thermal: str


class AnalysisStats(BaseModel):
    plant_health: Dict[str, Any]
    image_analysis: Dict[str, Any]


class LLMAnalysis(BaseModel):
    explanation: str
    future_trend: str
    confidence_level: str


class PreventionGuidance(BaseModel):
    overall_assessment: str
    prevention_steps: List[str]
    necessary_cautions: List[str]


class AnalysisResponse(BaseModel):
    chat_id: str
    name: str
    # Change this line:
    disease_name: Union[str, List[str]]
    stats: Dict[str, Any]
    images: Dict[str, Any]
    llm_analysis: Dict[str, Any]
    prevention: Dict[str, Any]
    meta: Dict[str, Any]


class ChatPayload(BaseModel):
    name: str
    stats: Dict[str, Any]
    previous_response: Optional[str] = ""
    question: str
