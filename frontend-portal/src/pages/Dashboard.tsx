import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Avatar,
  Chip,
  LinearProgress,
  Alert,
  Button,
} from '@mui/material';
import {
  TrendingUp,
  Home,
  Analytics,
  Speed,
  LocationCity,
  Assessment,
  CheckCircle,
  Schedule,
} from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { apiService, HealthCheck } from '../services/api';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [healthStatus, setHealthStatus] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const healthResponse = await apiService.getHealth();
        setHealthStatus(healthResponse.data);
        setError(null);
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const StatCard: React.FC<{
    title: string;
    value: string;
    subtitle: string;
    icon: React.ReactNode;
    color: string;
    trend?: string;
  }> = ({ title, value, subtitle, icon, color, trend }) => (
    <Card elevation={2}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h4" fontWeight="bold" color={color}>
              {value}
            </Typography>
            <Typography variant="h6" color="text.primary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
            {trend && (
              <Chip 
                label={trend} 
                size="small" 
                color="success" 
                icon={<TrendingUp />}
                sx={{ mt: 1 }}
              />
            )}
          </Box>
          <Avatar sx={{ bgcolor: color, width: 60, height: 60 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  const mockPriceData = [
    { town: 'Bukit Timah', avgPrice: 800000, transactions: 514 },
    { town: 'Central Area', avgPrice: 750000, transactions: 1286 },
    { town: 'Marine Parade', avgPrice: 650000, transactions: 1286 },
    { town: 'Bishan', avgPrice: 600000, transactions: 2456 },
    { town: 'Serangoon', avgPrice: 550000, transactions: 3156 },
    { town: 'Tampines', avgPrice: 500000, transactions: 14225 },
  ];

  const affordabilityData = [
    { name: 'Lower Income (<$7K)', value: 25, color: '#4caf50' },
    { name: 'Middle Income ($7K-$14K)', value: 45, color: '#2196f3' },
    { name: 'High Income (>$21K)', value: 30, color: '#ff9800' },
  ];

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>Dashboard</Typography>
        <LinearProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>Dashboard</Typography>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box mb={3}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          HDB BTO Analytics Dashboard
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Real-time insights into Singapore's HDB resale market and BTO opportunities
        </Typography>
      </Box>

      {/* System Status Alert */}
      {healthStatus && (
        <Alert 
          severity="success" 
          icon={<CheckCircle />}
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small">
              View Details
            </Button>
          }
        >
          <Typography variant="subtitle2">
            System Operational • Model v{healthStatus.model_version} • {healthStatus.features_count} Features Active
          </Typography>
        </Alert>
      )}

      {/* Key Metrics */}
      <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} flexWrap="wrap" gap={3} mb={4}>
        <Box flex="1" minWidth="250px">
          <StatCard
            title="Total Records"
            value="209K+"
            subtitle="HDB transactions analyzed"
            icon={<Home />}
            color="#1976d2"
            trend="+8.5% this year"
          />
        </Box>
        <Box flex="1" minWidth="250px">
          <StatCard
            title="Towns Covered"
            value="26"
            subtitle="Across Singapore"
            icon={<LocationCity />}
            color="#dc004e"
          />
        </Box>
        <Box flex="1" minWidth="250px">
          <StatCard
            title="Model Accuracy"
            value="94.2%"
            subtitle="Price prediction accuracy"
            icon={<Assessment />}
            color="#4caf50"
            trend="Improving"
          />
        </Box>
        <Box flex="1" minWidth="250px">
          <StatCard
            title="Response Time"
            value="<1s"
            subtitle="Average API response"
            icon={<Speed />}
            color="#ff9800"
          />
        </Box>
      </Box>

      {/* Charts Section */}
      <Box display="flex" flexDirection={{ xs: 'column', lg: 'row' }} gap={3} mb={4}>
        {/* Price Analysis */}
        <Box flex="2" minWidth="400px">
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Average Resale Prices by Town
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Current market pricing across premium locations
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mockPriceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="town" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                <Tooltip 
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Avg Price']}
                  labelFormatter={(label) => `Town: ${label}`}
                />
                <Bar dataKey="avgPrice" fill="#1976d2" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Box>

        {/* Affordability Distribution */}
        <Box flex="1" minWidth="300px">
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Affordability Distribution
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              BTO opportunities by income bracket
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={affordabilityData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${value}%`}
                >
                  {affordabilityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <Box mt={2}>
              {affordabilityData.map((item, index) => (
                <Box key={index} display="flex" alignItems="center" mb={1}>
                  <Box 
                    width={12} 
                    height={12} 
                    bgcolor={item.color} 
                    borderRadius="50%" 
                    mr={1}
                  />
                  <Typography variant="caption">{item.name}</Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Box>
      </Box>

      {/* Quick Actions */}
      <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={3}>
        <Box flex="1">
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Analytics color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Price Prediction</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Get instant price predictions for any HDB flat configuration
              </Typography>
              <Button 
                variant="contained" 
                fullWidth
                onClick={() => navigate('/price-predictor')}
              >
                Start Predicting
              </Button>
            </CardContent>
          </Card>
        </Box>
        
        <Box flex="1">
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Schedule color="secondary" sx={{ mr: 1 }} />
                <Typography variant="h6">BTO Recommendations</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" mb={2}>
                AI-powered suggestions for optimal BTO placement locations
              </Typography>
              <Button 
                variant="contained" 
                color="secondary" 
                fullWidth
                onClick={() => navigate('/bto-recommendations')}
              >
                View Recommendations
              </Button>
            </CardContent>
          </Card>
        </Box>
        
        <Box flex="1">
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <LocationCity color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Town Analysis</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Deep dive into market trends and demographics by location
              </Typography>
              <Button 
                variant="contained" 
                color="success" 
                fullWidth
                onClick={() => navigate('/town-analysis')}
              >
                Explore Towns
              </Button>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;