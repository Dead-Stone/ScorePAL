/**
 * ScorePAL - AI-Powered Academic Grading Assistant
 * Main Application Layout & Theme Configuration
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 * @repository https://github.com/Dead-Stone/ScorePAL
 */

import React, { Suspense } from 'react';
import Head from 'next/head';
import { AppProps } from 'next/app';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import dynamic from 'next/dynamic';
import '../styles/globals.css';
import { AuthProvider } from '../contexts/AuthContext';
import {
  Box,
  Button,
} from '@mui/material';
import Link from 'next/link';
import GitHubIcon from '@mui/icons-material/GitHub';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';

// Create a theme instance with brand colors
const theme = createTheme({
  palette: {
    primary: {
      main: '#1D80C3', // ScorePAL brand blue
      light: '#4F9DD6',
      dark: '#1565A0',
      contrastText: '#fff',
    },
    secondary: {
      main: '#4F46E5', // ScorePAL brand indigo
      light: '#6366F1',
      dark: '#4338CA',
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



function AppContent({ Component, pageProps }: AppProps) {
  const router = useRouter();
  
  // Enable instant prefetching for smooth transitions
  React.useEffect(() => {
    // Prefetch all routes on mount for instant navigation
    const prefetchRoutes = [
      '/dashboard',
      '/grade',
      '/settings',
      '/profile',
      '/results',
      '/help',
      '/auth/login',
      '/auth/register',
    ];
    
    prefetchRoutes.forEach((route) => {
      router.prefetch(route).catch(() => {
        // Silently fail - prefetching is optional
      });
    });
  }, [router]);



  // Pages that should not use the layout (like auth pages and landing)
  const noLayoutPaths = ['/landing', '/auth/login', '/auth/register', '/auth/forgot-password', '/', '/demo'];
  const shouldUseLayout = !noLayoutPaths.includes(router.pathname);

  const FloatingButtons = () => (
    <Box sx={{
      position: 'fixed',
      top: 16,
      right: 16,
      zIndex: 9998, // Below nav but above other content
      display: 'flex',
      gap: 1,
    }}>
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


  return (
    <>
      <Head>
        <title>ScorePAL - AI-Powered Grading</title>
        <meta name="viewport" content="minimum-scale=1, initial-scale=1, width=device-width" />
        <link rel="icon" type="image/svg+xml" href="/scorepal-logo-icon-only.svg" />
        <link rel="alternate icon" href="/scorepal-logo-icon-only.svg" />
      </Head>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {shouldUseLayout ? (
          <Box
            component="main"
            sx={{
              width: '100%',
              minHeight: '100vh',
              backgroundColor: 'background.default',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Suspense fallback={null}>
              <Component {...pageProps} />
            </Suspense>
          </Box>
        ) : (
          <Suspense fallback={null}>
            <Component {...pageProps} />
          </Suspense>
        )}
        <FloatingButtons />
      </ThemeProvider>
    </>
  );
}

export default function MyApp(props: AppProps) {
  return (
    <AuthProvider>
      <AppContent {...props} />
    </AuthProvider>
  );
} 