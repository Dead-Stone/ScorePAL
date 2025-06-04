import React, { useState } from 'react';
import Head from 'next/head';
import { AppProps } from 'next/app';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  IconButton,
  useMediaQuery,
  Button,
  Chip,
  Tabs,
  Tab,
} from '@mui/material';
import Link from 'next/link';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import HelpIcon from '@mui/icons-material/Help';
import GitHubIcon from '@mui/icons-material/GitHub';
import SchoolIcon from '@mui/icons-material/School';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import SettingsIcon from '@mui/icons-material/Settings';
import IntegrationInstructionsIcon from '@mui/icons-material/IntegrationInstructions';
import { useRouter } from 'next/router';

// Create a modern purple/blue theme with no other colors
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#667eea', // Purple-blue
      light: '#8b9cf7',
      dark: '#4c63d2',
    },
    secondary: {
      main: '#764ba2', // Deep purple
      light: '#9575cd',
      dark: '#5e35b1',
    },
    background: {
      default: '#ffffff', // Pure white
      paper: '#ffffff',
    },
    text: {
      primary: '#000000', // Pure black
      secondary: '#4a5568', // Dark gray for readability
    },
    grey: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
    },
  },
  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontWeight: 800,
      fontSize: '2.5rem',
      lineHeight: 1.2,
    },
    h2: {
      fontWeight: 700,
      fontSize: '2rem',
      lineHeight: 1.3,
    },
    h3: {
      fontWeight: 700,
      fontSize: '1.75rem',
      lineHeight: 1.3,
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.4,
    },
    h6: {
      fontWeight: 600,
      fontSize: '1.125rem',
    },
    subtitle1: {
      fontSize: '1.125rem',
      fontWeight: 500,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 16,
  },
  shadows: [
    'none',
    '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  ] as const,
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 12,
          fontWeight: 600,
          fontSize: '0.9rem',
          padding: '10px 20px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          },
        },
        contained: {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #5a6fde 0%, #6a4190 100%)',
          },
        },
        outlined: {
          borderWidth: 2,
          borderColor: '#667eea',
          color: '#667eea',
          '&:hover': {
            borderWidth: 2,
            borderColor: '#5a6fde',
            backgroundColor: 'rgba(102, 126, 234, 0.04)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          border: '1px solid #f1f5f9',
          '&:hover': {
            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
            transform: 'translateY(-2px)',
            transition: 'all 0.3s ease-in-out',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        },
        elevation2: {
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        },
        elevation3: {
          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #e5e7eb',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#ffffff',
          borderRight: '1px solid #e5e7eb',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          margin: '2px 8px',
          '&.Mui-selected': {
            backgroundColor: 'rgba(102, 126, 234, 0.08)',
            borderLeft: '4px solid #667eea',
            '&:hover': {
              backgroundColor: 'rgba(102, 126, 234, 0.12)',
            },
          },
          '&:hover': {
            backgroundColor: 'rgba(102, 126, 234, 0.04)',
          },
        },
      },
    },
  },
});

const drawerWidth = 260;

const mainNavigationItems = [
  { text: 'Home', icon: <HomeIcon />, path: '/', description: 'Single assignment grading' },
  { text: 'Rubrics', icon: <FormatListBulletedIcon />, path: '/rubrics', description: 'Manage grading rubrics' },
  { text: 'Settings', icon: <SettingsIcon />, path: '/settings', description: 'Configure integrations' },
];

