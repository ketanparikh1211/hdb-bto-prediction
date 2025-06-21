import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Divider,
} from '@mui/material';
import {
  Analytics,
  LocationCity,
  TrendingUp,
  Home,
  Timeline,
  Assessment,
  MonetizationOn,
  CalendarToday,
} from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { apiService, TownAnalysis as TownAnalysisType } from '../services/api';

const TownAnalysis: React.FC = () => {
  const [selectedTown, setSelectedTown] = useState<string>('');
  const [townData, setTownData] = useState<TownAnalysisType | null>(null);
  const [towns, setTowns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTowns = async () => {
      try {
        const response = await apiService.getTowns();
        setTowns(response.data.towns);
      } catch (err) {
        console.error('Failed to fetch towns:', err);
      }
    };

    fetchTowns();
  }, []);

  const fetchTownAnalysis = async (townName: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getTownAnalysis(townName);
      setTownData(response.data);
    } catch (err) {
      setError(`Failed to load analysis for ${townName}. Please try again.`);
      console.error('Town analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTownChange = (townName: string) => {
    setSelectedTown(townName);
    if (townName) {
      fetchTownAnalysis(townName);
    } else {
      setTownData(null);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-SG', {
      style: 'currency',
      currency: 'SGD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const calculatePriceGrowth = () => {
    if (!townData) return 0;
    const growth = ((townData.price_trends.recent_median - townData.price_trends.overall_median) / townData.price_trends.overall_median) * 100;
    return growth;
  };

  const flatTypeData = townData ? Object.entries(townData.flat_types).map(([type, count]) => ({
    name: type,
    value: count,
    percentage: ((count / townData.total_transactions) * 100).toFixed(1),
  })) : [];

  const sizeData = townData ? Object.entries(townData.size_distribution).map(([type, size]) => ({
    type,
    size,
  })) : [];

  const COLORS = ['#1976d2', '#dc004e', '#4caf50', '#ff9800', '#9c27b0', '#00bcd4', '#795548'];

  const quickAnalysisCards = [
    { 
      town: 'WOODLANDS', 
      description: 'Mature estate with high transaction volume',
      highlight: '14K+ transactions'
    },
    { 
      town: 'TAMPINES', 
      description: 'Popular new town with strong growth',
      highlight: 'Multi-generation flats'
    },
    { 
      town: 'MARINE PARADE', 
      description: 'Coastal location, limited BTO history',
      highlight: '47 years since BTO'
    },
  ];

  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Town Market Analysis
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Comprehensive market insights and demographic analysis by location
        </Typography>
      </Box>

      {/* Town Selection */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box display="flex" alignItems="center" mb={3}>
          <LocationCity color="primary" sx={{ mr: 2 }} />
          <Typography variant="h6">Select Town for Analysis</Typography>
        </Box>
        
        <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={3} alignItems="flex-start">
          <Box flex="1">
            <FormControl fullWidth>
              <InputLabel>Choose a Town</InputLabel>
              <Select
                value={selectedTown}
                label="Choose a Town"
                onChange={(e) => handleTownChange(e.target.value)}
              >
                <MenuItem value="">
                  <em>Select a town...</em>
                </MenuItem>
                {towns.map((town) => (
                  <MenuItem key={town} value={town}>
                    {town}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          
          <Box flex="1">
            <Typography variant="body2" color="text.secondary">
              Or try these popular towns for quick analysis:
            </Typography>
            <Box mt={1}>
              {quickAnalysisCards.map((card) => (
                <Chip
                  key={card.town}
                  label={card.town}
                  onClick={() => handleTownChange(card.town)}
                  variant={selectedTown === card.town ? "filled" : "outlined"}
                  color="primary"
                  sx={{ mr: 1, mb: 1 }}
                />
              ))}
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Quick Analysis Cards */}
      {!selectedTown && (
        <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={3} mb={4}>
          {quickAnalysisCards.map((card, index) => (
            <Box key={index} flex="1">
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': { elevation: 4, transform: 'translateY(-2px)' },
                  transition: 'all 0.3s ease'
                }}
                onClick={() => handleTownChange(card.town)}
              >
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    {card.town}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {card.description}
                  </Typography>
                  <Chip label={card.highlight} color="primary" size="small" />
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>
      )}

      {/* Loading State */}
      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
          <Box textAlign="center">
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              Analyzing {selectedTown}...
            </Typography>
          </Box>
        </Box>
      )}

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Analysis Results */}
      {townData && !loading && (
        <Box>
          {/* Overview Cards */}
          <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} flexWrap="wrap" gap={3} mb={4}>
            <Box flex="1" minWidth="200px">
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h4" fontWeight="bold" color="primary.main">
                        {townData.total_transactions.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Transactions
                      </Typography>
                    </Box>
                    <Assessment color="primary" sx={{ fontSize: 40 }} />
                  </Box>
                </CardContent>
              </Card>
            </Box>

            <Box flex="1" minWidth="200px">
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h4" fontWeight="bold" color="success.main">
                        {formatPrice(townData.price_trends.recent_median)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Recent Median Price
                      </Typography>
                    </Box>
                    <MonetizationOn color="success" sx={{ fontSize: 40 }} />
                  </Box>
                </CardContent>
              </Card>
            </Box>

            <Box flex="1" minWidth="200px">
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography 
                        variant="h4" 
                        fontWeight="bold" 
                        color={calculatePriceGrowth() >= 0 ? "success.main" : "error.main"}
                      >
                        {calculatePriceGrowth() >= 0 ? '+' : ''}{calculatePriceGrowth().toFixed(1)}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Price Growth
                      </Typography>
                    </Box>
                    <TrendingUp color={calculatePriceGrowth() >= 0 ? "success" : "error"} sx={{ fontSize: 40 }} />
                  </Box>
                </CardContent>
              </Card>
            </Box>

            <Box flex="1" minWidth="200px">
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h4" fontWeight="bold" color="info.main">
                        {townData.lease_vintage.newest - townData.lease_vintage.oldest}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Development Span (Years)
                      </Typography>
                    </Box>
                    <CalendarToday color="info" sx={{ fontSize: 40 }} />
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Box>

          {/* Charts Section */}
          <Box display="flex" flexDirection={{ xs: 'column', lg: 'row' }} gap={3} mb={4}>
            {/* Flat Type Distribution */}
            <Box flex="1" minWidth="400px">
              <Paper sx={{ p: 3, height: 400 }}>
                <Typography variant="h6" gutterBottom>
                  Flat Type Distribution
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Transaction volume by flat type ({townData.data_period})
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={flatTypeData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                      labelLine={false}
                    >
                      {flatTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Transactions']} />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Box>

            {/* Typical Floor Areas */}
            <Box flex="1" minWidth="400px">
              <Paper sx={{ p: 3, height: 400 }}>
                <Typography variant="h6" gutterBottom>
                  Typical Floor Areas
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Median floor area by flat type (sqm)
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={sizeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [`${value} sqm`, 'Floor Area']} />
                    <Bar dataKey="size" fill="#1976d2" />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Box>
          </Box>

          {/* Detailed Information */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Market Summary for {townData.town}
            </Typography>
            
            <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={3}>
              <Box flex="1">
                <Typography variant="subtitle2" gutterBottom>
                  Transaction History
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Data Period:</strong> {townData.data_period}
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Total Transactions:</strong> {townData.total_transactions.toLocaleString()}
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Most Popular Flat Type:</strong> {Object.entries(townData.flat_types).sort(([,a], [,b]) => b - a)[0][0]} 
                  ({Object.entries(townData.flat_types).sort(([,a], [,b]) => b - a)[0][1].toLocaleString()} transactions)
                </Typography>
              </Box>

              <Box flex="1">
                <Typography variant="subtitle2" gutterBottom>
                  Development Timeline
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Oldest Development:</strong> {townData.lease_vintage.oldest}
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Newest Development:</strong> {townData.lease_vintage.newest}
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Development Era:</strong> {townData.lease_vintage.newest - townData.lease_vintage.oldest} years of continuous development
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle2" gutterBottom>
              Price Trends Analysis
            </Typography>
            <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
              <Box flex="1">
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      Overall Median
                    </Typography>
                    <Typography variant="h6" color="primary.main">
                      {formatPrice(townData.price_trends.overall_median)}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
              <Box flex="1">
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      Recent Median
                    </Typography>
                    <Typography variant="h6" color="success.main">
                      {formatPrice(townData.price_trends.recent_median)}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
              <Box flex="1">
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      Growth Rate
                    </Typography>
                    <Typography 
                      variant="h6" 
                      color={calculatePriceGrowth() >= 0 ? "success.main" : "error.main"}
                    >
                      {calculatePriceGrowth() >= 0 ? '+' : ''}{calculatePriceGrowth().toFixed(1)}%
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            </Box>
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default TownAnalysis;