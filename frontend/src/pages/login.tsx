import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  Stack,
  Divider,
  IconButton,
  InputAdornment,
  Snackbar,
  Fade,
  Slide,
  Grid,
} from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import Link from 'next/link';
import { useRouter } from 'next/router';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SpeedIcon from '@mui/icons-material/Speed';
import SecurityIcon from '@mui/icons-material/Security';
import SchoolIcon from '@mui/icons-material/School';
import SocialLogin from '../components/SocialLogin';

// Animations
const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const slideInLeft = keyframes`
  from {
    opacity: 0;
    transform: translateX(-50px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const slideInRight = keyframes`
  from {
    opacity: 0;
    transform: translateX(50px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const float = keyframes`
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
`;

// Styled Components
const LoginContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(2),
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
    pointerEvents: 'none',
  }
}));

const LoginCard = styled(Paper)(({ theme }) => ({
  borderRadius: 24,
  maxWidth: 450,
  width: '100%',
  padding: theme.spacing(5),
  background: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
  animation: `${fadeInUp} 0.8s ease-out`,
  position: 'relative',
  zIndex: 1,
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(3),
    margin: theme.spacing(1),
    maxWidth: '95vw',
  },
}));



const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    transition: 'all 0.3s ease',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: 'rgba(103, 126, 234, 0.5)',
      },
    },
    '&.Mui-focused': {
      backgroundColor: 'rgba(255, 255, 255, 1)',
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: '#667eea',
        borderWidth: 2,
      },
    },
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: '#667eea',
  },
}));

const GradientButton = styled(Button)(({ theme }) => ({
  borderRadius: 16,
  padding: theme.spacing(1.5, 4),
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  fontWeight: 600,
  fontSize: '1.1rem',
  textTransform: 'none',
  boxShadow: '0 8px 20px rgba(103, 126, 234, 0.4)',
  border: 'none',
  position: 'relative',
  overflow: 'hidden',
  transition: 'all 0.3s ease',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '100%',
    height: '100%',
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
    transition: 'left 0.5s',
  },
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 15px 35px rgba(103, 126, 234, 0.5)',
    '&::before': {
      left: '100%',
    },
  },
  '&:active': {
    transform: 'translateY(0)',
  },
}));

const SocialButton = styled(Button)(({ theme }) => ({
  borderRadius: 12,
  padding: theme.spacing(1.2, 2),
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  border: '1px solid rgba(0, 0, 0, 0.1)',
  color: '#333',
  fontWeight: 500,
  textTransform: 'none',
  transition: 'all 0.3s ease',
  backdropFilter: 'blur(10px)',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 1)',
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.15)',
  },
}));



