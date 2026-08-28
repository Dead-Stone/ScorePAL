/**
 * AboutSection - About section component for home page
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 */

import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
} from '@mui/material';
import Link from 'next/link';
import { Award, Users, BookOpen, Layers, Bot } from 'lucide-react';

interface AboutSectionProps {
  isAuthenticated?: boolean;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ isAuthenticated = false }) => {
  return (
    <Box id="about" sx={{ mt: 8 }}>
      <Typography variant="h3" fontWeight="bold" textAlign="center" gutterBottom>
        Built by Educators, for Educators
      </Typography>
      <Typography variant="h6" color="text.secondary" textAlign="center" paragraph sx={{ mb: 6 }}>
        ScorePAL was created by Mohana Moganti, understanding the real challenges educators face.
      </Typography>

      <Grid container spacing={4} sx={{ mb: 6 }}>
        <Grid item xs={12} md={6}>
          <Typography variant="h5" gutterBottom>
            What Makes Us Unique
          </Typography>
          <Typography variant="body1" paragraph>
            Our agentic approach uses multiple AI agents that collaborate to provide more accurate,
            nuanced grading that rivals human assessment.
          </Typography>
          <Box sx={{ mt: 3 }}>
            <Box display="flex" alignItems="center" mb={2}>
              <Award style={{ marginRight: 12, color: '#1976d2' }} />
              <Typography>Open source and community-driven</Typography>
            </Box>
            <Box display="flex" alignItems="center" mb={2}>
              <Users style={{ marginRight: 12, color: '#1976d2' }} />
              <Typography>Trusted by educators worldwide</Typography>
            </Box>
            <Box display="flex" alignItems="center" mb={2}>
              <BookOpen style={{ marginRight: 12, color: '#1976d2' }} />
              <Typography>Continuous learning and improvement</Typography>
            </Box>
            <Box display="flex" alignItems="center">
              <Layers style={{ marginRight: 12, color: '#1976d2' }} />
              <Typography>Advanced agentic AI technology</Typography>
            </Box>
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3, textAlign: 'center' }}>
            <Bot size={48} style={{ margin: '0 auto 16px', color: '#1976d2' }} />
            <Typography variant="h6" gutterBottom>
              Agentic AI Technology
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Multiple specialized AI agents work together to analyze, evaluate, and provide feedback,
              ensuring comprehensive and accurate grading.
            </Typography>
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={6}>
                <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 2 }}>
                  <Typography variant="h4" color="primary">80%</Typography>
                  <Typography variant="caption">Time Saved</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ p: 2, bgcolor: 'secondary.light', borderRadius: 2 }}>
                  <Typography variant="h4" color="secondary">95%</Typography>
                  <Typography variant="caption">Accuracy Rate</Typography>
                </Box>
              </Grid>
            </Grid>
          </Card>
        </Grid>
      </Grid>

      {!isAuthenticated && (
        <Box textAlign="center" sx={{ mt: 6 }}>
          <Typography variant="h5" gutterBottom>
            Ready to Get Started?
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Sign up to save your grading results and access advanced features.
          </Typography>
          <Button
            component={Link}
            href="/auth/register"
            variant="contained"
            size="large"
            sx={{ mt: 2, px: 4 }}
          >
            Create Free Account
          </Button>
        </Box>
      )}
    </Box>
  );
};

