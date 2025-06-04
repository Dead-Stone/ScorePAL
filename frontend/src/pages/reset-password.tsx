import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  Snackbar,
  Fade,
  Slide,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import Link from 'next/link';
import { useRouter } from 'next/router';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import LockIcon from '@mui/icons-material/Lock';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SecurityIcon from '@mui/icons-material/Security';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import ShieldIcon from '@mui/icons-material/Shield';

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
const ResetPasswordContainer = styled(Box)(({ theme }) => ({
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

const ResetPasswordCard = styled(Paper)(({ theme }) => ({
  borderRadius: 24,
  maxWidth: 1000,
  width: '100%',
  height: '650px',
  position: 'relative',
  zIndex: 1,
  background: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25), 0 0 100px rgba(255, 255, 255, 0.1)',
  animation: `${fadeInUp} 0.8s ease-out`,
  overflow: 'hidden',
  display: 'flex',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    padding: '2px',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.4), rgba(255,255,255,0.1))',
    mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    maskComposite: 'exclude',
    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    WebkitMaskComposite: 'xor',
  }
}));

const LeftPanel = styled(Box)(({ theme }) => ({
  flex: 1,
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  padding: theme.spacing(6),
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(circle at 20% 80%, rgba(255, 255, 255, 0.1), transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.05), transparent 50%)',
    pointerEvents: 'none',
  },
  [theme.breakpoints.down('md')]: {
    display: 'none',
  }
}));

const RightPanel = styled(Box)(({ theme }) => ({
  flex: 1,
  padding: theme.spacing(6),
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  position: 'relative',
  zIndex: 1,
  [theme.breakpoints.down('md')]: {
    padding: theme.spacing(4),
  }
}));

const LogoContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  marginBottom: theme.spacing(4),
  animation: `${float} 3s ease-in-out infinite`,
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    transition: 'all 0.3s ease',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderColor: 'rgba(103, 126, 234, 0.5)',
    },
    '&.Mui-focused': {
      backgroundColor: 'rgba(255, 255, 255, 1)',
      borderColor: '#667eea',
      boxShadow: '0 0 20px rgba(103, 126, 234, 0.3)',
    },
    '& fieldset': {
      border: 'none',
    },
  },
  '& .MuiInputLabel-root': {
    color: '#666',
    fontWeight: 500,
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

const FeatureBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  marginBottom: theme.spacing(3),
  animation: `${slideInLeft} 0.8s ease-out`,
  '&:nth-of-type(2)': {
    animationDelay: '0.2s',
    opacity: 0,
    animationFillMode: 'forwards',
  },
  '&:nth-of-type(3)': {
    animationDelay: '0.4s',
    opacity: 0,
    animationFillMode: 'forwards',
  },
  '&:nth-of-type(4)': {
    animationDelay: '0.6s',
    opacity: 0,
    animationFillMode: 'forwards',
  },
}));

