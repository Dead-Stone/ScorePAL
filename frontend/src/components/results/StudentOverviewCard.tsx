/**
 * Student Overview Card Component
 */

import React from 'react';
import { Card, CardContent, Typography, Avatar, Divider, Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import { StudentResult } from './types';
import { getGradeColor } from './utils';

const GradeAvatar = styled(Avatar)(({ theme }) => ({
  width: 70,
  height: 70,
  fontSize: '1.75rem',
  fontWeight: 'bold',
  marginBottom: theme.spacing(2),
}));

interface StudentOverviewCardProps {
  studentResult: StudentResult;
  studentName: string;
}

export const StudentOverviewCard: React.FC<StudentOverviewCardProps> = ({
  studentResult,
  studentName,
}) => {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ textAlign: 'center', pt: 4 }}>
        <GradeAvatar 
          sx={{ 
            mx: 'auto',
            bgcolor: getGradeColor(studentResult.grade_letter || 'N/A')
          }}
        >
          {studentResult.grade_letter || 'N/A'}
        </GradeAvatar>
        
        <Typography variant="h5" gutterBottom>
          {studentName}
        </Typography>
        
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          {studentResult.score} / {studentResult.total}
        </Typography>
        
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {studentResult.percentage.toFixed(1)}%
        </Typography>
        
        <Divider sx={{ my: 2 }} />
        
        <Box textAlign="left">
          <Typography variant="h6" gutterBottom>
            Overall Feedback
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
            {studentResult.grading_feedback || "No feedback available"}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};
