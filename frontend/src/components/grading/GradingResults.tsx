/**
 * GradingResults - Component for displaying grading results (non-saved)
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 */

import React from 'react';
import {
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Alert,
} from '@mui/material';
import Link from 'next/link';

interface GradingResult {
  status: string;
  result: {
    score: number;
    max_score: number;
    percentage: number;
    feedback?: string;
  };
  student_name: string;
  assignment_name: string;
  graded_at: string;
  saved: boolean;
}

interface GradingResultsProps {
  result: GradingResult | null;
}

export const GradingResults: React.FC<GradingResultsProps> = ({ result }) => {
  if (!result) return null;

  return (
    <Paper elevation={3} sx={{ p: 4, mb: 6, borderRadius: 3 }}>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        Grading Results
      </Typography>
      <Alert severity="info" sx={{ mb: 3 }}>
        These results are not saved.{' '}
        <Link href="/auth/register" style={{ textDecoration: 'underline' }}>
          Sign up
        </Link>{' '}
        to save results and access more features.
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Student Information" />
            <CardContent>
              <Typography>
                <strong>Student:</strong> {result.student_name}
              </Typography>
              <Typography>
                <strong>Assignment:</strong> {result.assignment_name}
              </Typography>
              <Typography>
                <strong>Graded At:</strong> {new Date(result.graded_at).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Score Summary" />
            <CardContent>
              <Typography variant="h4" color="primary">
                {result.result.score || 0} / {result.result.max_score || 100}
              </Typography>
              <Typography variant="h6" color="text.secondary">
                {result.result.percentage || 0}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        {result.result.feedback && (
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Feedback" />
              <CardContent>
                <Typography variant="body1" whiteSpace="pre-wrap">
                  {result.result.feedback}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Paper>
  );
};