export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [integrationStatus, setIntegrationStatus] = useState({ canvas: false, moodle: false });

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Check for user session and integration status on app load
  React.useEffect(() => {
    const checkAuth = () => {
      if (typeof window !== 'undefined') {
        const userData = localStorage.getItem('scorepal_user');
        if (userData) {
          try {
            setUser(JSON.parse(userData));
          } catch (error) {
            localStorage.removeItem('scorepal_user');
          }
        }

        // Check integration status
        const integrationData = localStorage.getItem('integrations_enabled');
        if (integrationData) {
          try {
            setIntegrationStatus(JSON.parse(integrationData));
          } catch (error) {
            console.error('Error loading integration status');
          }
        }
      }
    };
    
    checkAuth();
  }, []);

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('scorepal_user');
    setUser(null);
    router.push('/');
  };

  // Pages that should not use the layout (like auth pages and landing)
  const noLayoutPaths = ['/login', '/register', '/landing', '/pricing'];
  const shouldUseLayout = !noLayoutPaths.includes(router.pathname);

  // Protected pages that require authentication (excluding home page which handles its own auth)
  const protectedPaths = ['/dashboard', '/rubrics', '/canvas', '/moodle', '/settings', '/help'];
  const isProtectedPath = protectedPaths.includes(router.pathname);

  // Redirect to home if not authenticated and trying to access protected page
  React.useEffect(() => {
    if (isProtectedPath && !user && typeof window !== 'undefined') {
      router.push('/');
    }
  }, [user, router.pathname, isProtectedPath, router]);

  // Redirect to home if authenticated and trying to access auth pages
  React.useEffect(() => {
    if (user && ['/landing', '/login', '/register'].includes(router.pathname)) {
      router.push('/');
    }
  }, [user, router.pathname, router]);

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo Section */}
      <Box sx={{ 
        p: 3, 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <Box
          component="img"
          src="/icons/scorepal_128x128.png"
          alt="ScorePAL Logo"
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            mb: 2,
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
          }}
        />
        <Typography variant="h6" fontWeight="bold" sx={{ mb: 0.5 }}>
          ScorePAL
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.9, textAlign: 'center' }}>
          AI-Powered Grading Assistant
        </Typography>
        
        {/* Free Trial Badge - Only show for non-authenticated users */}
        {!user && (
          <Chip 
            label="Free Trial Active" 
            size="small" 
            sx={{ 
              mt: 2, 
              bgcolor: 'rgba(255,255,255,0.2)', 
              color: 'white',
              fontSize: '0.75rem'
            }} 
          />
        )}
      </Box>

      <Divider />

      {/* Main Navigation */}
      <List sx={{ pt: 2 }}>
        {mainNavigationItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton 
              component={Link} 
              href={item.path}
              selected={router.pathname === item.path || router.pathname.startsWith(`${item.path}/`)}
              sx={{
                py: 1,
                mx: 1,
                borderRadius: 2,
                '&.Mui-selected': {
                  backgroundColor: 'rgba(102, 126, 234, 0.08)',
                  borderLeft: '4px solid #667eea',
                  '&:hover': {
                    backgroundColor: 'rgba(102, 126, 234, 0.12)',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ 
                color: router.pathname === item.path ? 'primary.main' : 'inherit',
                minWidth: 48,
              }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text}
                secondary={item.description}
                primaryTypographyProps={{
                  fontWeight: router.pathname === item.path ? 600 : 500,
                  fontSize: '0.95rem',
                }}
                secondaryTypographyProps={{
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* Integrations Section */}
      {(integrationStatus.canvas || integrationStatus.moodle) && (
        <>
          <Divider sx={{ mt: 2 }} />
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
              Integrations
            </Typography>
          </Box>
          <List sx={{ pt: 0 }}>
            {integrationStatus.canvas && (
              <ListItem disablePadding>
                <ListItemButton 
                  component={Link} 
                  href="/canvas"
                  selected={router.pathname.startsWith('/canvas')}
                  sx={{
                    py: 1,
                    mx: 1,
                    borderRadius: 2,
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(102, 126, 234, 0.08)',
                      borderLeft: '4px solid #667eea',
                    },
                  }}
                >
                  <ListItemIcon sx={{ 
                    color: router.pathname.startsWith('/canvas') ? 'primary.main' : 'inherit',
                    minWidth: 48,
                  }}>
                    <SchoolIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Canvas"
                    secondary="LMS Integration"
                    primaryTypographyProps={{
                      fontWeight: router.pathname.startsWith('/canvas') ? 600 : 500,
                      fontSize: '0.95rem',
                    }}
                    secondaryTypographyProps={{
                      fontSize: '0.75rem',
                      color: 'text.secondary',
                    }}
                  />
                  <Chip size="small" label="Connected" color="success" sx={{ fontSize: '0.7rem', height: 18 }} />
                </ListItemButton>
              </ListItem>
            )}
            
            {integrationStatus.moodle && (
              <ListItem disablePadding>
                <ListItemButton 
                  component={Link} 
                  href="/moodle"
                  selected={router.pathname.startsWith('/moodle')}
                  sx={{
                    py: 1,
                    mx: 1,
                    borderRadius: 2,
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(102, 126, 234, 0.08)',
                      borderLeft: '4px solid #667eea',
                    },
                  }}
                >
                  <ListItemIcon sx={{ 
                    color: router.pathname.startsWith('/moodle') ? 'primary.main' : 'inherit',
                    minWidth: 48,
                  }}>
                    <IntegrationInstructionsIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Moodle"
                    secondary="LMS Integration"
                    primaryTypographyProps={{
                      fontWeight: router.pathname.startsWith('/moodle') ? 600 : 500,
                      fontSize: '0.95rem',
                    }}
                    secondaryTypographyProps={{
                      fontSize: '0.75rem',
                      color: 'text.secondary',
                    }}
                  />
                  <Chip size="small" label="Connected" color="success" sx={{ fontSize: '0.7rem', height: 18 }} />
                </ListItemButton>
              </ListItem>
            )}
          </List>
        </>
      )}

      <Box sx={{ flexGrow: 1 }} />
      <Divider />
      
      {/* Footer Links */}
      <List>
        <ListItem disablePadding>
          <ListItemButton component="a" href="https://github.com/Dead-Stone/ScorePAL" target="_blank" sx={{ mx: 1, borderRadius: 2 }}>
            <ListItemIcon sx={{ minWidth: 48 }}>
              <GitHubIcon />
            </ListItemIcon>
            <ListItemText 
              primary="GitHub" 
              primaryTypographyProps={{
                fontWeight: 500,
                fontSize: '0.95rem',
              }}
            />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton component={Link} href="/help" sx={{ mx: 1, borderRadius: 2 }}>
            <ListItemIcon sx={{ minWidth: 48 }}>
              <HelpIcon />
            </ListItemIcon>
            <ListItemText 
              primary="Help" 
              primaryTypographyProps={{
                fontWeight: 500,
                fontSize: '0.95rem',
              }}
            />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <>
      <Head>
        <title>ScorePAL - AI Grading Assistant</title>
        <meta name="viewport" content="minimum-scale=1, initial-scale=1, width=device-width" />
        <link rel="icon" href="/icons/scorepal_32x32.png" />
      </Head>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {shouldUseLayout ? (
          <Box sx={{ display: 'flex' }}>
            <AppBar 
              position="fixed" 
              sx={{ 
                zIndex: (theme) => theme.zIndex.drawer + 1,
                boxShadow: 'none',
                borderBottom: '1px solid #e5e7eb',
                backgroundColor: 'white',
                color: 'text.primary',
                marginLeft: { md: `${drawerWidth}px` }, // Move nav bar to the right beside sidebar
                width: { md: `calc(100% - ${drawerWidth}px)` }, // Adjust width to account for sidebar
              }}
            >
              <Toolbar sx={{ px: { xs: 2, md: 3 } }}>
                <IconButton
                  color="inherit"
                  aria-label="open drawer"
                  edge="start"
                  onClick={handleDrawerToggle}
                  sx={{ mr: 2, display: { md: 'none' } }}
                >
                  <MenuIcon />
                </IconButton>
                
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2,
                  flexGrow: 1,
                }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {router.pathname === '/' && 'Single Grading'}
                    {router.pathname === '/rubrics' && 'Rubric Management'}
                    {router.pathname === '/settings' && 'Settings'}
                    {router.pathname.startsWith('/canvas') && 'Canvas Integration'}
                    {router.pathname.startsWith('/moodle') && 'Moodle Integration'}
                  </Typography>
                </Box>
                
                {/* User Info and Logout */}
                {user && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="body2" sx={{ color: '#4a5568' }}>
                      Welcome, {user.name || user.email.split('@')[0]}
                </Typography>
                    <Button
                      onClick={handleLogout}
                      variant="outlined"
                      size="small"
                      sx={{
                        borderColor: '#667eea',
                        color: '#667eea',
                        fontWeight: 500,
                        '&:hover': {
                          borderColor: '#5a6fde',
                          backgroundColor: 'rgba(102, 126, 234, 0.04)',
                        }
                      }}
                    >
                      Logout
                    </Button>
                  </Box>
                )}
              </Toolbar>
            </AppBar>
            <Box
              component="nav"
              sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
            >
              {/* Mobile drawer */}
              <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{
                  keepMounted: true, // Better open performance on mobile
                }}
                sx={{
                  display: { xs: 'block', md: 'none' },
                  '& .MuiDrawer-paper': { 
                    boxSizing: 'border-box', 
                    width: drawerWidth 
                  },
                }}
              >
                {drawer}
              </Drawer>
              
              {/* Desktop drawer */}
              <Drawer
                variant="permanent"
                sx={{
                  display: { xs: 'none', md: 'block' },
                  '& .MuiDrawer-paper': { 
                    boxSizing: 'border-box', 
                    width: drawerWidth,
                    borderRight: '1px solid #e5e7eb',
                    boxShadow: 'none',
                    top: '0px', // Start from the very top
                    height: '100vh', // Full height
                  },
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
                width: { md: `calc(100% - ${drawerWidth}px)` },
                minHeight: '100vh',
                backgroundColor: 'background.default',
                marginTop: '64px', // AppBar height
              }}
            >
              <Component {...pageProps} />
            </Box>
          </Box>
        ) : (
          <Component {...pageProps} />
        )}
      </ThemeProvider>
    </>
  );
} 