/**
 * StudentStatsCards - Statistics cards for student dashboard
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 */

import React from 'react';
import { Grid } from '@mui/material';
import { StatsCard } from '../cards/StatsCard';
import GradeIcon from '@mui/icons-material/Grade';
import AssessmentIcon from '@mui/icons-material/Assessment';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import InsightsIcon from '@mui/icons-material/Insights';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

interface StudentStats {
  totalAssignments: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  totalPoints: number;
  totalPossible: number;
  trend: 'up' | 'down' | 'stable';
}

interface StudentStatsCardsProps {
  stats: StudentStats;
}

export const StudentStatsCards: React.FC<StudentStatsCardsProps> = ({ stats }) => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={3}>
        <StatsCard
          title="Average Score"
          value={`${stats.averageScore.toFixed(1)}%`}
          subtitle={`${stats.totalAssignments} assignments`}
          icon={<GradeIcon sx={{ fontSize: 40 }} />}
          color="primary"
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <StatsCard
          title="Total Points"
          value={`${stats.totalPoints.toFixed(0)} / ${stats.totalPossible.toFixed(0)}`}
          subtitle={`${((stats.totalPoints / stats.totalPossible) * 100).toFixed(1)}% overall`}
          icon={<AssessmentIcon sx={{ fontSize: 40 }} />}
          color="success"
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <StatsCard
          title="Highest Score"
          value={`${stats.highestScore.toFixed(1)}%`}
          subtitle="Best performance"
          icon={<EmojiEventsIcon sx={{ fontSize: 40 }} />}
          color="warning"
        />
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <StatsCard
          title="Performance Trend"
          value={
            stats.trend === 'up' ? 'Improving' : stats.trend === 'down' ? 'Declining' : 'Stable'
          }
          subtitle="Recent assignments"
          icon={
            stats.trend === 'up' ? (
              <TrendingUpIcon sx={{ fontSize: 40 }} />
            ) : stats.trend === 'down' ? (
              <TrendingDownIcon sx={{ fontSize: 40 }} />
            ) : (
              <InsightsIcon sx={{ fontSize: 40 }} />
            )
          }
          color={stats.trend === 'up' ? 'success' : stats.trend === 'down' ? 'error' : 'info'}
        />
      </Grid>
    </Grid>
  );
};

