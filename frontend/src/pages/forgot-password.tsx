import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  Snackbar,
  Fade,
  Slide,
  InputAdornment,
} from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import Link from 'next/link';
import { useRouter } from 'next/router';
import EmailIcon from '@mui/icons-material/Email';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

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

// Styled Components
const ForgotPasswordContainer = styled(Box)(({ theme }) => ({
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

const ForgotPasswordCard = styled(Paper)(({ theme }) => ({
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
  borderRadius: 12,
  padding: theme.spacing(1.5, 4),
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  fontWeight: 600,
  fontSize: '1.1rem',
  textTransform: 'none',
  boxShadow: '0 8px 20px rgba(103, 126, 234, 0.4)',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 15px 35px rgba(103, 126, 234, 0.5)',
  },
  '&:active': {
    transform: 'translateY(0)',
  },
}));

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning',
  });

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
    setError('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Basic validation
      if (!email.trim()) {
        setError('Please enter your email address');
        setIsLoading(false);
        return;
      }

      if (!email.includes('@')) {
        setError('Please enter a valid email address');
        setIsLoading(false);
        return;
      }

      // API call to request password reset
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send reset email');
      }

      // Show success state
      setIsEmailSent(true);
      setNotification({
        open: true,
        message: 'Password reset instructions sent to your email!',
        severity: 'success',
      });
      
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email. Please try again.');
      setIsLoading(false);
    }
  };

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  const handleBackToLogin = () => {
    router.push('/login');
  };

  return (
    <ForgotPasswordContainer>
      <Fade in={true} timeout={1000}>
        <ForgotPasswordCard elevation={0}>
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
              {isEmailSent ? 'Check Your Email' : 'Reset Password'}
            </Typography>
            <Typography 
              variant="body1" 
              color="text.secondary"
              sx={{ fontSize: '1.1rem' }}
            >
              {isEmailSent 
                ? 'We\'ve sent password reset instructions to your email' 
                : 'Enter your email to receive reset instructions'
              }
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

          {/* Success Alert */}
          {isEmailSent && (
            <Slide direction="down" in={isEmailSent} mountOnEnter unmountOnExit>
              <Alert 
                severity="success" 
                sx={{ 
                  mb: 3, 
                  borderRadius: 2,
                }}
                icon={<CheckCircleIcon />}
              >
                <Typography variant="body2" fontWeight="600" gutterBottom>
                  Email sent successfully!
                </Typography>
                <Typography variant="body2">
                  Check your inbox and click the reset link. Don't forget to check your spam folder.
                </Typography>
              </Alert>
            </Slide>
          )}

          {/* Form or Success Content */}
          {!isEmailSent ? (
            <Box component="form" onSubmit={handleSubmit}>
              <Box sx={{ position: 'relative', mb: 4 }}>
                <StyledTextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={handleInputChange}
                  required
                  variant="outlined"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon sx={{ color: '#667eea' }} />
                      </InputAdornment>
                    ),
                  }}
                  placeholder="Enter your email address"
                />
              </Box>

              <GradientButton
                type="submit"
                fullWidth
                size="large"
                disabled={isLoading}
                endIcon={isLoading ? null : <SendIcon />}
                sx={{ mb: 4 }}
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
                    Sending Instructions...
                  </Box>
                ) : (
                  'Send Reset Instructions'
                )}
              </GradientButton>

              {/* Back to Login */}
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Remember your password?{' '}
                  <Button
                    component={Link}
                    href="/login"
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
                    Back to Login
                  </Button>
                </Typography>
              </Box>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center' }}>
              <GradientButton
                onClick={handleBackToLogin}
                size="large"
                endIcon={<ArrowForwardIcon />}
                sx={{ mb: 3 }}
              >
                Back to Login
              </GradientButton>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Didn't receive an email?{' '}
                <Button
                  onClick={() => {
                    setIsEmailSent(false);
                    setIsLoading(false);
                    setError('');
                  }}
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
                  Try again
                </Button>
              </Typography>
            </Box>
          )}

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
        </ForgotPasswordCard>
      </Fade>

      {/* Success/Error Notifications */}
      <Snackbar 
        open={notification.open} 
        autoHideDuration={5000} 
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
    </ForgotPasswordContainer>
  );
} 