/**
 * ScorePAL - AI-Powered Academic Grading Assistant
 * Home/Landing Page Component
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 * @repository https://github.com/Dead-Stone/ScorePAL
 */

import React from 'react';
import { Box, Container, Typography, Button, Paper, Grid, styled } from '@mui/material';
import Link from 'next/link';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BackendStatus from '../components/BackendStatus';

const HeroSection = styled(Box)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.light} 30%, ${theme.palette.primary.main} 90%)`,
  color: theme.palette.primary.contrastText,
  padding: theme.spacing(14, 0),
  borderRadius: theme.shape.borderRadius * 4,
  marginBottom: theme.spacing(8),
  textAlign: 'center',
  boxShadow: theme.shadows[4],
}));

const FeatureCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  borderRadius: theme.shape.borderRadius * 2,
  textAlign: 'center',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  transition: 'all 0.3s cubic-bezier(.25,.8,.25,1)',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: theme.shadows[8],
  },
}));

const CallToActionSection = styled(Box)(({ theme }) => ({
  background: theme.palette.background.default,
  padding: theme.spacing(10, 0),
  textAlign: 'center',
  borderRadius: theme.shape.borderRadius * 4,
  marginTop: theme.spacing(8),
  boxShadow: theme.shadows[2],
}));

export default function LandingPage() {
  return (
    <Container maxWidth={false} disableGutters>
      <BackendStatus />
      <HeroSection>
        <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 'bold', maxWidth: 800, mx: 'auto' }}>
          ScorePAL: Your AI-Powered Academic Grading Assistant
        </Typography>
        <Typography variant="h5" paragraph sx={{ maxWidth: 900, mx: 'auto', mb: 4, opacity: 0.9 }}>
          Streamline your grading workflow, provide consistent and insightful feedback,
          and save valuable time with intelligent automation.
        </Typography>
        <Button
          variant="contained"
          size="large"
          component={Link}
          href="/grade"
          endIcon={<ArrowForwardIcon />}
          sx={{ mt: 4, px: 5, py: 1.5, borderRadius: 8, bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
        >
          Start Grading Now
        </Button>
      </HeroSection>

      <Box sx={{ mt: 8 }}>
        <Typography variant="h3" component="h2" textAlign="center" gutterBottom sx={{ fontWeight: 'bold', mb: 6, color: 'primary.dark' }}>
          Key Features
        </Typography>
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <FeatureCard elevation={3}>
              <CheckCircleOutlineIcon color="primary" sx={{ fontSize: 70, mb: 2 }} />
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Automated Grading
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Leverage advanced AI to quickly and consistently grade a wide range of assignments, from essays to coding projects.
              </Typography>
            </FeatureCard>
          </Grid>
          <Grid item xs={12} md={4}>
            <FeatureCard elevation={3}>
              <LightbulbOutlinedIcon color="primary" sx={{ fontSize: 70, mb: 2 }} />
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Insightful & Actionable Feedback
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Generate detailed, constructive feedback that helps students understand their strengths and areas for improvement.
              </Typography>
            </FeatureCard>
          </Grid>
          <Grid item xs={12} md={4}>
            <FeatureCard elevation={3}>
              <SchoolOutlinedIcon color="primary" sx={{ fontSize: 70, mb: 2 }} />
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Seamless LMS Integration
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Connect effortlessly with popular Learning Management Systems like Canvas and Moodle for smooth data sync.
              </Typography>
            </FeatureCard>
          </Grid>
        </Grid>
      </Box>

      <CallToActionSection>
        <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.dark' }}>
          Ready to Revolutionize Your Grading?
        </Typography>
        <Typography variant="h6" color="text.secondary" paragraph sx={{ maxWidth: 700, mx: 'auto', mb: 4 }}>
          Join educators who are transforming their grading process with ScorePAL.
          Sign up today and experience the future of academic assessment.
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 4 }}>
          <Button
            variant="contained"
            size="large"
            component={Link}
            href="/canvas"
            sx={{ px: 5, py: 1.5, borderRadius: 8, bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' } }}
          >
            Try Canvas Grading
          </Button>
          <Button
            variant="outlined"
            size="large"
            component={Link}
            href="/rubric"
            sx={{ px: 5, py: 1.5, borderRadius: 8, borderColor: 'primary.main', color: 'primary.main', '&:hover': { bgcolor: 'primary.light', color: 'white' } }}
          >
            Manage Rubrics
          </Button>
        </Box>
      </CallToActionSection>
    </Container>
  );
} 