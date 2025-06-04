import React, { useState } from 'react';
import { 
  Button, 
  Stack, 
  Snackbar, 
  Alert, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  LinearProgress,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import GoogleIcon from '@mui/icons-material/Google';
import GitHubIcon from '@mui/icons-material/GitHub';
import { useRouter } from 'next/router';

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
  '&.google': {
    '&:hover': {
      borderColor: '#4285f4',
      backgroundColor: 'rgba(66, 133, 244, 0.05)',
    }
  },
  '&.github': {
    '&:hover': {
      borderColor: '#333',
      backgroundColor: 'rgba(51, 51, 51, 0.05)',
    }
  }
}));

const GradientButton = styled(Button)(({ theme }) => ({
  borderRadius: 12,
  padding: theme.spacing(1.2, 2),
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  fontWeight: 600,
  textTransform: 'none',
  border: 'none',
  '&:hover': {
    background: 'linear-gradient(135deg, #5a6fde 0%, #6a4190 100%)',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
  },
}));

interface SocialLoginProps {
  isRegistration?: boolean;
}

export default function SocialLogin({ isRegistration = false }: SocialLoginProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [showPermissions, setShowPermissions] = useState<{
    open: boolean;
    provider: string;
    permissions: string[];
  }>({
    open: false,
    provider: '',
    permissions: [],
  });
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning',
  });

  const googlePermissions = [
    'Access your basic profile information (name, email)',
    'View your email address',
    'View your profile picture',
  ];

  const githubPermissions = [
    'Access your basic profile information (name, username)',
    'View your email addresses',
    'View your profile picture',
    'Access public repository information',
  ];

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    try {
      setIsLoading(provider);
      
      // Show permissions dialog first
      setShowPermissions({
        open: true,
        provider: provider,
        permissions: provider === 'google' ? googlePermissions : githubPermissions,
      });
      
    } catch (error) {
      setNotification({
        open: true,
        message: `Failed to connect with ${provider}. Please try again.`,
        severity: 'error',
      });
    } finally {
      setIsLoading(null);
    }
  };

  const confirmSocialLogin = async (provider: string) => {
    try {
      setShowPermissions({ open: false, provider: '', permissions: [] });
      setIsLoading(provider);
      
      // Simulate OAuth flow
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create mock user data based on provider
      const userData = {
        email: provider === 'google' ? 'user@gmail.com' : 'user@github.com',
        name: provider === 'google' ? 'Google User' : 'GitHub User',
        avatar: provider === 'google' 
          ? 'https://lh3.googleusercontent.com/a/default-user=s96-c' 
          : 'https://github.com/identicons/user.png',
        provider: provider,
        loginTime: new Date().toISOString(),
        isAuthenticated: true,
      };

      // Store user session
      localStorage.setItem('scorepal_user', JSON.stringify(userData));
      
      // Show success message
      setNotification({
        open: true,
        message: `Successfully ${isRegistration ? 'registered' : 'signed in'} with ${provider}!`,
        severity: 'success',
      });

      // Redirect to home after a brief delay
      setTimeout(() => {
        router.push('/');
      }, 1500);
      
    } catch (error) {
      setNotification({
        open: true,
        message: `${provider} authentication failed. Please try again.`,
        severity: 'error',
      });
    } finally {
      setIsLoading(null);
    }
  };

  const handleClosePermissions = () => {
    setShowPermissions({ open: false, provider: '', permissions: [] });
    setIsLoading(null);
  };

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  return (
    <>
      <Stack direction="row" spacing={2}>
        <SocialButton
          fullWidth
          startIcon={<GoogleIcon />}
          onClick={() => handleSocialLogin('google')}
          disabled={!!isLoading}
          className="google"
        >
          {isLoading === 'google' ? 'Connecting...' : 'Google'}
        </SocialButton>
        <SocialButton
          fullWidth
          startIcon={<GitHubIcon />}
          onClick={() => handleSocialLogin('github')}
          disabled={!!isLoading}
          className="github"
        >
          {isLoading === 'github' ? 'Connecting...' : 'GitHub'}
        </SocialButton>
      </Stack>

      {/* Permissions Dialog */}
      <Dialog 
        open={showPermissions.open} 
        onClose={handleClosePermissions}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
          }
        }}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          textAlign: 'center',
          fontWeight: 600,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            {showPermissions.provider === 'google' ? <GoogleIcon /> : <GitHubIcon />}
            Connect with {showPermissions.provider}
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="body1" gutterBottom>
            ScorePAL AI Grading Assistant will be able to:
          </Typography>
          
          <Box component="ul" sx={{ pl: 2, mt: 2 }}>
            {showPermissions.permissions.map((permission, index) => (
              <Typography component="li" variant="body2" key={index} sx={{ mb: 1, color: '#4a5568' }}>
                {permission}
              </Typography>
            ))}
          </Box>
          
          <Box sx={{ 
            mt: 3, 
            p: 2, 
            backgroundColor: 'rgba(102, 126, 234, 0.05)',
            borderRadius: 2,
            border: '1px solid rgba(102, 126, 234, 0.1)',
          }}>
            <Typography variant="body2" sx={{ fontSize: '0.875rem', color: '#4a5568' }}>
              <strong>Privacy Notice:</strong> We never store your {showPermissions.provider} password. 
              Your data is encrypted and you can revoke access at any time.
            </Typography>
          </Box>

          {isLoading && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress 
                sx={{ 
                  borderRadius: 1,
                  height: 6,
                  '& .MuiLinearProgress-bar': {
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  }
                }} 
              />
              <Typography variant="body2" sx={{ mt: 1, textAlign: 'center', color: '#4a5568' }}>
                Connecting to {showPermissions.provider}...
              </Typography>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={handleClosePermissions}
            variant="outlined"
            sx={{ 
              borderColor: '#d1d5db',
              color: '#4a5568',
              '&:hover': {
                borderColor: '#9ca3af',
                backgroundColor: '#f9fafb',
              }
            }}
          >
            Cancel
          </Button>
          <GradientButton
            onClick={() => confirmSocialLogin(showPermissions.provider)}
            disabled={!!isLoading}
            sx={{ ml: 1 }}
          >
            {isLoading ? 'Connecting...' : `Continue with ${showPermissions.provider}`}
          </GradientButton>
        </DialogActions>
      </Dialog>

      {/* Notifications */}
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
    </>
  );
} 