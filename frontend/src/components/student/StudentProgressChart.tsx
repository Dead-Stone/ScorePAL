/**
 * StudentProgressChart - Line chart showing grade progression over time
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 */

import React from 'react';
import { Card, CardHeader, CardContent, Paper, Typography } from '@mui/material';
import dynamic from 'next/dynamic';
import { ChartWrapper } from '../charts/ChartWrapper';

const LineChart = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), { ssr: false });

interface Result {
  percentage: number;
  graded_at: string;
}

interface StudentProgressChartProps {
  results: Result[];
}

export const StudentProgressChart: React.FC<StudentProgressChartProps> = ({ results }) => {
  if (results.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No data available for chart
        </Typography>
      </Paper>
    );
  }

  const chartData = {
    labels: results
      .slice()
      .reverse()
      .map(r => new Date(r.graded_at).toLocaleDateString()),
    datasets: [
      {
        label: 'Your Score (%)',
        data: results.slice().reverse().map(r => r.percentage),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
      },
      {
        label: 'Average (70%)',
        data: Array(results.length).fill(70),
        borderColor: 'rgb(255, 99, 132)',
        borderDash: [5, 5],
        fill: false,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function (value: any) {
            return value + '%';
          },
        },
      },
    },
  };

  return (
    <Card>
      <CardHeader title="Grade Progress Over Time" />
      <CardContent>
        <ChartWrapper>
          <LineChart data={chartData} options={chartOptions} height={300} />
        </ChartWrapper>
      </CardContent>
    </Card>
  );
};

