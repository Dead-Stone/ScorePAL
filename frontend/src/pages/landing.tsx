import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Paper,
  Card,
  CardContent,
  Chip,
  Stack,
  AppBar,
  Toolbar,
  useMediaQuery,
  useTheme,
  Snackbar,
  Alert,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import Link from 'next/link';
import { useRouter } from 'next/router';
import SchoolIcon from '@mui/icons-material/School';
import SpeedIcon from '@mui/icons-material/Speed';
import SecurityIcon from '@mui/icons-material/Security';
import IntegrationInstructionsIcon from '@mui/icons-material/IntegrationInstructions';
import GroupIcon from '@mui/icons-material/Group';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const GradientSection = styled(Box)(({ theme }) => ({
  background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
  color: 'white',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(circle at 20% 80%, rgba(37, 99, 235, 0.3), transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1), transparent 50%)',
    pointerEvents: 'none',
  }
}));

const FeatureCard = styled(Card)(({ theme }) => ({
  height: '100%',
  background: '#ffffff',
  border: '1px solid #d1d5db',
  borderRadius: 20,
  transition: 'all 0.3s ease-in-out',
  cursor: 'pointer',
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
    border: '1px solid #2563eb',
  },
}));

const PricingCard = styled(Card)(({ theme }) => ({
  height: '100%',
  borderRadius: 20,
  border: '2px solid #d1d5db',
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
    border: '2px solid #2563eb',
  },
}));

const StatCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  textAlign: 'center',
  borderRadius: 16,
  background: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
}));

