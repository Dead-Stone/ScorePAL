/**
 * View Results Step Component
 */

import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
} from '@mui/material';
import { CheckCircle as CheckCircleIcon } from '@mui/icons-material';

interface ResultsStepProps {
  onReset: () => void;
}

export const ResultsStep: React.FC<ResultsStepProps> = ({
  onReset,
}) => {
  return (
    <Paper sx={{ p: 4, textAlign: 'center' }}>
      <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
      <Typography variant="h6" gutterBottom>
        Grading Complete!
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Results will be displayed here. Check the results page for detailed feedback.
      </Typography>
      <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button onClick={onReset} variant="outlined">
          Grade Another
        </Button>
      </Box>
    </Paper>
  );
};
