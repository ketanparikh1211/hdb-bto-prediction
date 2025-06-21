import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Chip,
  Alert,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Analytics as PredictIcon,
  Recommend as RecommendIcon,
  Analytics as AnalyticsIcon,
  Home as HomeIcon,
  CheckCircle,
  Error,
} from '@mui/icons-material';
import { apiService, HealthCheck } from '../services/api';

const drawerWidth = 280;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [healthStatus, setHealthStatus] = useState<HealthCheck | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { 
      text: 'Dashboard', 
      icon: <DashboardIcon />, 
      path: '/dashboard',
      description: 'System overview & key metrics'
    },
    { 
      text: 'Price Predictor', 
      icon: <PredictIcon />, 
      path: '/price-predictor',
      description: 'Predict resale & BTO prices'
    },
    { 
      text: 'BTO Recommendations', 
      icon: <RecommendIcon />, 
      path: '/bto-recommendations',
      description: 'AI-powered BTO placement suggestions'
    },
    { 
      text: 'Town Analysis', 
      icon: <AnalyticsIcon />, 
      path: '/town-analysis',
      description: 'Market trends & demographics'
    },
  ];

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await apiService.getHealth();
        setHealthStatus(response.data);
        setHealthError(null);
      } catch (error) {
        setHealthError('API connection failed');
        setHealthStatus(null);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <Box>
      <Toolbar sx={{ bgcolor: 'primary.main', color: 'white' }}>
        <HomeIcon sx={{ mr: 2 }} />
        <Box>
          <Typography variant="h6" noWrap component="div">
            HDB BTO System
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            AI-Powered Analytics
          </Typography>
        </Box>
      </Toolbar>
      
      <Box sx={{ p: 2 }}>
        {healthStatus ? (
          <Alert 
            severity="success" 
            icon={<CheckCircle fontSize="inherit" />}
            sx={{ mb: 2 }}
          >
            <Box>
              <Typography variant="caption" display="block">
                API Status: {healthStatus.status.toUpperCase()}
              </Typography>
              <Typography variant="caption" display="block">
                Model v{healthStatus.model_version} ({healthStatus.features_count} features)
              </Typography>
            </Box>
          </Alert>
        ) : (
          <Alert 
            severity="error" 
            icon={<Error fontSize="inherit" />}
            sx={{ mb: 2 }}
          >
            <Typography variant="caption">
              {healthError || 'System offline'}
            </Typography>
          </Alert>
        )}
      </Box>

      <Divider />
      
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => navigate(item.path)}
              sx={{
                m: 1,
                borderRadius: 2,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText 
                primary={item.text}
                secondary={item.description}
                secondaryTypographyProps={{
                  variant: 'caption',
                  sx: { 
                    color: location.pathname === item.path ? 'rgba(255,255,255,0.7)' : 'text.secondary'
                  }
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      
      <Divider sx={{ mt: 2 }} />
      
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
          Data Coverage
        </Typography>
        <Chip label="209K+ Records" size="small" color="primary" sx={{ mb: 1, mr: 1 }} />
        <Chip label="26 Towns" size="small" color="secondary" sx={{ mb: 1, mr: 1 }} />
        <Chip label="2017-2025" size="small" variant="outlined" sx={{ mb: 1 }} />
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: 1,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {menuItems.find(item => item.path === location.pathname)?.text || 'HDB BTO System'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Live Data • {new Date().toLocaleDateString()}
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
          bgcolor: 'background.default',
          minHeight: '100vh',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout;