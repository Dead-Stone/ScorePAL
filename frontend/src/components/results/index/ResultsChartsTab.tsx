/**
 * Results Charts Tab Component
 */

import React from 'react';
import { Grid, Paper, Typography, Box } from '@mui/material';
import dynamic from 'next/dynamic';
import { ChartWrapper } from '@/components/charts/ChartWrapper';
import { Result, AssignmentGroup } from './types';

const BarChart = dynamic(() => import('react-chartjs-2').then(mod => mod.Bar), { ssr: false });
const PieChart = dynamic(() => import('react-chartjs-2').then(mod => mod.Pie), { ssr: false });

interface ResultsChartsTabProps {
  results: Result[];
  assignmentGroups: AssignmentGroup[];
}

export const ResultsChartsTab: React.FC<ResultsChartsTabProps> = ({ results, assignmentGroups }) => {
  // Score distribution data
  const scoreRanges = ['0-50', '51-60', '61-70', '71-80', '81-90', '91-100'];
  const scoreDistribution = scoreRanges.map(range => {
    const [min, max] = range.split('-').map(Number);
    return results.filter(r => r.percentage >= min && r.percentage <= max).length;
  });

  const scoreDistributionData = {
    labels: scoreRanges,
    datasets: [{
      label: 'Number of Students',
      data: scoreDistribution,
      backgroundColor: [
        'rgba(244, 67, 54, 0.7)',
        'rgba(255, 152, 0, 0.7)',
        'rgba(255, 193, 7, 0.7)',
        'rgba(76, 175, 80, 0.7)',
        'rgba(33, 150, 243, 0.7)',
        'rgba(33, 150, 243, 0.9)',
      ],
      borderRadius: 8,
    }],
  };

  // Grade distribution data
  const gradeCounts: Record<string, number> = {};
  results.forEach(r => {
    gradeCounts[r.grade_letter] = (gradeCounts[r.grade_letter] || 0) + 1;
  });

  const gradeDistributionData = {
    labels: Object.keys(gradeCounts),
    datasets: [{
      data: Object.values(gradeCounts),
      backgroundColor: [
        'rgba(76, 175, 80, 0.7)',
        'rgba(33, 150, 243, 0.7)',
        'rgba(255, 193, 7, 0.7)',
        'rgba(255, 152, 0, 0.7)',
        'rgba(244, 67, 54, 0.7)',
      ],
    }],
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3, height: 350 }}>
          <Typography variant="h6" gutterBottom>Score Distribution</Typography>
          <Box height={280}>
            <ChartWrapper>
              <BarChart
                data={scoreDistributionData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { y: { beginAtZero: true } }
                }}
              />
            </ChartWrapper>
          </Box>
        </Paper>
      </Grid>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3, height: 350 }}>
          <Typography variant="h6" gutterBottom>Grade Distribution</Typography>
          <Box height={280}>
            <ChartWrapper>
              <PieChart
                data={gradeDistributionData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'right' } }
                }}
              />
            </ChartWrapper>
          </Box>
        </Paper>
      </Grid>
      <Grid item xs={12}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Assignment Performance Comparison</Typography>
          <Box height={300}>
            <ChartWrapper>
              <BarChart
                data={{
                  labels: assignmentGroups.slice(0, 10).map(g => 
                    (g.assignment_name || g.assignment_id).length > 15 
                      ? (g.assignment_name || g.assignment_id).substring(0, 15) + '...'
                      : (g.assignment_name || g.assignment_id)
                  ),
                  datasets: [
                    {
                      label: 'Average Score',
                      data: assignmentGroups.slice(0, 10).map(g => g.average_score),
                      backgroundColor: 'rgba(33, 150, 243, 0.7)',
                      borderRadius: 8,
                    },
                    {
                      label: 'Pass Rate %',
                      data: assignmentGroups.slice(0, 10).map(g => (g.passing_count / g.count) * 100),
                      backgroundColor: 'rgba(76, 175, 80, 0.7)',
                      borderRadius: 8,
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'top' } },
                  scales: { y: { beginAtZero: true, max: 100 } }
                }}
              />
            </ChartWrapper>
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
};
