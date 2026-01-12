/**
 * Results Stats Cards Component
 */

import React from 'react';
import { Grid, Card, CardContent, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import GradeIcon from '@mui/icons-material/Grade';
import { ResultsStats } from './types';

const StatsCard = styled(Card)(({ theme }) => ({
  height: '100%',
  transition: 'all 0.2s ease',
  borderRadius: theme.shape.borderRadius * 2,
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
  },
}));

interface ResultsStatsCardsProps {
  stats: ResultsStats;
}

export const ResultsStatsCards: React.FC<ResultsStatsCardsProps> = ({ stats }) => {
  return (
    <Grid container spacing={2}>
      <Grid item xs={6} sm={3}>
        <StatsCard>
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <AssignmentIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
            <Typography variant="h4" fontWeight="bold">{stats.totalAssignments}</Typography>
            <Typography variant="body2" color="text.secondary">Assignments</Typography>
          </CardContent>
        </StatsCard>
      </Grid>
      <Grid item xs={6} sm={3}>
        <StatsCard>
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <PeopleIcon sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
            <Typography variant="h4" fontWeight="bold">{stats.totalSubmissions}</Typography>
            <Typography variant="body2" color="text.secondary">Submissions</Typography>
          </CardContent>
        </StatsCard>
      </Grid>
      <Grid item xs={6} sm={3}>
        <StatsCard>
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <TrendingUpIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
            <Typography variant="h4" fontWeight="bold">{stats.averageScore.toFixed(1)}%</Typography>
            <Typography variant="body2" color="text.secondary">Average Score</Typography>
          </CardContent>
        </StatsCard>
      </Grid>
      <Grid item xs={6} sm={3}>
        <StatsCard>
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <GradeIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
            <Typography variant="h4" fontWeight="bold">{stats.passRate.toFixed(0)}%</Typography>
            <Typography variant="body2" color="text.secondary">Pass Rate</Typography>
          </CardContent>
        </StatsCard>
      </Grid>
    </Grid>
  );
};
