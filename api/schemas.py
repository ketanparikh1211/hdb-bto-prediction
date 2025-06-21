from pydantic import BaseModel, Field
from typing import Optional, List, Dict

class PredictRequest(BaseModel):
    town: str
    flat_type: str
    floor_area_sqm: float
    storey: int
    lease_commence_year: int

class PredictResponse(BaseModel):
    town: str
    flat_type: str
    predicted_resale_price: float
    predicted_bto_price: float
    affordability: str

class RecommendationResponse(BaseModel):
    prompt: str
    analysis: str
    recommended_towns: List[Dict]