/**
 * ScorePAL - AI-Powered Academic Grading Assistant
 * Main Application Layout & Theme Configuration
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 * @repository https://github.com/Dead-Stone/ScorePAL
 */

import React, { useState } from 'react';
import Head from 'next/head';
import { AppProps } from 'next/app';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  IconButton,
  useMediaQuery,
  Paper,
  ListSubheader,
  Tooltip,
  Chip,
  Button,
} from '@mui/material';
import Link from 'next/link';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CreateIcon from '@mui/icons-material/Create';
import BarChartIcon from '@mui/icons-material/BarChart';
import HelpIcon from '@mui/icons-material/Help';
import GitHubIcon from '@mui/icons-material/GitHub';
import BusinessIcon from '@mui/icons-material/Business';
import GradingIcon from '@mui/icons-material/Grading';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { useRouter } from 'next/router';
import BackendStatus from '../components/BackendStatus';

// Create a theme instance
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // blue
      light: '#63a4ff',
      dark: '#004ba0',
      contrastText: '#fff',
    },
    secondary: {
      main: '#ff4081', // pink accent
      light: '#ff79b0',
      dark: '#c60055',
      contrastText: '#fff',
    },
    background: {
      default: '#fff', // Changed to white
      paper: '#fff',
    },
    grey: {
      100: '#f5f5f5',
      200: '#eeeeee',
      300: '#e0e0e0',
      400: '#bdbdbd',
      500: '#9e9e9e',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
    },
    success: {
      main: '#43a047',
    },
    warning: {
      main: '#ffa000',
    },
    error: {
      main: '#e53935',
    },
    info: {
      main: '#0288d1',
    },
  },
  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      'Segoe UI',
      'Roboto',
      'Helvetica Neue',
      'Arial',
      'sans-serif',
    ].join(','),
    fontWeightBold: 700,
    fontWeightMedium: 600,
    fontWeightRegular: 400,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 24px 0 rgba(80, 120, 200, 0.08)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 16,
        },
      },
    },
    MuiListSubheader: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          color: '#616161',
          background: 'inherit',
        },
      },
    },
  },
});

const drawerWidth = 150;

const navigationItems = [
  { text: 'Home', icon: <HomeIcon />, path: '/' },
  { text: 'Grade', icon: <Box component="img" src="/grade-logo.png" alt="Grade Logo" sx={{ height: 24, width: 24, objectFit: 'contain' }} />, path: '/grade' },
  { text: 'Results', icon: <GradingIcon />, path: '/results' },
  { text: 'Rubrics', icon: <Box component="img" src="/rubric-logo.png" alt="Rubric Logo" sx={{ height: 24, width: 24, objectFit: 'contain' }} />, path: '/rubric' },
  { text: 'Canvas', icon: <Box component="img" src="/canvas-logo.jpg" alt="Canvas Logo" sx={{ height: 24, width: 24, objectFit: 'contain' }} />, path: '/canvas' },
  { text: 'Moodle', icon: <Box component="img" src="/moodle-logo.png" alt="Moodle Logo" sx={{ height: 24, width: 24, objectFit: 'contain' }} />, path: '/moodle-integration' },
];

export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Pages that should not use the layout (like auth pages)
  const noLayoutPaths = ['/login', '/register'];
  const shouldUseLayout = !noLayoutPaths.includes(router.pathname);

  const FloatingButtons = () => (
    <Box sx={{
      position: 'fixed',
      top: 16,
      right: 16,
      zIndex: 1200,
      display: 'flex',
      gap: 1,
    }}>
      <BackendStatus />
      <Button
        variant="contained"
        sx={{
          bgcolor: 'rgba(255, 255, 255, 0.8)',
          color: 'primary.main',
          minWidth: 40,
          width: 40,
          height: 40,
          borderRadius: '50%',
          p: 0,
          '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.9)' },
        }}
        component={Link}
        href="/help"
      >
        <HelpIcon />
      </Button>
      <Button
        variant="contained"
        sx={{
          bgcolor: 'rgba(255, 255, 255, 0.8)',
          color: 'text.primary',
          minWidth: 40,
          width: 40,
          height: 40,
          borderRadius: '50%',
          p: 0,
          '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.9)' },
        }}
        href="https://github.com/Dead-Stone"
        target="_blank"
        rel="noopener noreferrer"
      >
        <GitHubIcon />
      </Button>
    </Box>
  );

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.default', borderRight: '1px solid #e0e0e0', boxShadow: 2, width: 0, minWidth: drawerWidth }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'fill', minHeight: 8 }}>
        <img
          src="/scorePAL-logo.png"
          alt="ScorePAL Logo"
          style={{
            height: 128,
            width: 128,
            objectFit: 'contain',
            display: 'block',
            background: 'transparent',
          }}
        />
      </Box>
      <Divider sx={{ my: 1 }} />
      <List
        sx={{ pr: 0.5 }}
      >
        {navigationItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ minHeight: 32 }}>
            <Tooltip title={(item.text === 'Results' || item.text === 'Moodle') ? 'Coming Soon' : item.text} placement="right" arrow disableInteractive={false}>
              <Box sx={{ flexGrow: 1, display: 'flex' }}>
            <ListItemButton 
              component={Link} 
              href={item.path}
                  disabled={(item.text === 'Results' || item.text === 'Moodle')}
              selected={router.pathname === item.path || router.pathname.startsWith(`${item.path}/`)}
              sx={{
                    borderRadius: 2,
                    mx: 1,
                    my: 0.5,
                    ...(item.text === 'Results' || item.text === 'Moodle' ? { color: 'text.disabled' } : {}),
                '&.Mui-selected': {
                      backgroundColor: 'primary.100',
                      color: 'primary.main',
                      fontWeight: 'bold',
                      '& .MuiListItemIcon-root': { color: 'primary.main' },
                    },
                  '&:hover': {
                      bgcolor: 'action.hover',
                },
              }}
            >
                  <ListItemIcon sx={{ minWidth: 40, color: (item.text === 'Results' || item.text === 'Moodle') ? 'text.disabled' : 'text.secondary' }}>
                {item.icon}
              </ListItemIcon>
                  <ListItemText primary={item.text} sx={{ '& .MuiListItemText-primary': { fontSize: 12, fontWeight: 'bold' } }} />
            </ListItemButton>
              </Box>
            </Tooltip>
          </ListItem>
        ))}
      </List>
      <Box sx={{ flexGrow: 1 }} />
      <Divider sx={{ my: 1 }} />
    </Box>
  );

  return (
    <>
      <Head>
        <title>ScorePAL - AI-Powered Grading</title>
        <meta name="viewport" content="minimum-scale=1, initial-scale=1, width=device-width" />
      </Head>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {shouldUseLayout ? (
          <Box sx={{ display: 'flex' }}>
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
                    borderRight: 'none',
                    boxShadow: 'none',
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
                marginTop: 0,
                borderRadius: theme.shape.borderRadius * 4,
                boxShadow: theme.shadows[1],
                ml: { md: 4 },
                mr: { md: 4 },
                mt: 4,
                mb: 4,
                p: 4,
              }}
            >
              <Component {...pageProps} />
            </Box>
          </Box>
        ) : (
          <Component {...pageProps} />
        )}
        <FloatingButtons />
      </ThemeProvider>
    </>
  );
} 