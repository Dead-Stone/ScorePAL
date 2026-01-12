/**
 * StudentRubricBreakdown - Component showing rubric criteria breakdown for student assignments
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 */

import React from 'react';
import { Grid, Card, CardHeader, CardContent, Box, Typography, LinearProgress, Chip, Divider, Paper } from '@mui/material';
import Link from 'next/link';

interface CriterionScore {
  criterion_name: string;
  points_awarded: number;
  max_points: number;
  percentage: number;
  feedback?: string;
}

interface Result {
  id: string;
  assignment_id: string;
  assignment_name?: string;
  percentage: number;
  criteria_scores?: CriterionScore[];
}

interface StudentRubricBreakdownProps {
  results: Result[];
}

export const StudentRubricBreakdown: React.FC<StudentRubricBreakdownProps> = ({ results }) => {
  const resultsWithRubrics = results.filter(r => r.criteria_scores && r.criteria_scores.length > 0);

  if (resultsWithRubrics.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No rubric data available
        </Typography>
      </Paper>
    );
  }

  return (
    <Grid container spacing={3}>
      {resultsWithRubrics.map((result) => (
        <Grid item xs={12} md={6} key={result.id}>
          <Card>
            <CardHeader
              title={result.assignment_name || result.assignment_id}
              subheader={`Overall: ${result.percentage.toFixed(1)}%`}
            />
            <CardContent>
              {result.criteria_scores?.map((criterion, idx) => (
                <Box key={idx} sx={{ mb: 2 }}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" fontWeight="medium">
                      {criterion.criterion_name}
                    </Typography>
                    <Typography variant="body2">
                      {criterion.points_awarded.toFixed(1)} / {criterion.max_points}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={criterion.percentage}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  {criterion.feedback && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      {criterion.feedback}
                    </Typography>
                  )}
                </Box>
              ))}
              <Divider sx={{ my: 2 }} />
              <Chip 
                label="Full Feedback" 
                size="small" 
                sx={{ cursor: 'default' }}
                title="Feedback is shown above"
              />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

