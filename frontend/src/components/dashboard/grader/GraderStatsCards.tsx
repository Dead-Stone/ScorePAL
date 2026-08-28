/**
 * Grader Stats Cards Component
 */

import React from 'react';
import { Grid, Card, CardContent, Typography, Box } from '@mui/material';
import {
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
  BarChart as BarChartIcon,
  School as SchoolIcon,
} from '@mui/icons-material';
import { GraderStats } from './types';

interface GraderStatsCardsProps {
  stats: GraderStats;
  coursesCount: number;
}

export const GraderStatsCards: React.FC<GraderStatsCardsProps> = ({ stats, coursesCount }) => {
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Total Graded
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  {stats.totalGraded}
                </Typography>
              </Box>
              <AssignmentIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.3 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Avg Score
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  {stats.overallAvgScore > 0 ? stats.overallAvgScore.toFixed(1) : stats.avgScore.toFixed(1)}%
                </Typography>
              </Box>
              <TrendingUpIcon sx={{ fontSize: 40, color: 'success.main', opacity: 0.3 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Pending Grading
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="warning.main">
                  {stats.totalPendingGrading}
                </Typography>
              </Box>
              <BarChartIcon sx={{ fontSize: 40, color: 'warning.main', opacity: 0.3 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Courses
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  {stats.totalCourses || coursesCount}
                </Typography>
              </Box>
              <SchoolIcon sx={{ fontSize: 40, color: 'info.main', opacity: 0.3 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};
