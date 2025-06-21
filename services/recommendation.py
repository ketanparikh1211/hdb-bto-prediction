import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from ml_models.predict import predict_price
import logging
from typing import Dict, List, Optional, Tuple
from functools import lru_cache
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Configuration
BTO_DISCOUNT_RATE = 0.2  # 20% discount from resale price
CURRENT_YEAR = 2025
MIN_YEARS_SINCE_LAUNCH = 5  # Minimum years to consider for BTO gap

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BTORecommendationService:
    def __init__(self):
        self._data_cache = None
        self._cache_timestamp = None
        self.cache_duration = 3600  # 1 hour cache
        self.executor = ThreadPoolExecutor(max_workers=4)
    
    @lru_cache(maxsize=1)
    def load_resale_data(self) -> Optional[pd.DataFrame]:
        """Load and preprocess resale data with caching"""
        try:
            # Check cache validity
            if (self._data_cache is not None and 
                self._cache_timestamp and 
                (datetime.now() - self._cache_timestamp).seconds < self.cache_duration):
                return self._data_cache
            
            df = pd.read_csv('resale_data.csv')
            
            # Data validation
            required_columns = ['month', 'town', 'flat_type', 'resale_price', 'lease_commence_date', 'floor_area_sqm']
            missing_columns = set(required_columns) - set(df.columns)
            if missing_columns:
                raise ValueError(f"Missing required columns: {missing_columns}")
            
            # Optimized preprocessing with vectorized operations
            df['transaction_date'] = pd.to_datetime(df['month'], errors='coerce')
            df['transaction_year'] = df['transaction_date'].dt.year
            
            # Remove invalid data efficiently
            df = df.dropna(subset=['transaction_date', 'resale_price', 'lease_commence_date'])
            df = df[df['resale_price'] > 0]
            
            # Cache the data
            self._data_cache = df
            self._cache_timestamp = datetime.now()
            
            logger.info(f"Loaded {len(df)} records successfully")
            return df
            
        except Exception as e:
            logger.error(f"Error loading data: {e}")
            return None

    def analyze_bto_gaps(self, df: pd.DataFrame) -> List[Dict]:
        """Optimized BTO gap analysis with vectorized operations"""
        if df is None or df.empty:
            return []
        
        # Vectorized operations for better performance
        town_stats = df.groupby('town').agg({
            'lease_commence_date': 'max',
            'transaction_year': ['count', lambda x: sum(x >= 2022)],
            'resale_price': 'mean'
        }).round(2)
        
        town_stats.columns = ['max_lease_year', 'total_transactions', 'recent_transactions', 'avg_price']
        town_stats['years_since_last_major_launch'] = CURRENT_YEAR - town_stats['max_lease_year']
        
        # Reset index to make town a column instead of index
        town_stats = town_stats.reset_index()
        
        # Filter and sort efficiently
        qualified_towns = town_stats[
            (town_stats['total_transactions'] > 100) &
            (town_stats['years_since_last_major_launch'] >= MIN_YEARS_SINCE_LAUNCH)
        ].sort_values(['years_since_last_major_launch', 'recent_transactions'], ascending=[False, False])
        
        return qualified_towns.head(8).to_dict('records')

    async def calculate_pricing_async(self, df: pd.DataFrame, town: str, flat_types: List[str]) -> Dict[str, float]:
        """Async pricing calculation for multiple flat types"""
        pricing_tasks = []
        
        for flat_type in flat_types:
            task = self.executor.submit(self._calculate_single_pricing, df, town, flat_type)
            pricing_tasks.append((flat_type, task))
        
        pricing = {}
        for flat_type, task in pricing_tasks:
            try:
                resale_price = task.result(timeout=5)  # 5 second timeout
                if resale_price:
                    bto_price = resale_price * (1 - BTO_DISCOUNT_RATE)
                    pricing[flat_type.lower().replace(' ', '_')] = round(bto_price)
            except Exception as e:
                logger.warning(f"Pricing calculation failed for {town} {flat_type}: {e}")
        
        return pricing

    def _calculate_single_pricing(self, df: pd.DataFrame, town: str, flat_type: str) -> Optional[float]:
        """Calculate pricing for a single flat type with fallback logic"""
        # Try recent data first
        recent_data = df[
            (df['town'] == town) & 
            (df['flat_type'] == flat_type) &
            (df['transaction_year'] >= 2022)
        ]
        
        if len(recent_data) >= 10:  # Minimum threshold for reliable median
            return recent_data['resale_price'].median()
        
        # Fallback to all available data
        all_data = df[(df['town'] == town) & (df['flat_type'] == flat_type)]
        if len(all_data) > 0:
            return all_data['resale_price'].median()
        
        return None

# Create global service instance
bto_service = BTORecommendationService()

def load_resale_data():
    """Legacy wrapper for backward compatibility"""
    return bto_service.load_resale_data()

def analyze_bto_gaps(df):
    """Legacy wrapper for backward compatibility"""
    return bto_service.analyze_bto_gaps(df)

def calculate_representative_pricing(df, town, flat_type='4 ROOM'):
    """Legacy wrapper with improved logic"""
    return bto_service._calculate_single_pricing(df, town, flat_type)

def get_town_characteristics(df, town):
    """Get key characteristics of a town from the data"""
    if df is None:
        return {}
    
    town_data = df[df['town'] == town].copy()
    
    if len(town_data) == 0:
        return {}
    
    # Calculate key metrics
    flat_type_distribution = town_data['flat_type'].value_counts(normalize=True).to_dict()
    avg_floor_area = town_data.groupby('flat_type')['floor_area_sqm'].median().to_dict()
    price_ranges = town_data.groupby('flat_type')['resale_price'].agg(['min', 'max', 'median']).to_dict()
    
    return {
        'flat_type_mix': flat_type_distribution,
        'typical_sizes': avg_floor_area,
        'price_ranges': price_ranges,
        'total_transactions': len(town_data)
    }

def recommend_estates():
    """Synchronous wrapper for existing API compatibility"""
    try:
        # Use synchronous implementation directly instead of async wrapper
        df = load_resale_data()
        
        if df is None:
            return [
                {
                    'town': 'WOODLANDS',
                    'years_since_last_major_launch': 8,
                    'predicted_4room_bto_price': 350000,
                    'rationale': 'Data unavailable - using fallback estimate'
                }
            ]
        
        # Use the service's analyze_bto_gaps method directly
        town_analysis = bto_service.analyze_bto_gaps(df)
        recommendations = []
        
        # Process top candidates (limit to avoid KeyError)
        for i, town_info in enumerate(town_analysis[:6]):
            try:
                town = town_info.get('town') if isinstance(town_info, dict) else getattr(town_info, 'name', str(town_info))
                
                # Calculate pricing for different flat types
                flat_types = ['3 ROOM', '4 ROOM', '5 ROOM']
                pricing = {}
                
                for flat_type in flat_types:
                    resale_price = bto_service._calculate_single_pricing(df, town, flat_type)
                    if resale_price:
                        bto_price = resale_price * (1 - BTO_DISCOUNT_RATE)
                        pricing[flat_type.lower().replace(' ', '_')] = round(bto_price)
                
                # Get town characteristics
                characteristics = get_town_characteristics(df, town)
                
                # Extract metrics safely
                years_gap = town_info.get('years_since_last_major_launch', 0) if isinstance(town_info, dict) else 0
                recent_activity = town_info.get('recent_transactions', 0) if isinstance(town_info, dict) else 0
                
                # Determine demand rationale
                demand_score = min(years_gap / 10.0, 1.0) if years_gap > 0 else 0.5
                
                rationale_parts = []
                if years_gap >= 8:
                    rationale_parts.append(f"No major launches for {years_gap} years")
                if recent_activity > 50:
                    rationale_parts.append(f"Active resale market ({recent_activity} recent transactions)")
                if pricing.get('4_room', 0) < 400000:
                    rationale_parts.append("Affordable pricing segment")
                
                rationale = "; ".join(rationale_parts) if rationale_parts else "Moderate BTO opportunity"
                
                recommendation = {
                    'town': town,
                    'years_since_last_major_launch': years_gap,
                    'demand_score': round(demand_score, 2),
                    'recent_market_activity': recent_activity,
                    'predicted_pricing': pricing,
                    'rationale': rationale,
                    'market_characteristics': {
                        'total_transactions': characteristics.get('total_transactions', 0),
                        'predominant_flat_types': list(characteristics.get('flat_type_mix', {}).keys())[:3]
                    }
                }
                
                recommendations.append(recommendation)
                
            except Exception as e:
                logger.warning(f"Error processing town {i}: {e}")
                continue
        
        # Sort by demand score and years since launch
        recommendations.sort(key=lambda x: (x['demand_score'], x['years_since_last_major_launch']), reverse=True)
        
        return recommendations[:6]  # Return top 6 recommendations
        
    except Exception as e:
        logger.error(f"Recommendation failed: {e}")
        # Return fallback data
        return [
            {
                'town': 'WOODLANDS',
                'years_since_last_major_launch': 8,
                'demand_score': 0.8,
                'recent_market_activity': 150,
                'predicted_pricing': {
                    '3_room': 280000,
                    '4_room': 350000,
                    '5_room': 420000
                },
                'rationale': 'Fallback recommendation - system error occurred',
                'market_characteristics': {
                    'total_transactions': 1000,
                    'predominant_flat_types': ['4 ROOM', '5 ROOM', '3 ROOM']
                }
            }
        ]

def get_town_market_analysis(town_name):
    """Get detailed market analysis for a specific town"""
    df = load_resale_data()
    
    if df is None:
        return {"error": "Data not available"}
    
    town_data = df[df['town'].str.upper() == town_name.upper()].copy()
    
    if len(town_data) == 0:
        return {"error": f"No data found for {town_name}"}
    
    # Comprehensive analysis
    analysis = {
        'town': town_name,
        'data_period': f"{town_data['month'].min()} to {town_data['month'].max()}",
        'total_transactions': len(town_data),
        'flat_types': town_data['flat_type'].value_counts().to_dict(),
        'price_trends': {
            'overall_median': int(town_data['resale_price'].median()),
            'recent_median': int(town_data[town_data['transaction_year'] >= 2023]['resale_price'].median()) 
                           if len(town_data[town_data['transaction_year'] >= 2023]) > 0 else None,
        },
        'size_distribution': town_data.groupby('flat_type')['floor_area_sqm'].median().to_dict(),
        'lease_vintage': {
            'oldest': int(town_data['lease_commence_date'].min()),
            'newest': int(town_data['lease_commence_date'].max()),
        }
    }
    
    return analysis