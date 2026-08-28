/**
 * Results Header Component
 */

import React from 'react';
import { Box, Typography, Chip, Alert } from '@mui/material';
import { Person as PersonIcon, Grade as GradeIcon } from '@mui/icons-material';
import { GradingResults } from './types';
import { getScoreColor } from './utils';

interface ResultsHeaderProps {
  results: GradingResults;
}

export const ResultsHeader: React.FC<ResultsHeaderProps> = ({ results }) => {
  return (
    <Box mb={4}>
      <Typography 
        variant="h3" 
        component="h1" 
        gutterBottom 
        fontWeight="bold"
        sx={{ 
          background: 'linear-gradient(135deg, #1D80C3 0%, #4F46E5 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          mb: 1
        }}
      >
        {results.assignment_name || "Assignment Results"}
      </Typography>
      
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        {new Date(results.timestamp).toLocaleDateString(undefined, { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </Typography>
      
      {results.student_name && !results.student_results && (
        <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
          <Typography variant="body1" fontWeight="medium">
            Single Student Submission: {results.student_name}
          </Typography>
          <Typography variant="body2">
            Score: {results.score}/{results.total || 100} ({(results.percentage || 0).toFixed(1)}%)
          </Typography>
        </Alert>
      )}
      
      <Box mt={1} display="flex" gap={1}>
        <Chip 
          icon={<PersonIcon />} 
          label={`${results.summary_stats?.submission_count || 1} Students`} 
          color="primary" 
          variant="outlined"
        />
        <Chip 
          icon={<GradeIcon />} 
          label={`Avg: ${results.summary_stats ? (results.summary_stats.average_score * 100).toFixed(1) : (results.percentage || 0).toFixed(1)}%`} 
          color={getScoreColor(results.summary_stats ? results.summary_stats.average_score * 100 : (results.percentage || 0))} 
          variant="outlined"
        />
      </Box>
    </Box>
  );
};
