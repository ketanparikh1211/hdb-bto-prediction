import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Avatar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Recommend,
  LocationCity,
  Timeline,
  TrendingUp,
  MonetizationOn,
  Schedule,
  ExpandMore,
  Star,
  Home,
  Assessment,
  Refresh,
} from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { apiService, RecommendationResponse, RecommendedTown } from '../services/api';

const BTORecommendations: React.FC = () => {
  const [recommendations, setRecommendations] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getRecommendations();
      setRecommendations(response.data);
    } catch (err) {
      setError('Failed to load BTO recommendations. Please try again.');
      console.error('Recommendations error:', err);
    } finally {
      setLoading(false);
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

  const getPriorityColor = (years: number) => {
    if (years >= 30) return 'error';
    if (years >= 20) return 'warning';
    return 'success';
  };

  const TownCard: React.FC<{ town: RecommendedTown; index: number }> = ({ town, index }) => (
    <Card elevation={3} sx={{ mb: 3 }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center">
            <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
              {index + 1}
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight="bold">
                {town.town}
              </Typography>
              <Chip
                label={`${town.years_since_last_major_launch} years since BTO`}
                color={getPriorityColor(town.years_since_last_major_launch)}
                size="small"
                sx={{ mt: 0.5 }}
              />
            </Box>
          </Box>
          <Box textAlign="right">
            <Typography variant="h6" color="primary.main">
              Priority Score
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="primary.main">
              {(town.demand_score * 100).toFixed(0)}%
            </Typography>
          </Box>
        </Box>

        <Typography variant="body1" color="text.secondary" paragraph>
          {town.rationale}
        </Typography>

        <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={2} mb={3}>
          <Box flex={1}>
            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" gutterBottom>
                Market Activity
              </Typography>
              <Box display="flex" alignItems="center">
                <TrendingUp color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  {town.recent_market_activity.toLocaleString()} transactions
                </Typography>
              </Box>
            </Paper>
          </Box>
          <Box flex={1}>
            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" gutterBottom>
                Total Records
              </Typography>
              <Box display="flex" alignItems="center">
                <Assessment color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  {town.market_characteristics.total_transactions.toLocaleString()}
                </Typography>
              </Box>
            </Paper>
          </Box>
        </Box>

        <Typography variant="h6" gutterBottom>
          Predicted BTO Pricing
        </Typography>
        <Box display="flex" flexWrap="wrap" gap={2}>
          {Object.entries(town.predicted_pricing).map(([flatType, price]) => (
            <Box key={flatType} flex="1" minWidth="150px">
              <Card variant="outlined">
                <CardContent sx={{ py: 1.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    {flatType.replace('_', ' ').toUpperCase()}
                  </Typography>
                  <Typography variant="h6" color="primary.main" fontWeight="bold">
                    {formatPrice(price)}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>

        <Accordion sx={{ mt: 2 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle1">Market Characteristics</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" gutterBottom>
              <strong>Predominant Flat Types:</strong> {town.market_characteristics.predominant_flat_types.join(', ')}
            </Typography>
            <Typography variant="body2">
              <strong>Total Historical Transactions:</strong> {town.market_characteristics.total_transactions.toLocaleString()}
            </Typography>
          </AccordionDetails>
        </Accordion>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Box textAlign="center">
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Analyzing BTO Opportunities...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            AI is processing 209K+ records to find optimal locations
          </Typography>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          BTO Recommendations
        </Typography>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" onClick={fetchRecommendations}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  const chartData = recommendations?.recommended_towns.map(town => ({
    town: town.town,
    years: town.years_since_last_major_launch,
    activity: town.recent_market_activity,
  })) || [];

  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          AI-Powered BTO Recommendations
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Strategic placement suggestions based on market gaps and demand analysis
        </Typography>
      </Box>

      {recommendations && (
        <>
          {/* Summary Section */}
          <Paper sx={{ p: 3, mb: 4 }}>
            <Box display="flex" alignItems="center" justifyContent="between" mb={3}>
              <Box display="flex" alignItems="center">
                <Recommend color="primary" sx={{ mr: 2 }} />
                <Typography variant="h5">Executive Summary</Typography>
              </Box>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={fetchRecommendations}
                disabled={loading}
              >
                Refresh Analysis
              </Button>
            </Box>
            
            <Typography variant="body1" paragraph>
              {recommendations.analysis}
            </Typography>

            <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={3} mt={2}>
              <Box flex={1}>
                <Card variant="outlined">
                  <CardContent>
                    <Box display="flex" alignItems="center">
                      <LocationCity color="primary" sx={{ mr: 2 }} />
                      <Box>
                        <Typography variant="h4" fontWeight="bold" color="primary.main">
                          {recommendations.recommended_towns.length}
                        </Typography>
                        <Typography variant="body2">
                          Priority Towns Identified
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
              <Box flex={1}>
                <Card variant="outlined">
                  <CardContent>
                    <Box display="flex" alignItems="center">
                      <Schedule color="warning" sx={{ mr: 2 }} />
                      <Box>
                        <Typography variant="h4" fontWeight="bold" color="warning.main">
                          {Math.max(...recommendations.recommended_towns.map(t => t.years_since_last_major_launch))}
                        </Typography>
                        <Typography variant="body2">
                          Max Years Since BTO
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
              <Box flex={1}>
                <Card variant="outlined">
                  <CardContent>
                    <Box display="flex" alignItems="center">
                      <TrendingUp color="success" sx={{ mr: 2 }} />
                      <Box>
                        <Typography variant="h4" fontWeight="bold" color="success.main">
                          {recommendations.recommended_towns.reduce((sum, t) => sum + t.recent_market_activity, 0).toLocaleString()}
                        </Typography>
                        <Typography variant="body2">
                          Total Market Activity
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            </Box>
          </Paper>

          {/* Market Gap Analysis Chart */}
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              BTO Launch Gap Analysis
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Years since last major BTO launch vs. current market activity
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="town" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name === 'years' ? `${value} years` : value.toLocaleString(),
                    name === 'years' ? 'Years Since BTO' : 'Market Activity'
                  ]}
                />
                <Bar dataKey="years" fill="#ff9800" name="years" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>

          {/* Detailed Recommendations */}
          <Box mb={4}>
            <Typography variant="h5" gutterBottom fontWeight="bold">
              Detailed Recommendations
            </Typography>
            {recommendations.recommended_towns.map((town, index) => (
              <TownCard key={town.town} town={town} index={index} />
            ))}
          </Box>

          {/* Implementation Guidelines */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Implementation Guidelines
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <Star color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Priority Sequencing"
                  secondary="Launch BTOs in order of recommendation priority, considering years since last launch and market demand."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <MonetizationOn color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="Pricing Strategy"
                  secondary="Use predicted pricing as baseline, adjust based on local amenities and market conditions."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Assessment color="secondary" />
                </ListItemIcon>
                <ListItemText
                  primary="Market Monitoring"
                  secondary="Continuously monitor market activity and resale trends to validate demand assumptions."
                />
              </ListItem>
            </List>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default BTORecommendations;