export default function ResetPasswordPage() {
  const router = useRouter();
  const { token } = router.query;
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning',
  });

  // Validate token on component mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setIsTokenValid(false);
        setError('Invalid or missing reset token');
        return;
      }

      try {
        // Simulate token validation
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // For demo purposes, accept any token
        setIsTokenValid(true);
      } catch (error) {
        setIsTokenValid(false);
        setError('Invalid or expired reset token');
      }
    };

    if (router.isReady) {
      validateToken();
    }
  }, [token, router.isReady]);

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
      if (!formData.password) {
        setError('Please enter a new password');
        setIsLoading(false);
        return;
      }

      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters long');
        setIsLoading(false);
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        setIsLoading(false);
        return;
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // For demo purposes, always show success
      setIsSuccess(true);
      setNotification({
        open: true,
        message: 'Password reset successfully! You can now sign in with your new password.',
        severity: 'success',
      });
      
    } catch (err) {
      setError('Failed to reset password. Please try again.');
      setIsLoading(false);
    }
  };

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  const handleBackToLogin = () => {
    router.push('/login');
  };

  if (isTokenValid === null) {
    return (
      <ResetPasswordContainer>
        <Box sx={{ textAlign: 'center', color: 'white' }}>
          <Typography variant="h5" gutterBottom>
            Validating reset token...
          </Typography>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              border: '4px solid rgba(255,255,255,0.3)',
              borderTop: '4px solid white',
              animation: 'spin 1s linear infinite',
              '@keyframes spin': {
                '0%': { transform: 'rotate(0deg)' },
                '100%': { transform: 'rotate(360deg)' },
              },
              mx: 'auto',
              mt: 2,
            }}
          />
        </Box>
      </ResetPasswordContainer>
    );
  }

  if (isTokenValid === false) {
    return (
      <ResetPasswordContainer>
        <Fade in={true} timeout={1000}>
          <Paper sx={{ 
            p: 6, 
            textAlign: 'center', 
            borderRadius: 4,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            maxWidth: 500,
          }}>
            <Box sx={{ 
              display: 'inline-flex', 
              p: 3, 
              borderRadius: 4, 
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              mb: 3,
            }}>
              <VpnKeyIcon sx={{ fontSize: 48, color: 'white' }} />
            </Box>
            <Typography variant="h5" gutterBottom fontWeight="600">
              Invalid Reset Link
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              This password reset link is invalid or has expired. Please request a new one.
            </Typography>
            <Button
              component={Link}
              href="/forgot-password"
              variant="contained"
              size="large"
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                mr: 2,
              }}
            >
              Request New Link
            </Button>
            <Button
              component={Link}
              href="/login"
              variant="outlined"
              size="large"
              sx={{ borderColor: '#667eea', color: '#667eea' }}
            >
              Back to Login
            </Button>
          </Paper>
        </Fade>
      </ResetPasswordContainer>
    );
  }

  return (
    <ResetPasswordContainer>
      <Fade in={true} timeout={1000}>
        <ResetPasswordCard elevation={0}>
          {/* Left Panel - Info Section */}
          <LeftPanel>
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              {/* Logo and Title */}
              <LogoContainer>
                <Box
                  component="img"
                  src="/icons/scorepal_128x128.png"
                  alt="AI Grading Assistant Logo"
                  sx={{
                    width: 100,
                    height: 100,
                    borderRadius: 4,
                    boxShadow: '0 15px 40px rgba(0, 0, 0, 0.3)',
                  }}
                />
              </LogoContainer>

              <Typography 
                variant="h3" 
                component="h1" 
                fontWeight="800" 
                gutterBottom
                sx={{ 
                  textAlign: 'center',
                  mb: 2,
                  animation: `${slideInLeft} 0.8s ease-out 0.2s both`,
                }}
              >
                New Password
              </Typography>
              
              <Typography 
                variant="h6" 
                sx={{ 
                  textAlign: 'center',
                  mb: 6,
                  opacity: 0.9,
                  animation: `${slideInLeft} 0.8s ease-out 0.3s both`,
                }}
              >
                Create a strong, secure password for your account
              </Typography>

              {/* Features */}
              <FeatureBox>
                <Box sx={{ 
                  p: 1.5, 
                  borderRadius: 2, 
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                }}>
                  <SecurityIcon sx={{ fontSize: 32 }} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight="600" gutterBottom>
                    Secure & Encrypted
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Your password is encrypted with military-grade security
                  </Typography>
                </Box>
              </FeatureBox>

              <FeatureBox>
                <Box sx={{ 
                  p: 1.5, 
                  borderRadius: 2, 
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                }}>
                  <ShieldIcon sx={{ fontSize: 32 }} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight="600" gutterBottom>
                    Data Protection
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Your information is protected and never shared
                  </Typography>
                </Box>
              </FeatureBox>

              <FeatureBox>
                <Box sx={{ 
                  p: 1.5, 
                  borderRadius: 2, 
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                }}>
                  <VpnKeyIcon sx={{ fontSize: 32 }} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight="600" gutterBottom>
                    Instant Access
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Sign in immediately with your new password
                  </Typography>
                </Box>
              </FeatureBox>
            </Box>
          </LeftPanel>

          {/* Right Panel - Reset Form */}
          <RightPanel>
            {/* Mobile Logo (hidden on desktop) */}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'center', mb: 3 }}>
              <Box
                component="img"
                src="/icons/scorepal_128x128.png"
                alt="AI Grading Assistant Logo"
                sx={{
                  width: 60,
                  height: 60,
                  borderRadius: 2,
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
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
                  animation: `${slideInRight} 0.8s ease-out 0.3s both`,
                }}
              >
                {isSuccess ? 'Password Updated!' : 'Reset Password'}
              </Typography>
              <Typography 
                variant="body1" 
                color="text.secondary"
                sx={{ 
                  animation: `${slideInRight} 0.8s ease-out 0.4s both`,
                  opacity: 0,
                }}
              >
                {isSuccess 
                  ? 'Your password has been successfully updated' 
                  : 'Enter your new password below'
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
                    backgroundColor: 'rgba(244, 67, 54, 0.1)',
                    border: '1px solid rgba(244, 67, 54, 0.2)',
                  }}
                >
                  {error}
                </Alert>
              </Slide>
            )}

            {/* Success State */}
            {isSuccess && (
              <Slide direction="down" in={isSuccess} mountOnEnter unmountOnExit>
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                  <Box sx={{ 
                    display: 'inline-flex', 
                    p: 3, 
                    borderRadius: 4, 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    mb: 3,
                    boxShadow: '0 8px 20px rgba(102, 126, 234, 0.3)',
                  }}>
                    <CheckCircleIcon sx={{ fontSize: 48, color: 'white' }} />
                  </Box>
                  
                  <Typography variant="h6" gutterBottom fontWeight="600">
                    Password Successfully Updated!
                  </Typography>
                  
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.6 }}>
                    Your password has been changed. You can now sign in with your new password.
                  </Typography>

                  <GradientButton
                    onClick={handleBackToLogin}
                    size="large"
                    endIcon={<ArrowForwardIcon />}
                  >
                    Sign In Now
                  </GradientButton>
                </Box>
              </Slide>
            )}

            {/* Reset Form */}
            {!isSuccess && (
              <Box 
                component="form" 
                onSubmit={handleSubmit}
                sx={{ 
                  animation: `${slideInRight} 0.8s ease-out 0.5s both`,
                  opacity: 0,
                }}
              >
                <Box sx={{ position: 'relative', mb: 3 }}>
                  <StyledTextField
                    fullWidth
                    label="New Password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleInputChange('password')}
                    required
                    variant="outlined"
                    helperText="Minimum 6 characters"
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
                    placeholder="Enter new password"
                  />
                </Box>

                <Box sx={{ position: 'relative', mb: 4 }}>
                  <StyledTextField
                    fullWidth
                    label="Confirm New Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleInputChange('confirmPassword')}
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
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            edge="end"
                            sx={{ color: '#667eea' }}
                          >
                            {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    placeholder="Confirm new password"
                  />
                </Box>

                <GradientButton
                  type="submit"
                  fullWidth
                  size="large"
                  disabled={isLoading}
                  endIcon={isLoading ? null : <ArrowForwardIcon />}
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
                      Updating Password...
                    </Box>
                  ) : (
                    'Update Password'
                  )}
                </GradientButton>
              </Box>
            )}

            {/* Back to Login */}
            <Box sx={{ textAlign: 'center', mt: 4 }}>
              <Button
                component={Link}
                href="/login"
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
                ← Back to Login
              </Button>
            </Box>
          </RightPanel>
        </ResetPasswordCard>
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
    </ResetPasswordContainer>
  );
} 