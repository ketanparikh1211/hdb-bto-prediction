import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create a separate API instance for long-running operations like recommendations
const longRunningApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 seconds for recommendations endpoint
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Response interceptor for long-running API
longRunningApi.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Long-running API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export interface PredictionRequest {
  town: string;
  flat_type: string;
  floor_area_sqm: number;
  storey: number;
  lease_commence_year: number;
}

export interface PredictionResponse {
  town: string;
  flat_type: string;
  predicted_resale_price: number;
  predicted_bto_price: number;
  affordability: string;
}

export interface TownAnalysis {
  town: string;
  data_period: string;
  total_transactions: number;
  flat_types: Record<string, number>;
  price_trends: {
    overall_median: number;
    recent_median: number;
  };
  size_distribution: Record<string, number>;
  lease_vintage: {
    oldest: number;
    newest: number;
  };
}

export interface RecommendedTown {
  town: string;
  years_since_last_major_launch: number;
  demand_score: number;
  recent_market_activity: number;
  predicted_pricing: Record<string, number>;
  rationale: string;
  market_characteristics: {
    total_transactions: number;
    predominant_flat_types: string[];
  };
}

export interface RecommendationResponse {
  prompt: string;
  analysis: string;
  recommended_towns: RecommendedTown[];
}

export interface HealthCheck {
  status: string;
  model_loaded: boolean;
  model_version: string;
  features_count: number;
  timestamp: number;
}

export const apiService = {
  // Health check
  getHealth: () => api.get<HealthCheck>('/health'),
  
  // Prediction
  predict: (data: PredictionRequest) => api.post<PredictionResponse>('/predict', data),
  
  // Town data
  getTowns: () => api.get<{ towns: string[]; count: number }>('/towns'),
  getFlatTypes: () => api.get<{ flat_types: string[]; count: number }>('/flat-types'),
  
  // Town analysis
  getTownAnalysis: (townName: string) => api.get<TownAnalysis>(`/town/${townName}/analysis`),
  
  // Recommendations - using long-running API instance
  getRecommendations: () => longRunningApi.get<RecommendationResponse>('/recommend'),
};

export default apiService;