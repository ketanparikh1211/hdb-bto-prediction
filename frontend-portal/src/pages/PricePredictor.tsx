import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Alert,
  Chip,
  CircularProgress,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Analytics as PredictiveAnalytics,
  TrendingUp,
  Home,
  LocationOn,
  ExpandMore,
  Calculate,
  MonetizationOn,
} from '@mui/icons-material';
import { apiService, PredictionRequest, PredictionResponse } from '../services/api';

const PricePredictor: React.FC = () => {
  const [formData, setFormData] = useState<PredictionRequest>({
    town: '',
    flat_type: '',
    floor_area_sqm: 90,
    storey: 5,
    lease_commence_year: 2000,
  });
  
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [towns, setTowns] = useState<string[]>([]);
  const [flatTypes, setFlatTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [townsRes, flatTypesRes] = await Promise.all([
          apiService.getTowns(),
          apiService.getFlatTypes(),
        ]);
        setTowns(townsRes.data.towns);
        setFlatTypes(flatTypesRes.data.flat_types);
      } catch (err) {
        console.error('Failed to fetch options:', err);
      }
    };

    fetchOptions();
  }, []);

  const handleInputChange = (field: keyof PredictionRequest, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePredict = async () => {
    if (!formData.town || !formData.flat_type) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiService.predict(formData);
      setPrediction(response.data);
    } catch (err) {
      setError('Failed to get prediction. Please try again.');
      console.error('Prediction error:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      town: '',
      flat_type: '',
      floor_area_sqm: 90,
      storey: 5,
      lease_commence_year: 2000,
    });
    setPrediction(null);
    setError(null);
  };

  const getAffordabilityColor = (affordability: string) => {
    if (affordability.includes('Lower')) return 'success';
    if (affordability.includes('Middle')) return 'primary';
    return 'warning';
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-SG', {
      style: 'currency',
      currency: 'SGD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const calculateSavings = () => {
    if (!prediction) return 0;
    return prediction.predicted_resale_price - prediction.predicted_bto_price;
  };

  return (
    <Box>
      <Box mb={3}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          HDB Price Predictor
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Get accurate price predictions for HDB resale and BTO flats using AI-powered analysis
        </Typography>
      </Box>

      <Box display="flex" flexDirection={{ xs: 'column', lg: 'row' }} gap={3}>
        {/* Input Form */}
        <Box flex="1" minWidth="400px">
          <Paper sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" mb={3}>
              <PredictiveAnalytics color="primary" sx={{ mr: 2 }} />
              <Typography variant="h6">Property Details</Typography>
            </Box>

            <Box display="flex" flexDirection="column" gap={2}>
              <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
                <Box flex="1">
                  <FormControl fullWidth>
                    <InputLabel>Town</InputLabel>
                    <Select
                      value={formData.town}
                      label="Town"
                      onChange={(e) => handleInputChange('town', e.target.value)}
                    >
                      {towns.map((town) => (
                        <MenuItem key={town} value={town}>
                          {town}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                <Box flex="1">
                  <FormControl fullWidth>
                    <InputLabel>Flat Type</InputLabel>
                    <Select
                      value={formData.flat_type}
                      label="Flat Type"
                      onChange={(e) => handleInputChange('flat_type', e.target.value)}
                    >
                      {flatTypes.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Box>

              <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
                <Box flex="1">
                  <TextField
                    fullWidth
                    label="Floor Area (sqm)"
                    type="number"
                    value={formData.floor_area_sqm}
                    onChange={(e) => handleInputChange('floor_area_sqm', Number(e.target.value))}
                    inputProps={{ min: 30, max: 200 }}
                  />
                </Box>

                <Box flex="1">
                  <TextField
                    fullWidth
                    label="Storey Level"
                    type="number"
                    value={formData.storey}
                    onChange={(e) => handleInputChange('storey', Number(e.target.value))}
                    inputProps={{ min: 1, max: 50 }}
                  />
                </Box>
              </Box>

              <TextField
                fullWidth
                label="Lease Commence Year"
                type="number"
                value={formData.lease_commence_year}
                onChange={(e) => handleInputChange('lease_commence_year', Number(e.target.value))}
                inputProps={{ min: 1960, max: 2025 }}
              />
            </Box>

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            <Box mt={3} display="flex" gap={2}>
              <Button
                variant="contained"
                onClick={handlePredict}
                disabled={loading || !formData.town || !formData.flat_type}
                startIcon={loading ? <CircularProgress size={20} /> : <Calculate />}
                sx={{ flex: 1 }}
              >
                {loading ? 'Predicting...' : 'Get Prediction'}
              </Button>
              <Button variant="outlined" onClick={resetForm}>
                Reset
              </Button>
            </Box>
          </Paper>

          {/* Sample Predictions */}
          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Try These Examples
            </Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              {[
                { town: 'WOODLANDS', type: '4 ROOM', area: 90 },
                { town: 'MARINE PARADE', type: '3 ROOM', area: 70 },
                { town: 'BUKIT TIMAH', type: '5 ROOM', area: 130 },
              ].map((example, index) => (
                <Card 
                  key={index}
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  onClick={() => setFormData({
                    town: example.town,
                    flat_type: example.type,
                    floor_area_sqm: example.area,
                    storey: 5,
                    lease_commence_year: 2000,
                  })}
                >
                  <CardContent sx={{ py: 1 }}>
                    <Typography variant="body2">
                      {example.town} • {example.type} • {example.area}sqm
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Paper>
        </Box>

        {/* Results */}
        <Box flex="1" minWidth="400px">
          {prediction ? (
            <Box>
              {/* Price Results */}
              <Paper sx={{ p: 3, mb: 3 }}>
                <Box display="flex" alignItems="center" mb={3}>
                  <MonetizationOn color="success" sx={{ mr: 2 }} />
                  <Typography variant="h6">Price Prediction Results</Typography>
                </Box>

                <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={3}>
                  <Box flex="1">
                    <Card sx={{ bgcolor: 'primary.light', color: 'white' }}>
                      <CardContent>
                        <Typography variant="h4" fontWeight="bold">
                          {formatPrice(prediction.predicted_resale_price)}
                        </Typography>
                        <Typography variant="h6">Resale Price</Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          Current market estimate
                        </Typography>
                      </CardContent>
                    </Card>
                  </Box>

                  <Box flex="1">
                    <Card sx={{ bgcolor: 'success.light', color: 'white' }}>
                      <CardContent>
                        <Typography variant="h4" fontWeight="bold">
                          {formatPrice(prediction.predicted_bto_price)}
                        </Typography>
                        <Typography variant="h6">BTO Price</Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          Estimated new launch price
                        </Typography>
                      </CardContent>
                    </Card>
                  </Box>
                </Box>

                <Divider sx={{ my: 3 }} />

                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Typography variant="h6">Potential Savings</Typography>
                  <Chip
                    label={formatPrice(calculateSavings())}
                    color="success"
                    size="medium"
                    icon={<TrendingUp />}
                  />
                </Box>

                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography variant="body1">Affordability Category</Typography>
                  <Chip
                    label={prediction.affordability}
                    color={getAffordabilityColor(prediction.affordability)}
                    variant="outlined"
                  />
                </Box>
              </Paper>

              {/* Property Summary */}
              <Paper sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" mb={2}>
                  <Home color="primary" sx={{ mr: 2 }} />
                  <Typography variant="h6">Property Summary</Typography>
                </Box>

                <Box display="flex" flexDirection="column" gap={2}>
                  <Box display="flex" justifyContent="space-between">
                    <Box flex="1">
                      <Typography variant="body2" color="text.secondary">
                        Location
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {prediction.town}
                      </Typography>
                    </Box>
                    <Box flex="1">
                      <Typography variant="body2" color="text.secondary">
                        Flat Type
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {prediction.flat_type}
                      </Typography>
                    </Box>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Box flex="1">
                      <Typography variant="body2" color="text.secondary">
                        Floor Area
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {formData.floor_area_sqm} sqm
                      </Typography>
                    </Box>
                    <Box flex="1">
                      <Typography variant="body2" color="text.secondary">
                        Storey
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        Level {formData.storey}
                      </Typography>
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Lease Commenced
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {formData.lease_commence_year} ({2025 - formData.lease_commence_year} years old)
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Box>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center', height: 'fit-content' }}>
              <PredictiveAnalytics sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Ready to Predict
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Fill in the property details on the left to get accurate price predictions powered by our AI model.
              </Typography>
            </Paper>
          )}
        </Box>
      </Box>

      {/* Information Accordion */}
      <Box mt={4}>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6">How Price Prediction Works</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography paragraph>
              Our AI-powered price prediction model analyzes over 209,000 HDB transaction records using 37 engineered features including:
            </Typography>
            <Box component="ul" sx={{ pl: 2 }}>
              <li>Location and town-specific market trends</li>
              <li>Flat type and size specifications</li>
              <li>Storey level and lease vintage analysis</li>
              <li>Historical pricing patterns and seasonality</li>
              <li>Market demand and supply indicators</li>
            </Box>
            <Typography sx={{ mt: 2 }}>
              The model achieves 94.2% accuracy and provides both resale market estimates and projected BTO pricing with a 20% discount factor as per HDB policy.
            </Typography>
          </AccordionDetails>
        </Accordion>
      </Box>
    </Box>
  );
};

export default PricePredictor;