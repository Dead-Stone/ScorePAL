import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Stack,
  AppBar,
  Toolbar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Switch,
  FormControlLabel,
  Divider,
  Paper,
  Snackbar,
  Alert,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import Link from 'next/link';
import { useRouter } from 'next/router';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import StarIcon from '@mui/icons-material/Star';
import SchoolIcon from '@mui/icons-material/School';
import BusinessIcon from '@mui/icons-material/Business';
import PersonIcon from '@mui/icons-material/Person';
import SupportIcon from '@mui/icons-material/Support';

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

const PricingCard = styled(Card)<{ featured?: boolean }>(({ theme, featured }) => ({
  height: '100%',
  borderRadius: 24,
  border: featured ? '3px solid #2563eb' : '2px solid #e2e8f0',
  position: 'relative',
  transition: 'all 0.3s ease-in-out',
  background: featured ? 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)' : '#ffffff',
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
    border: featured ? '3px solid #1d4ed8' : '2px solid #2563eb',
  },
}));

const FeatureComparisonCard = styled(Paper)(({ theme }) => ({
  borderRadius: 20,
  overflow: 'hidden',
  border: '1px solid #e2e8f0',
}));

export default function PricingPage() {
  const router = useRouter();
  const [isAnnual, setIsAnnual] = useState(false);

  const plans = [
    {
      name: 'Free Trial',
      icon: <PersonIcon sx={{ fontSize: 40, color: '#2563eb' }} />,
      price: 0,
      originalPrice: null,
      period: 'forever',
      description: 'Perfect for trying out ScorePAL',
      features: [
        '5 assignments per month',
        'Basic AI grading',
        'Standard rubrics',
        'Email support',
        'Basic analytics',
      ],
      limitations: [
        'No custom rubrics',
        'No batch grading',
        'No LMS integration',
        'No priority support',
      ],
      buttonText: 'Start Free Trial',
      buttonVariant: 'outlined' as const,
      popular: false,
    },
    {
      name: 'Batch Grading',
      icon: <SchoolIcon sx={{ fontSize: 40, color: '#2563eb' }} />,
      price: 10,
      originalPrice: null,
      period: 'per batch (up to 100)',
      description: 'Most popular for educators',
      features: [
        'Up to 100 assignments per batch',
        'Advanced AI grading',
        'Custom rubrics',
        'LMS integration (Canvas, Blackboard)',
        'Detailed analytics',
        'Priority email support',
        'Batch export to CSV/Excel',
        'Grade posting automation',
      ],
      limitations: [],
      buttonText: 'Choose Batch Plan',
      buttonVariant: 'contained' as const,
      popular: true,
    },
    {
      name: 'Institution',
      icon: <BusinessIcon sx={{ fontSize: 40, color: '#1e40af' }} />,
      price: 299,
      originalPrice: isAnnual ? 399 : null,
      period: isAnnual ? 'per year' : 'per month',
      description: 'For universities and large institutions',
      features: [
        'Unlimited assignments',
        'Advanced AI grading with custom models',
        'Unlimited custom rubrics',
        'All LMS integrations',
        'Advanced analytics & reporting',
        'Dedicated account manager',
        'Phone & chat support',
        'SSO integration',
        'API access',
        'White-label option',
        'Training & onboarding',
      ],
      limitations: [],
      buttonText: 'Contact Sales',
      buttonVariant: 'outlined' as const,
      popular: false,
    },
  ];

  const featureComparison = [
    { feature: 'Assignments per month', free: '5', batch: '100 per batch', institution: 'Unlimited' },
    { feature: 'AI Grading Quality', free: 'Basic', batch: 'Advanced', institution: 'Premium + Custom' },
    { feature: 'Custom Rubrics', free: false, batch: true, institution: true },
    { feature: 'LMS Integration', free: false, batch: true, institution: true },
    { feature: 'Batch Processing', free: false, batch: true, institution: true },
    { feature: 'Analytics', free: 'Basic', batch: 'Detailed', institution: 'Advanced' },
    { feature: 'Priority Support', free: false, batch: true, institution: true },
    { feature: 'API Access', free: false, batch: false, institution: true },
    { feature: 'SSO Integration', free: false, batch: false, institution: true },
    { feature: 'White-label', free: false, batch: false, institution: true },
  ];

  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning',
  });

  const handleGetStarted = (planName: string) => {
    if (planName === 'Institution') {
      // Contact sales
      setNotification({
        open: true,
        message: 'Our sales team will contact you within 24 hours! For immediate assistance, email sales@scorepal.com',
        severity: 'info',
      });
      return;
    }
    
    // Redirect to registration for other plans
    router.push('/register');
  };

  const handleContactSales = () => {
    setNotification({
      open: true,
      message: 'Enterprise inquiry submitted! Our team will reach out to you soon.',
      severity: 'success',
    });
  };

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  return (
    <>
      {/* Navigation Bar */}
      <AppBar 
        position="fixed" 
        sx={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid #e2e8f0',
          boxShadow: 'none',
        }}
      >
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
            <Box
              component="img"
              src="/icons/scorepal_48x48.png"
              alt="ScorePAL Logo"
              sx={{ width: 40, height: 40, borderRadius: 2 }}
            />
            <Typography 
              variant="h6" 
              component="div" 
              fontWeight="700"
              sx={{ 
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                backgroundClip: 'text',
                textFillColor: 'transparent',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              ScorePAL
            </Typography>
          </Box>
          
          <Stack direction="row" spacing={2} alignItems="center">
            <Button
              component={Link}
              href="/landing"
              color="inherit"
              sx={{ color: '#64748b', fontWeight: 600 }}
            >
              Home
            </Button>
            <Button
              component={Link}
              href="/login"
              variant="outlined"
              sx={{ 
                borderColor: '#2563eb',
                color: '#2563eb',
                fontWeight: 600,
                '&:hover': {
                  borderColor: '#1d4ed8',
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
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                fontWeight: 600,
                '&:hover': {
                  background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
                }
              }}
            >
              Get Started
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Hero Section */}
      <GradientSection sx={{ pt: 12, pb: 8 }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <Typography variant="h2" component="h1" fontWeight="800" gutterBottom>
              Choose Your Plan
            </Typography>
            <Typography variant="h5" sx={{ mb: 4, opacity: 0.9, maxWidth: '600px', mx: 'auto' }}>
              Start with our free trial and scale as you grow. 
              Perfect for individual educators to large institutions.
            </Typography>
            
            {/* Billing Toggle */}
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mb: 6 }}>
              <Typography variant="body1" sx={{ opacity: isAnnual ? 0.7 : 1 }}>
                Monthly
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={isAnnual}
                    onChange={(e) => setIsAnnual(e.target.checked)}
                    sx={{
                      '& .MuiSwitch-thumb': {
                        backgroundColor: 'white',
                      },
                      '& .MuiSwitch-track': {
                        backgroundColor: 'rgba(255, 255, 255, 0.3)',
                      },
                    }}
                  />
                }
                label=""
              />
              <Typography variant="body1" sx={{ opacity: isAnnual ? 1 : 0.7 }}>
                Annual
              </Typography>
              <Chip 
                label="Save 25%" 
                size="small"
                sx={{ 
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  color: '#10b981',
                  fontWeight: 600,
                  ml: 1,
                }}
              />
            </Box>
          </Box>
        </Container>
      </GradientSection>

      {/* Pricing Cards */}
      <Container maxWidth="lg" sx={{ mt: -4, mb: 8 }}>
        <Grid container spacing={4}>
          {plans.map((plan, index) => (
            <Grid item xs={12} md={4} key={index}>
              <PricingCard featured={plan.popular}>
                {plan.popular && (
                  <Chip 
                    label="Most Popular" 
                    icon={<StarIcon />}
                    sx={{ 
                      position: 'absolute',
                      top: -12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: '#2563eb',
                      color: 'white',
                      fontWeight: 600,
                      zIndex: 1,
                    }} 
                  />
                )}
                
                <CardContent sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ textAlign: 'center', mb: 3 }}>
                    {plan.icon}
                    <Typography variant="h5" fontWeight="700" gutterBottom sx={{ mt: 2 }}>
                      {plan.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {plan.description}
                    </Typography>
                  </Box>

                  <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 1 }}>
                      <Typography variant="h3" fontWeight="800" color="primary">
                        ${plan.price}
                      </Typography>
                      {plan.originalPrice && (
                        <Typography 
                          variant="h5" 
                          sx={{ 
                            textDecoration: 'line-through', 
                            color: 'text.secondary',
                            opacity: 0.6 
                          }}
                        >
                          ${plan.originalPrice}
                        </Typography>
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {plan.period}
                    </Typography>
                  </Box>

                  <List sx={{ flexGrow: 1, p: 0 }}>
                    {plan.features.map((feature, featureIndex) => (
                      <ListItem key={featureIndex} sx={{ px: 0, py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <CheckCircleIcon sx={{ color: '#10b981', fontSize: 20 }} />
                        </ListItemIcon>
                        <ListItemText 
                          primary={feature} 
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                    {plan.limitations.map((limitation, limitIndex) => (
                      <ListItem key={`limit-${limitIndex}`} sx={{ px: 0, py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <CloseIcon sx={{ color: '#ef4444', fontSize: 20 }} />
                        </ListItemIcon>
                        <ListItemText 
                          primary={limitation} 
                          primaryTypographyProps={{ 
                            variant: 'body2',
                            sx: { opacity: 0.6 }
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>

                  <Button
                    fullWidth
                    variant={plan.buttonVariant}
                    size="large"
                    onClick={() => handleGetStarted(plan.name)}
                    sx={{ 
                      mt: 3,
                      py: 1.5,
                      borderRadius: 2,
                      fontWeight: 600,
                      ...(plan.buttonVariant === 'contained' && {
                        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
                        }
                      })
                    }}
                  >
                    {plan.buttonText}
                  </Button>
                </CardContent>
              </PricingCard>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Feature Comparison */}
      <Box sx={{ backgroundColor: '#f8fafc', py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" component="h2" fontWeight="700" textAlign="center" gutterBottom sx={{ mb: 6 }}>
            Compare Plans
          </Typography>
          
          <FeatureComparisonCard>
            <Box sx={{ overflowX: 'auto' }}>
              <Box sx={{ minWidth: 800 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', borderBottom: '2px solid #e2e8f0' }}>
                  <Box sx={{ flex: 1, p: 3, backgroundColor: '#f8fafc' }}>
                    <Typography variant="h6" fontWeight="700">
                      Features
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, p: 3, textAlign: 'center' }}>
                    <Typography variant="h6" fontWeight="700">
                      Free Trial
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, p: 3, textAlign: 'center', backgroundColor: '#f0f9ff', borderLeft: '2px solid #2563eb', borderRight: '2px solid #2563eb' }}>
                    <Typography variant="h6" fontWeight="700" color="primary">
                      Batch Grading
                    </Typography>
                    <Chip label="Popular" size="small" sx={{ mt: 0.5, backgroundColor: '#2563eb', color: 'white' }} />
                  </Box>
                  <Box sx={{ flex: 1, p: 3, textAlign: 'center' }}>
                    <Typography variant="h6" fontWeight="700">
                      Institution
                    </Typography>
                  </Box>
                </Box>

                {/* Feature Rows */}
                {featureComparison.map((row, index) => (
                  <Box key={index} sx={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
                    <Box sx={{ flex: 1, p: 3, backgroundColor: '#f8fafc' }}>
                      <Typography variant="body2" fontWeight="600">
                        {row.feature}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1, p: 3, textAlign: 'center' }}>
                      {typeof row.free === 'boolean' ? (
                        row.free ? (
                          <CheckCircleIcon sx={{ color: '#2563eb' }} />
                        ) : (
                          <CloseIcon sx={{ color: '#000000' }} />
                        )
                      ) : (
                        <Typography variant="body2">{row.free}</Typography>
                      )}
                    </Box>
                    <Box sx={{ flex: 1, p: 3, textAlign: 'center', backgroundColor: '#f0f9ff' }}>
                      {typeof row.batch === 'boolean' ? (
                        row.batch ? (
                          <CheckCircleIcon sx={{ color: '#2563eb' }} />
                        ) : (
                          <CloseIcon sx={{ color: '#000000' }} />
                        )
                      ) : (
                        <Typography variant="body2" fontWeight="600">{row.batch}</Typography>
                      )}
                    </Box>
                    <Box sx={{ flex: 1, p: 3, textAlign: 'center' }}>
                      {typeof row.institution === 'boolean' ? (
                        row.institution ? (
                          <CheckCircleIcon sx={{ color: '#2563eb' }} />
                        ) : (
                          <CloseIcon sx={{ color: '#000000' }} />
                        )
                      ) : (
                        <Typography variant="body2">{row.institution}</Typography>
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </FeatureComparisonCard>
        </Container>
      </Box>

      {/* FAQ Section */}
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Typography variant="h3" component="h2" fontWeight="700" textAlign="center" gutterBottom sx={{ mb: 6 }}>
          Frequently Asked Questions
        </Typography>
        
        <Stack spacing={3}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight="600" gutterBottom>
              How does the $10 batch grading work?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You pay $10 per batch to grade up to 100 assignments at once. This includes advanced AI grading, custom rubrics, and automatic grade posting to your LMS. Perfect for midterms, finals, or any large assignment collection.
            </Typography>
          </Paper>
          
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight="600" gutterBottom>
              Can I try before I buy?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Absolutely! Start with our free trial that includes 5 assignments per month. No credit card required. Upgrade to batch grading only when you need it.
            </Typography>
          </Paper>
          
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight="600" gutterBottom>
              Which LMS platforms do you support?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              We support Canvas, Blackboard, Moodle, and most major LMS platforms. Our batch grading plan includes automatic grade posting and gradebook sync.
            </Typography>
          </Paper>
          
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight="600" gutterBottom>
              Is my student data secure?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Yes, we use enterprise-grade security with data encryption, secure data centers, and FERPA compliance. Your student data is never shared or used for training our AI models.
            </Typography>
          </Paper>
        </Stack>
      </Container>

      {/* CTA Section */}
      <GradientSection sx={{ py: 8 }}>
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Typography variant="h3" component="h2" fontWeight="800" gutterBottom>
              Ready to Get Started?
            </Typography>
            <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
              Start with our free trial and experience the future of grading
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent="center">
              <Button
                component={Link}
                href="/register"
                variant="contained"
                size="large"
                sx={{ 
                  backgroundColor: 'white',
                  color: '#2563eb',
                  fontWeight: 700,
                  px: 4,
                  py: 1.5,
                  '&:hover': {
                    backgroundColor: '#f8fafc',
                  }
                }}
              >
                Start Free Trial
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={handleContactSales}
                sx={{ 
                  borderColor: 'white',
                  color: 'white',
                  fontWeight: 600,
                  px: 4,
                  py: 1.5,
                  '&:hover': {
                    borderColor: 'white',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  }
                }}
              >
                Contact Sales
              </Button>
            </Stack>
          </Box>
        </Container>
      </GradientSection>

      {/* Footer */}
      <Box sx={{ backgroundColor: '#1e293b', color: 'white', py: 6 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
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
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
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
                  <Stack spacing={1}>
                    <Button component={Link} href="/landing" color="inherit" size="small" sx={{ justifyContent: 'flex-start', p: 0 }}>
                      Home
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
                  <Stack spacing={1}>
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
          
          <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', mt: 6, pt: 6, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ opacity: 0.6 }}>
              © 2024 ScorePAL. All rights reserved.
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Notifications */}
      <Snackbar 
        open={notification.open} 
        autoHideDuration={6000} 
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