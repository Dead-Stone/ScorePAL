/**
 * Canvas Comparison Tab Component
 */

import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Divider,
  Chip,
  Button,
  Box,
} from '@mui/material';
import { GradingResults } from './types';

interface CanvasComparisonTabProps {
  results: GradingResults;
}

export const CanvasComparisonTab: React.FC<CanvasComparisonTabProps> = ({ results }) => {
  if (!results.canvas_comparison) return null;

  const comparison = results.canvas_comparison;

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              AI Grade vs Canvas Posted Grade
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ bgcolor: 'primary.50' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      AI Grade ({results.ai_model_used || 'Unknown Model'})
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="primary.main">
                      {results.score?.toFixed(1)} / {results.total?.toFixed(1)}
                    </Typography>
                    <Typography variant="h6" color="text.secondary">
                      {results.percentage?.toFixed(1)}% ({results.grade_letter})
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ bgcolor: 'info.50' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Canvas Posted Grade
                    </Typography>
                    {comparison.canvas_posted_score !== null && comparison.canvas_posted_score !== undefined ? (
                      <>
                        <Typography variant="h4" fontWeight="bold" color="info.main">
                          {comparison.canvas_posted_score.toFixed(1)} / {results.total?.toFixed(1)}
                        </Typography>
                        <Typography variant="h6" color="text.secondary">
                          {comparison.canvas_posted_percentage?.toFixed(1)}%
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="body1" color="text.secondary">
                        No grade posted yet
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              
              {comparison.score_difference !== null && comparison.score_difference !== undefined && (
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        Comparison Analysis
                      </Typography>
                      <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6}>
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Score Difference
                            </Typography>
                            <Typography 
                              variant="h6" 
                              color={
                                Math.abs(comparison.score_difference) <= 1 ? 'success.main' :
                                Math.abs(comparison.score_difference) <= 5 ? 'warning.main' : 'error.main'
                              }
                            >
                              {comparison.score_difference > 0 ? '+' : ''}
                              {comparison.score_difference.toFixed(2)} points
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Percentage Difference
                            </Typography>
                            <Typography 
                              variant="h6"
                              color={
                                Math.abs(comparison.percentage_difference || 0) <= 1 ? 'success.main' :
                                Math.abs(comparison.percentage_difference || 0) <= 5 ? 'warning.main' : 'error.main'
                              }
                            >
                              {comparison.percentage_difference && comparison.percentage_difference > 0 ? '+' : ''}
                              {comparison.percentage_difference?.toFixed(2)}%
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12}>
                          <Chip
                            label={
                              comparison.comparison_status === 'exact_match' ? 'Exact Match' :
                              comparison.comparison_status === 'close_match' ? 'Close Match' :
                              comparison.comparison_status === 'moderate_difference' ? 'Moderate Difference' :
                              comparison.comparison_status === 'significant_difference' ? 'Significant Difference' :
                              'No Comparison Available'
                            }
                            color={
                              comparison.comparison_status === 'exact_match' ? 'success' :
                              comparison.comparison_status === 'close_match' ? 'info' :
                              comparison.comparison_status === 'moderate_difference' ? 'warning' :
                              'error'
                            }
                            sx={{ mt: 1 }}
                          />
                        </Grid>
                      </Grid>
                      {comparison.canvas_submission_url && (
                        <Box sx={{ mt: 2 }}>
                          <Button
                            variant="outlined"
                            size="small"
                            href={comparison.canvas_submission_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View Canvas Submission
                          </Button>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};