export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning',
  });

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    setError('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Basic validation
      if (!formData.email) {
        setError('Please enter your email address');
        setIsLoading(false);
        return;
      }
      
      if (!formData.password) {
        setError('Please enter your password');
        setIsLoading(false);
        return;
      }

      if (!formData.email.includes('@')) {
        setError('Please enter a valid email address');
        setIsLoading(false);
        return;
      }

      // API call to login user
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const userData = await response.json();

      // Store user session
      localStorage.setItem('scorepal_user', JSON.stringify(userData));
      
      // Show success message before redirect
      setNotification({
        open: true,
        message: `Welcome back, ${userData.firstName || userData.name}! Redirecting to dashboard...`,
        severity: 'success',
      });

      // Redirect to home after a brief delay
      setTimeout(() => {
        router.push('/');
      }, 1500);
      
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
      setIsLoading(false);
    }
  };



  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  return (
    <LoginContainer>
      <Fade in={true} timeout={1000}>
        <LoginCard elevation={0}>
          {/* Logo */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              component="img"
              src="/icons/scorepal_128x128.png"
              alt="ScorePAL Logo"
              sx={{
                width: 80,
                height: 80,
                borderRadius: 3,
                boxShadow: '0 15px 40px rgba(0, 0, 0, 0.2)',
                mb: 2,
              }}
            />
          </Box>

          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography 
              variant="h4" 
              component="h1" 
              fontWeight="700" 
              gutterBottom
              sx={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundClip: 'text',
                textFillColor: 'transparent',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Welcome Back
            </Typography>
            <Typography 
              variant="body1" 
              color="text.secondary"
              sx={{ fontSize: '1.1rem' }}
            >
              Sign in to continue your AI grading journey
            </Typography>
          </Box>

          {/* Error Alert */}
          {error && (
            <Slide direction="down" in={!!error} mountOnEnter unmountOnExit>
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 3, 
                  borderRadius: 2,
                }}
              >
                {error}
              </Alert>
            </Slide>
          )}

          {/* Login Form */}
          <Box component="form" onSubmit={handleSubmit}>
            <Box sx={{ position: 'relative', mb: 3 }}>
              <StyledTextField
                fullWidth
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={handleInputChange('email')}
                required
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon sx={{ color: '#667eea' }} />
                    </InputAdornment>
                  ),
                }}
                placeholder="Enter your email"
              />
            </Box>

            <Box sx={{ position: 'relative', mb: 4 }}>
              <StyledTextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange('password')}
                required
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: '#667eea' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        sx={{ color: '#667eea' }}
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                placeholder="Enter your password"
              />
            </Box>

            <GradientButton
              type="submit"
              fullWidth
              size="large"
              disabled={isLoading}
              endIcon={isLoading ? null : <ArrowForwardIcon />}
              sx={{ mb: 3 }}
            >
              {isLoading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTop: '2px solid white',
                      animation: 'spin 1s linear infinite',
                      '@keyframes spin': {
                        '0%': { transform: 'rotate(0deg)' },
                        '100%': { transform: 'rotate(360deg)' },
                      },
                    }}
                  />
                  Signing In...
                </Box>
              ) : (
                'Sign In'
              )}
            </GradientButton>

            {/* Forgot Password */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Button
                component={Link}
                href="/forgot-password"
                variant="text"
                size="small"
                sx={{ 
                  color: '#667eea', 
                  fontWeight: 500,
                  textTransform: 'none',
                  '&:hover': {
                    backgroundColor: 'rgba(103, 126, 234, 0.1)',
                  }
                }}
              >
                Forgot your password?
              </Button>
            </Box>

            {/* Divider */}
            <Divider sx={{ my: 3, position: 'relative' }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  padding: '0 16px',
                  color: '#666',
                  fontWeight: 500,
                }}
              >
                Or continue with
              </Typography>
            </Divider>

            {/* Social Login */}
            <Box sx={{ mb: 4 }}>
              <SocialLogin isRegistration={false} />
            </Box>

            {/* Sign Up Link */}
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Don't have an account?{' '}
                <Button
                  component={Link}
                  href="/register"
                  variant="text"
                  sx={{
                    color: '#667eea',
                    fontWeight: 600,
                    textTransform: 'none',
                    p: 0,
                    minWidth: 'auto',
                    '&:hover': {
                      backgroundColor: 'transparent',
                      textDecoration: 'underline',
                    }
                  }}
                >
                  Sign up here
                </Button>
              </Typography>
            </Box>

            {/* Back to Home */}
            <Box sx={{ textAlign: 'center' }}>
              <Button
                component={Link}
                href="/"
                variant="text"
                size="small"
                sx={{ 
                  color: '#667eea', 
                  fontWeight: 500,
                  textTransform: 'none',
                  '&:hover': {
                    backgroundColor: 'rgba(103, 126, 234, 0.1)',
                  }
                }}
              >
                ← Back to Home
              </Button>
            </Box>
          </Box>
        </LoginCard>
      </Fade>

      {/* Success/Error Notifications */}
      <Snackbar 
        open={notification.open} 
        autoHideDuration={4000} 
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity} 
          sx={{ 
            borderRadius: 2,
            backdropFilter: 'blur(10px)',
          }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </LoginContainer>
  );
} 