export default function LandingPage() {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning',
  });

  const handleGetStarted = () => {
    setNotification({
      open: true,
      message: 'Starting your free trial! Redirecting to registration...',
      severity: 'success',
    });
    setTimeout(() => {
      router.push('/register');
    }, 1000);
  };

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  const features = [
    {
      icon: <AutoAwesomeIcon sx={{ fontSize: 48, color: '#2563eb' }} />,
      title: 'AI-Powered Grading',
      description: 'Advanced machine learning algorithms provide consistent, objective, and detailed grading for all assignment types.',
    },
    {
      icon: <SpeedIcon sx={{ fontSize: 48, color: '#1e40af' }} />,
      title: 'Lightning Fast',
      description: 'Grade hundreds of assignments in minutes, not hours. Reduce grading time by up to 90%.',
    },
    {
      icon: <SchoolIcon sx={{ fontSize: 48, color: '#2563eb' }} />,
      title: 'LMS Integration',
      description: 'Seamlessly integrates with Canvas, Blackboard, Moodle, and other popular learning management systems.',
    },
    {
      icon: <SecurityIcon sx={{ fontSize: 48, color: '#1e40af' }} />,
      title: 'Secure & Private',
      description: 'Enterprise-grade security ensures your student data remains private and protected at all times.',
    },
    {
      icon: <IntegrationInstructionsIcon sx={{ fontSize: 48, color: '#2563eb' }} />,
      title: 'Custom Rubrics',
      description: 'Create detailed custom rubrics or use our AI-generated rubrics tailored to your specific requirements.',
    },
    {
      icon: <GroupIcon sx={{ fontSize: 48, color: '#1e40af' }} />,
      title: 'Collaboration Tools',
      description: 'Work with teaching assistants and fellow educators. Share rubrics and maintain consistency across courses.',
    },
  ];

  const stats = [
    { number: '50,000+', label: 'Assignments Graded' },
    { number: '1,200+', label: 'Happy Educators' },
    { number: '90%', label: 'Time Saved' },
    { number: '99.9%', label: 'Uptime' },
  ];

  return (
    <>
      {/* Navigation Bar */}
      <AppBar 
        position="fixed" 
        sx={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        }}
      >
        <Container maxWidth="lg">
          <Toolbar sx={{ px: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
              <Box
                component="img"
                src="/icons/scorepal_48x48.png"
                alt="ScorePAL Logo"
                sx={{ width: 36, height: 36, borderRadius: 2 }}
              />
              <Typography 
                variant="h6" 
                component="div" 
                fontWeight="800"
                sx={{ 
                  background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                  backgroundClip: 'text',
                  textFillColor: 'transparent',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontSize: '1.5rem',
                }}
              >
                ScorePAL
              </Typography>
            </Box>
            
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                component={Link}
                href="/pricing"
                color="inherit"
                sx={{ 
                  color: '#374151', 
                  fontWeight: 500,
                  px: 3,
                  py: 1,
                  borderRadius: 2,
                  '&:hover': {
                    backgroundColor: '#f9fafb',
                  }
                }}
              >
                Pricing
              </Button>
              <Button
                component={Link}
                href="/login"
                variant="outlined"
                sx={{ 
                  borderColor: '#d1d5db',
                  color: '#374151',
                  fontWeight: 500,
                  px: 3,
                  py: 1,
                  borderRadius: 2,
                  '&:hover': {
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.04)',
                  }
                }}
              >
                Sign In
              </Button>
              <Button
                component={Link}
                href="/register"
                variant="contained"
                sx={{ 
                  background: '#2563eb',
                  fontWeight: 600,
                  px: 4,
                  py: 1,
                  borderRadius: 2,
                  boxShadow: 'none',
                  '&:hover': {
                    background: '#1e40af',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
                  }
                }}
              >
                Get Started
              </Button>
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Hero Section */}
      <Box sx={{ pt: 12, pb: 16, background: '#ffffff' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', maxWidth: '900px', mx: 'auto' }}>
            <Chip 
              label="🚀 New: Batch Grading Available" 
              sx={{ 
                mb: 4,
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                color: '#2563eb',
                fontWeight: 600,
                border: '1px solid rgba(37, 99, 235, 0.2)',
                fontSize: '0.9rem',
                px: 2,
                py: 0.5,
              }} 
            />
            <Typography 
              variant="h1" 
              component="h1" 
              fontWeight="900" 
              sx={{ 
                mb: 3,
                fontSize: { xs: '2.5rem', md: '4rem' },
                lineHeight: 1.1,
                color: '#000000',
                letterSpacing: '-0.02em',
              }}
            >
              Grade Smarter,{' '}
              <Box 
                component="span" 
                sx={{ 
                  background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                  backgroundClip: 'text',
                  textFillColor: 'transparent',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Not Harder
              </Box>
            </Typography>
            <Typography 
              variant="h5" 
              sx={{ 
                mb: 6, 
                color: '#374151', 
                lineHeight: 1.6,
                fontSize: { xs: '1.25rem', md: '1.5rem' },
                fontWeight: 400,
                maxWidth: '700px',
                mx: 'auto',
              }}
            >
              Transform your grading workflow with AI-powered assessment tools. 
              Grade assignments 10x faster while maintaining consistency and providing detailed feedback.
            </Typography>
                
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent="center" sx={{ mb: 8 }}>
              <Button
                onClick={handleGetStarted}
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon />}
                sx={{ 
                  background: '#2563eb',
                  color: 'white',
                  fontWeight: 600,
                  px: 6,
                  py: 2,
                  fontSize: '1.1rem',
                  borderRadius: 2,
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
                  '&:hover': {
                    background: '#1e40af',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 25px rgba(37, 99, 235, 0.5)',
                  }
                }}
              >
                Start Free Trial
              </Button>
              <Button
                component={Link}
                href="/pricing"
                variant="outlined"
                size="large"
                sx={{ 
                  borderColor: '#d1d5db',
                  color: '#374151',
                  fontWeight: 600,
                  px: 6,
                  py: 2,
                  fontSize: '1.1rem',
                  borderRadius: 2,
                  '&:hover': {
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.04)',
                  }
                }}
              >
                View Pricing
              </Button>
            </Stack>

            {/* Stats Row */}
            <Grid container spacing={4} justifyContent="center" sx={{ maxWidth: '600px', mx: 'auto' }}>
              {stats.map((stat, index) => (
                <Grid item xs={6} md={3} key={index}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" fontWeight="800" sx={{ color: '#2563eb', mb: 1 }}>
                      {stat.number}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#374151', fontWeight: 500 }}>
                      {stat.label}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Box sx={{ py: 16, backgroundColor: '#f9fafb' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 12 }}>
            <Typography variant="h2" component="h2" fontWeight="800" gutterBottom sx={{ color: '#000000', mb: 3 }}>
              Why Educators Choose ScorePAL
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: '600px', mx: 'auto', fontSize: '1.25rem' }}>
              Powerful AI-driven features designed to streamline your grading process and improve student outcomes
            </Typography>
          </Box>

          <Grid container spacing={6}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={4} key={index}>
                <FeatureCard>
                  <CardContent sx={{ p: 5, textAlign: 'center' }}>
                    <Box sx={{ mb: 3 }}>{feature.icon}</Box>
                    <Typography variant="h5" fontWeight="700" gutterBottom sx={{ color: '#000000', mb: 2 }}>
                      {feature.title}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7, fontSize: '1.1rem' }}>
                      {feature.description}
                    </Typography>
                  </CardContent>
                </FeatureCard>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Pricing Preview Section */}
      <Box sx={{ py: 16, backgroundColor: '#ffffff' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 12 }}>
            <Typography variant="h2" component="h2" fontWeight="800" gutterBottom sx={{ color: '#000000', mb: 3 }}>
              Simple, Transparent Pricing
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ fontSize: '1.25rem' }}>
              Start free, upgrade when you need advanced features
            </Typography>
          </Box>

          <Grid container spacing={6} justifyContent="center">
            <Grid item xs={12} md={4}>
              <PricingCard>
                <CardContent sx={{ p: 5, textAlign: 'center' }}>
                  <Typography variant="h5" fontWeight="700" gutterBottom>
                    Free
                  </Typography>
                  <Typography variant="h2" fontWeight="800" color="primary" sx={{ mb: 1 }}>
                    $0
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                    per month
                  </Typography>
                  
                  <Stack spacing={3} sx={{ mb: 6 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <CheckCircleIcon sx={{ color: '#2563eb', fontSize: 20 }} />
                      <Typography variant="body1">5 assignments per month</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <CheckCircleIcon sx={{ color: '#2563eb', fontSize: 20 }} />
                      <Typography variant="body1">Basic AI grading</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <CheckCircleIcon sx={{ color: '#2563eb', fontSize: 20 }} />
                      <Typography variant="body1">Standard rubrics</Typography>
                    </Box>
                  </Stack>
                  
                  <Button
                    component={Link}
                    href="/register"
                    variant="outlined"
                    fullWidth
                    size="large"
                    sx={{ py: 1.5, fontWeight: 600 }}
                  >
                    Get Started
                  </Button>
                </CardContent>
              </PricingCard>
            </Grid>

            <Grid item xs={12} md={4}>
              <PricingCard sx={{ border: '2px solid #2563eb', position: 'relative' }}>
                <Chip 
                  label="Most Popular" 
                  sx={{ 
                    position: 'absolute',
                    top: -12,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    fontWeight: 600,
                  }} 
                />
                <CardContent sx={{ p: 5, textAlign: 'center' }}>
                  <Typography variant="h5" fontWeight="700" gutterBottom>
                    Batch Grading
                  </Typography>
                  <Typography variant="h2" fontWeight="800" color="primary" sx={{ mb: 1 }}>
                    $10
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                    per batch (up to 100 assignments)
                  </Typography>
                  
                  <Stack spacing={3} sx={{ mb: 6 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <CheckCircleIcon sx={{ color: '#2563eb', fontSize: 20 }} />
                      <Typography variant="body1">Up to 100 assignments</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <CheckCircleIcon sx={{ color: '#2563eb', fontSize: 20 }} />
                      <Typography variant="body1">Advanced AI grading</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <CheckCircleIcon sx={{ color: '#2563eb', fontSize: 20 }} />
                      <Typography variant="body1">Custom rubrics</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <CheckCircleIcon sx={{ color: '#2563eb', fontSize: 20 }} />
                      <Typography variant="body1">LMS integration</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <CheckCircleIcon sx={{ color: '#2563eb', fontSize: 20 }} />
                      <Typography variant="body1">Priority support</Typography>
                    </Box>
                  </Stack>
                  
                  <Button
                    component={Link}
                    href="/pricing"
                    variant="contained"
                    fullWidth
                    size="large"
                    sx={{ 
                      background: '#2563eb',
                      fontWeight: 600,
                      py: 1.5,
                      '&:hover': {
                        background: '#1e40af',
                      }
                    }}
                  >
                    Choose Plan
                  </Button>
                </CardContent>
              </PricingCard>
            </Grid>
          </Grid>

          <Box sx={{ textAlign: 'center', mt: 8 }}>
            <Button
              component={Link}
              href="/pricing"
              variant="text"
              size="large"
              endIcon={<ArrowForwardIcon />}
              sx={{ fontWeight: 600, fontSize: '1.1rem' }}
            >
              View All Pricing Options
            </Button>
          </Box>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box sx={{ py: 16, background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)', color: 'white' }}>
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography variant="h2" component="h2" fontWeight="800" gutterBottom sx={{ mb: 3 }}>
            Ready to Transform Your Grading?
          </Typography>
          <Typography variant="h6" sx={{ mb: 6, opacity: 0.9, fontSize: '1.25rem' }}>
            Join thousands of educators who have revolutionized their grading workflow with ScorePAL
          </Typography>
          <Button
            onClick={handleGetStarted}
            variant="contained"
            size="large"
            endIcon={<ArrowForwardIcon />}
            sx={{ 
              backgroundColor: 'white',
              color: '#2563eb',
              fontWeight: 700,
              px: 8,
              py: 2,
              fontSize: '1.2rem',
              borderRadius: 2,
              '&:hover': {
                backgroundColor: '#f9fafb',
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 25px rgba(255, 255, 255, 0.3)',
              }
            }}
          >
            Start Your Free Trial
          </Button>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ backgroundColor: '#000000', color: 'white', py: 12 }}>
        <Container maxWidth="lg">
          <Grid container spacing={6}>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Box
                  component="img"
                  src="/icons/scorepal_48x48.png"
                  alt="ScorePAL Logo"
                  sx={{ width: 32, height: 32 }}
                />
                <Typography variant="h6" fontWeight="700">
                  ScorePAL
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ opacity: 0.8, lineHeight: 1.7 }}>
                AI-powered grading solutions for modern educators. 
                Save time, improve consistency, and enhance student learning outcomes.
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Grid container spacing={4}>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                    Product
                  </Typography>
                  <Stack spacing={2}>
                    <Button component={Link} href="/pricing" color="inherit" size="small" sx={{ justifyContent: 'flex-start', p: 0 }}>
                      Pricing
                    </Button>
                    <Button component={Link} href="/login" color="inherit" size="small" sx={{ justifyContent: 'flex-start', p: 0 }}>
                      Sign In
                    </Button>
                  </Stack>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                    Support
                  </Typography>
                  <Stack spacing={2}>
                    <Button href="https://github.com/Dead-Stone/ScorePAL" target="_blank" color="inherit" size="small" sx={{ justifyContent: 'flex-start', p: 0 }}>
                      GitHub
                    </Button>
                    <Button component={Link} href="/help" color="inherit" size="small" sx={{ justifyContent: 'flex-start', p: 0 }}>
                      Help
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
          
          <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', mt: 8, pt: 8, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ opacity: 0.6 }}>
              © 2024 ScorePAL. All rights reserved.
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Notifications */}
      <Snackbar 
        open={notification.open} 
        autoHideDuration={3000} 
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ borderRadius: 2 }}>
          {notification.message}
        </Alert>
      </Snackbar>
    </>
  );
} 