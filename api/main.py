from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from api.schemas import PredictRequest, PredictResponse, RecommendationResponse
from services.recommendation import recommend_estates, get_town_market_analysis
from services.llm_analysis import analyze_with_llm
import os
import json
import logging
from ml_models.predict import predict_price
from typing import Optional, List
import time
from functools import lru_cache

# Configuration
env_discount = float(os.getenv('BTO_DISCOUNT', 0.2))
MODEL_VERSION = os.getenv('MODEL_VERSION', '1.0.0')

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title='HDB BTO Recommendation & Price Prediction API',
    description='AI-powered system for HDB BTO estate recommendations and price predictions',
    version='1.0.0',
    docs_url='/docs',
    redoc_url='/redoc'
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for model state
expected_features = []
model_loaded = False

@app.on_event("startup")
async def startup_event():
    """Initialize the application"""
    global expected_features, model_loaded
    
    try:
        with open('models/model_features.json', 'r') as f:
            expected_features = json.load(f)
        model_loaded = True
        logger.info(f"✅ Loaded {len(expected_features)} model features")
        logger.info(f"🚀 API started successfully - Model version: {MODEL_VERSION}")
    except FileNotFoundError:
        expected_features = []
        model_loaded = False
        logger.warning("❌ Warning: Model features file not found")

def validate_model_loaded():
    """Dependency to validate model is loaded"""
    if not model_loaded:
        raise HTTPException(
            status_code=503, 
            detail="Model not available. Please check model files."
        )

@lru_cache(maxsize=128)
def create_prediction_features(town: str, flat_type: str, floor_area_sqm: float, 
                             storey: int, lease_commence_year: int) -> dict:
    """Create properly aligned features for prediction with caching"""
    # Initialize all features to 0
    features = {feature: 0 for feature in expected_features}
    
    # Set numeric features
    features['floor_area_sqm'] = floor_area_sqm
    features['storey_low'] = storey
    features['storey_high'] = storey
    features['lease_commence_year'] = lease_commence_year
    features['tx_year'] = 2025
    features['tx_month'] = 6
    
    # Set categorical features (town and flat_type)
    town_feature = f'town_{town}'
    if town_feature in features:
        features[town_feature] = 1
    
    flat_type_feature = f'flat_type_{flat_type}'
    if flat_type_feature in features:
        features[flat_type_feature] = 1
    
    return features

def calculate_affordability(bto_price: float) -> str:
    """Calculate affordability bracket based on BTO price"""
    if bto_price <= 300000:
        return "Lower Income (<$7,000)"
    elif bto_price <= 450000:
        return "Middle Income ($7,000-$14,000)"
    elif bto_price <= 600000:
        return "Upper Middle Income ($14,000-$21,000)"
    else:
        return "High Income (>$21,000)"

@app.get('/health')
async def health_check():
    """Enhanced health check with system status"""
    return {
        'status': 'ok', 
        'model_loaded': model_loaded,
        'model_version': MODEL_VERSION,
        'features_count': len(expected_features),
        'timestamp': time.time()
    }

@app.post('/predict', response_model=PredictResponse)
async def predict(req: PredictRequest, _: None = Depends(validate_model_loaded)):
    """Predict resale and BTO prices for a flat"""
    try:
        # Validate input ranges
        if req.floor_area_sqm <= 0 or req.floor_area_sqm > 300:
            raise HTTPException(status_code=400, detail="Invalid floor area")
        if req.storey < 1 or req.storey > 50:
            raise HTTPException(status_code=400, detail="Invalid storey level")
        if req.lease_commence_year < 1960 or req.lease_commence_year > 2025:
            raise HTTPException(status_code=400, detail="Invalid lease commence year")
        
        # Create aligned features
        features = create_prediction_features(
            req.town, req.flat_type, req.floor_area_sqm, 
            req.storey, req.lease_commence_year
        )
        
        # Make prediction
        resale_price = predict_price(features)
        bto_price = resale_price * (1 - env_discount)
        affordability = calculate_affordability(bto_price)
        
        logger.info(f"Prediction: {req.town} {req.flat_type} -> ${resale_price:,.0f} resale, ${bto_price:,.0f} BTO")
        
        return PredictResponse(
            town=req.town,
            flat_type=req.flat_type,
            predicted_resale_price=round(resale_price, 2),
            predicted_bto_price=round(bto_price, 2),
            affordability=affordability
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=f"Invalid input: {str(ve)}")
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@app.get('/recommend', response_model=RecommendationResponse)
async def recommend(background_tasks: BackgroundTasks):
    """Get BTO estate recommendations with LLM analysis"""
    try:
        start_time = time.time()
        
        # Get recommendations
        recs = recommend_estates()
        
        if not recs:
            raise HTTPException(status_code=404, detail="No recommendations available")
        
        # Prepare data for LLM analysis
        data_str = '\n'.join([
            f"Town: {r['town']}, Years since BTO: {r.get('years_since_last_major_launch', 0)}, "
            f"Recent activity: {r.get('recent_market_activity', 0)}, "
            f"Pricing: {r.get('predicted_pricing', {})}, "
            f"Rationale: {r.get('rationale', 'N/A')}"
            for r in recs[:5]  # Limit to top 5 for LLM analysis
        ])
        
        # Get LLM analysis
        analysis = analyze_with_llm(
            question="Recommend estates with limited BTO launches in the past decade and analyse potential BTO pricing for different flat types (3-room, 4-room, 5-room) with affordability considerations.",
            data=data_str
        )
        
        processing_time = round(time.time() - start_time, 2)
        logger.info(f"Recommendation completed in {processing_time}s")
        
        return RecommendationResponse(
            prompt="limited_bto_last_decade_with_pricing_analysis",
            analysis=analysis,
            recommended_towns=recs
        )
    except Exception as e:
        logger.error(f"Recommendation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Recommendation failed: {str(e)}")

@app.get('/town/{town_name}/analysis')
async def get_town_analysis(town_name: str):
    """Get detailed market analysis for a specific town"""
    try:
        town_name_clean = town_name.upper().strip()
        analysis = get_town_market_analysis(town_name_clean)
        
        if "error" in analysis:
            raise HTTPException(status_code=404, detail=analysis["error"])
        
        return analysis
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Town analysis error for {town_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.get('/towns')
async def list_available_towns():
    """Get list of all available towns in the dataset"""
    try:
        from services.recommendation import load_resale_data
        df = load_resale_data()
        
        if df is None:
            raise HTTPException(status_code=503, detail="Data not available")
        
        towns = sorted(df['town'].unique().tolist())
        return {
            "towns": towns,
            "count": len(towns)
        }
    except Exception as e:
        logger.error(f"Error fetching towns: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch towns")

@app.get('/flat-types')
async def list_flat_types():
    """Get list of all available flat types"""
    try:
        from services.recommendation import load_resale_data
        df = load_resale_data()
        
        if df is None:
            raise HTTPException(status_code=503, detail="Data not available")
        
        flat_types = sorted(df['flat_type'].unique().tolist())
        return {
            "flat_types": flat_types,
            "count": len(flat_types)
        }
    except Exception as e:
        logger.error(f"Error fetching flat types: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch flat types")

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )
