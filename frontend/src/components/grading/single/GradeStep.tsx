/**
 * Grade Submission Step Component
 */

import React from 'react';
import {
  Paper,
  CircularProgress,
  Typography,
  Box,
  Button,
} from '@mui/material';
import { CheckCircle as CheckCircleIcon } from '@mui/icons-material';

interface GradeStepProps {
  isLoading: boolean;
  onBack: () => void;
  onNext: () => void;
}

export const GradeStep: React.FC<GradeStepProps> = ({
  isLoading,
  onBack,
  onNext,
}) => {
  return (
    <Paper sx={{ p: 4, textAlign: 'center' }}>
      {isLoading ? (
        <>
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Grading in Progress...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Our AI is analyzing the submission and providing detailed feedback
          </Typography>
        </>
      ) : (
        <>
          <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Ready to Grade
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Review your settings and click "Start Grading" to begin
          </Typography>
          <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button onClick={onBack}>Back</Button>
            <Button onClick={onNext} variant="contained" size="large">
              Start Grading
            </Button>
          </Box>
        </>
      )}
    </Paper>
  );
};
