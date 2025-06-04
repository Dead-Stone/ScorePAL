import React, { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Chip,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  Settings as SettingsIcon,
  Assessment as RubricIcon,
  School as CanvasIcon,
  Book as MoodleIcon,
  AccountCircle as AccountIcon,
  Logout as LogoutIcon,
  Login as LoginIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import { useFreeTrial } from '../hooks/useFreeTrial';

interface LayoutProps {
  children: React.ReactNode;
}

const drawerWidth = 280;

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const router = useRouter();
  const { attemptsUsed, maxAttempts, canUseFreeTrial, isLoggedIn, setLoggedIn } = useFreeTrial();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [integrationsEnabled, setIntegrationsEnabled] = useState({
    canvas: false,
    moodle: false,
  });

  // Load integration status
  useEffect(() => {
    const savedIntegrations = localStorage.getItem('integrations_enabled');
    if (savedIntegrations) {
      try {
        setIntegrationsEnabled(JSON.parse(savedIntegrations));
      } catch (error) {
        console.error('Error loading integration status:', error);
      }
    }
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNavigation = (path: string) => {
    router.push(path);
    setMobileOpen(false);
  };

  const handleLogout = () => {
    setLoggedIn(false);
    setAnchorEl(null);
    router.push('/login');
  };

  const handleLogin = () => {
    setAnchorEl(null);
    router.push('/login');
  };

  const navigationItems = [
    {
      text: 'Home',
      icon: <HomeIcon />,
      path: '/',
      description: 'Single assignment grading',
    },
    {
      text: 'Rubrics',
      icon: <RubricIcon />,
      path: '/rubrics',
      description: 'Manage grading rubrics',
    },
    {
      text: 'Settings',
      icon: <SettingsIcon />,
      path: '/settings',
      description: 'Configure integrations',
    },
  ];

  const integrationItems = [
    {
      text: 'Canvas',
      icon: <CanvasIcon />,
      path: '/canvas',
      enabled: integrationsEnabled.canvas,
      color: '#e13d2b',
    },
    {
      text: 'Moodle',
      icon: <MoodleIcon />,
      path: '/moodle',
      enabled: integrationsEnabled.moodle,
      color: '#f88900',
    },
  ];

  const drawer = (
    <Box>
      {/* Header */}
      <Box sx={{ p: 2, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
          ScorePAL
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.8 }}>
          AI-Powered Grading Assistant
        </Typography>
        
        {/* Trial Status */}
        {!isLoggedIn && (
          <Box sx={{ mt: 2 }}>
            <Chip
              label={`Free Trial: ${maxAttempts - attemptsUsed} left`}
              size="small"
              variant="outlined"
              sx={{ 
                color: 'white', 
                borderColor: 'white',
                fontSize: '0.75rem'
              }}
            />
          </Box>
        )}
      </Box>

      <Divider />

      {/* Main Navigation */}
      <List sx={{ px: 1 }}>
        {navigationItems.map((item) => (
          <ListItem 
            key={item.text}
            onClick={() => handleNavigation(item.path)}
            sx={{ 
              cursor: 'pointer',
              borderRadius: 1,
              mb: 0.5,
              '&:hover': { 
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
              },
              ...(router.pathname === item.path && {
                backgroundColor: 'rgba(103, 126, 234, 0.1)',
                color: '#667eea',
                '& .MuiListItemIcon-root': {
                  color: '#667eea',
                },
              }),
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.text}
              secondary={item.description}
              primaryTypographyProps={{ fontSize: '0.9rem' }}
              secondaryTypographyProps={{ fontSize: '0.75rem' }}
            />
          </ListItem>
        ))}
      </List>

      <Divider sx={{ mx: 2, my: 1 }} />

      {/* Integrations Section */}
      <Box sx={{ px: 2, py: 1 }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
          Integrations
        </Typography>
      </Box>

      <List sx={{ px: 1 }}>
        {integrationItems.map((item) => (
          <Tooltip
            key={item.text}
            title={item.enabled ? '' : 'Configure in Settings to enable'}
            placement="right"
          >
            <ListItem 
              onClick={() => item.enabled ? handleNavigation(item.path) : handleNavigation('/settings')}
              sx={{ 
                cursor: 'pointer',
                borderRadius: 1,
                mb: 0.5,
                opacity: item.enabled ? 1 : 0.6,
                '&:hover': { 
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                },
                ...(router.pathname === item.path && item.enabled && {
                  backgroundColor: `${item.color}15`,
                  color: item.color,
                  '& .MuiListItemIcon-root': {
                    color: item.color,
                  },
                }),
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Badge
                  variant="dot"
                  color={item.enabled ? 'success' : 'default'}
                  sx={{
                    '& .MuiBadge-badge': {
                      backgroundColor: item.enabled ? '#4caf50' : '#bdbdbd',
                    },
                  }}
                >
                  {item.icon}
                </Badge>
              </ListItemIcon>
              <ListItemText 
                primary={item.text}
                secondary={item.enabled ? 'Connected' : 'Not configured'}
                primaryTypographyProps={{ fontSize: '0.9rem' }}
                secondaryTypographyProps={{ fontSize: '0.75rem' }}
              />
            </ListItem>
          </Tooltip>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          backgroundColor: 'white',
          color: 'text.primary',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
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
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, color: 'text.primary' }}>
            {router.pathname === '/' && 'Single Grading'}
            {router.pathname === '/rubrics' && 'Rubric Management'}
            {router.pathname === '/settings' && 'Settings'}
            {router.pathname === '/canvas' && 'Canvas Integration'}
            {router.pathname === '/moodle' && 'Moodle Integration'}
          </Typography>

          {/* Profile Menu */}
          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleProfileMenuOpen}
            color="inherit"
          >
            <AccountIcon />
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
          >
            {isLoggedIn ? (
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                Logout
              </MenuItem>
            ) : (
              <MenuItem onClick={handleLogin}>
                <ListItemIcon>
                  <LoginIcon fontSize="small" />
                </ListItemIcon>
                Login
              </MenuItem>
            )}
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
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

      {/* Main Content */}
      <Box
        component="main"
        sx={{ 
          flexGrow: 1, 
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          backgroundColor: '#fafafa',
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
};

export default Layout; 