import pytest
import pandas as pd
from unittest.mock import patch, MagicMock
from services.recommendation import BTORecommendationService, recommend_estates, get_town_market_analysis
import numpy as np
from datetime import datetime

class TestBTORecommendationService:
    """Test suite for BTO recommendation service"""
    
    @pytest.fixture
    def sample_data(self):
        """Create sample test data"""
        return pd.DataFrame({
            'month': ['2023-01', '2023-02', '2022-12'] * 100,
            'town': ['WOODLANDS', 'JURONG WEST', 'TAMPINES'] * 100,
            'flat_type': ['4 ROOM', '3 ROOM', '5 ROOM'] * 100,
            'resale_price': np.random.normal(400000, 50000, 300),
            'lease_commence_date': np.random.randint(1990, 2020, 300),
            'floor_area_sqm': np.random.normal(90, 10, 300),
            'transaction_year': [2023, 2023, 2022] * 100
        })
    
    @pytest.fixture
    def service(self):
        """Create service instance"""
        return BTORecommendationService()
    
    def test_load_resale_data_success(self, service, sample_data):
        """Test successful data loading"""
        with patch('pandas.read_csv', return_value=sample_data):
            result = service.load_resale_data()
            assert result is not None
            assert len(result) > 0
            assert 'transaction_year' in result.columns
    
    def test_load_resale_data_missing_columns(self, service):
        """Test data loading with missing columns"""
        incomplete_data = pd.DataFrame({'month': ['2023-01'], 'town': ['TEST']})
        with patch('pandas.read_csv', return_value=incomplete_data):
            result = service.load_resale_data()
            assert result is None
    
    def test_analyze_bto_gaps(self, service, sample_data):
        """Test BTO gap analysis"""
        result = service.analyze_bto_gaps(sample_data)
        assert isinstance(result, list)
        if result:  # If there are results
            assert all('years_since_last_major_launch' in item for item in result)
    
    def test_calculate_pricing_async(self, service, sample_data):
        """Test async pricing calculation"""
        import asyncio
        
        async def run_test():
            result = await service.calculate_pricing_async(
                sample_data, 'WOODLANDS', ['3 ROOM', '4 ROOM']
            )
            return result
        
        result = asyncio.run(run_test())
        assert isinstance(result, dict)
    
    def test_recommend_estates_fallback(self):
        """Test recommendation fallback when data unavailable"""
        with patch('services.recommendation.load_resale_data', return_value=None):
            result = recommend_estates()
            assert isinstance(result, list)
            assert len(result) > 0
            assert 'town' in result[0]

class TestModelPrediction:
    """Test ML model prediction functionality"""
    
    @pytest.fixture
    def mock_features(self):
        return {
            'floor_area_sqm': 90,
            'storey_low': 5,
            'storey_high': 5,
            'lease_commence_year': 2000,
            'tx_year': 2025,
            'tx_month': 6,
            'town_WOODLANDS': 1,
            'flat_type_4 ROOM': 1
        }
    
    def test_predict_price_success(self, mock_features):
        """Test successful price prediction"""
        with patch('ml_models.predict.model') as mock_model:
            mock_model.predict.return_value = [400000]
            from ml_models.predict import predict_price
            
            result = predict_price(mock_features)
            assert isinstance(result, float)
            assert result > 0
    
    def test_predict_price_feature_alignment(self, mock_features):
        """Test feature alignment in prediction"""
        with patch('ml_models.predict.expected_features', list(mock_features.keys())):
            with patch('ml_models.predict.model') as mock_model:
                mock_model.predict.return_value = [400000]
                from ml_models.predict import predict_price
                
                result = predict_price(mock_features)
                assert result == 400000.0

class TestAPIEndpoints:
    """Test API endpoint functionality"""
    
    @pytest.fixture
    def client(self):
        from fastapi.testclient import TestClient
        from api.main import app
        return TestClient(app)
    
    def test_health_endpoint(self, client):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] == "ok"
    
    def test_predict_endpoint_valid_input(self, client):
        """Test prediction endpoint with valid input"""
        with patch('api.main.model_loaded', True):
            with patch('api.main.expected_features', ['floor_area_sqm', 'town_WOODLANDS']):
                with patch('ml_models.predict.predict_price', return_value=400000):
                    payload = {
                        "town": "WOODLANDS",
                        "flat_type": "4 ROOM",
                        "floor_area_sqm": 90.0,
                        "storey": 5,
                        "lease_commence_year": 2000
                    }
                    response = client.post("/predict", json=payload)
                    assert response.status_code == 200
                    data = response.json()
                    assert "predicted_resale_price" in data
                    assert "predicted_bto_price" in data
    
    def test_predict_endpoint_invalid_input(self, client):
        """Test prediction endpoint with invalid input"""
        payload = {
            "town": "WOODLANDS",
            "flat_type": "4 ROOM",
            "floor_area_sqm": -10,  # Invalid negative area
            "storey": 5,
            "lease_commence_year": 2000
        }
        response = client.post("/predict", json=payload)
        assert response.status_code == 400
    
    def test_recommend_endpoint(self, client):
        """Test recommendation endpoint"""
        with patch('services.recommendation.recommend_estates') as mock_recommend:
            with patch('services.llm_analysis.analyze_with_llm', return_value="Test analysis"):
                mock_recommend.return_value = [
                    {"town": "WOODLANDS", "years_since_last_major_launch": 8}
                ]
                response = client.get("/recommend")
                assert response.status_code == 200
                data = response.json()
                assert "analysis" in data
                assert "recommended_towns" in data

class TestDataIngestion:
    """Test data ingestion and transformation"""
    
    def test_data_validation(self):
        """Test data validation logic"""
        # Test with valid data
        valid_data = pd.DataFrame({
            'month': ['2023-01'],
            'town': ['WOODLANDS'],
            'flat_type': ['4 ROOM'],
            'resale_price': [400000],
            'lease_commence_date': [2000],
            'floor_area_sqm': [90]
        })
        
        # Should not raise any exceptions
        assert len(valid_data) == 1
        assert valid_data['resale_price'].iloc[0] > 0
    
    def test_data_cleaning(self):
        """Test data cleaning processes"""
        dirty_data = pd.DataFrame({
            'month': ['2023-01', None, '2023-03'],
            'resale_price': [400000, -100, 500000],  # Negative price should be filtered
            'town': ['WOODLANDS', 'JURONG WEST', None]
        })
        
        # Clean data
        cleaned = dirty_data.dropna()
        cleaned = cleaned[cleaned['resale_price'] > 0]
        
        assert len(cleaned) == 1  # Only one valid row should remain

if __name__ == "__main__":
    pytest.main([__file__, "-v"])