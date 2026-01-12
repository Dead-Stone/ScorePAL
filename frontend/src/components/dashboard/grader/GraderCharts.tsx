/**
 * Grader Charts Component
 */

import React from 'react';
import { Grid, Card, CardHeader, CardContent, Box } from '@mui/material';
import dynamic from 'next/dynamic';
import { ChartWrapper } from '../../charts/ChartWrapper';
import { GraderStats, CourseStats } from './types';

const Bar = dynamic(() => import('react-chartjs-2').then(mod => mod.Bar), { ssr: false });
const Doughnut = dynamic(() => import('react-chartjs-2').then(mod => mod.Doughnut), { ssr: false });

interface GraderChartsProps {
  stats: GraderStats;
  courseStats: CourseStats[];
}

export const GraderCharts: React.FC<GraderChartsProps> = ({ stats, courseStats }) => {
  const accessibleCourseStats = courseStats.filter(s => 
    s.total_submissions >= 0 && s.total_graded >= 0
  );

  if (accessibleCourseStats.length === 0) return null;

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={4}>
        <Card>
          <CardHeader
            title="Grading Progress"
            subheader="Graded vs Pending"
          />
          <CardContent>
            <Box sx={{ height: 250 }}>
              <ChartWrapper minHeight={250}>
                <Doughnut
                  data={{
                    labels: ['Graded', 'Pending'],
                    datasets: [{
                      data: [
                        stats.totalGraded,
                        stats.totalPendingGrading
                      ],
                      backgroundColor: ['#4CAF50', '#FF9800'],
                      borderWidth: 0,
                    }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: ${context.parsed} (${percentage}%)`;
                          }
                        }
                      }
                    }
                  }}
                />
              </ChartWrapper>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={8}>
        <Card>
          <CardHeader
            title="Average Scores by Course"
            subheader="Performance across courses"
          />
          <CardContent>
            <Box sx={{ height: 250 }}>
              <ChartWrapper minHeight={250}>
                <Bar
                  data={{
                    labels: accessibleCourseStats.map(s => s.course_code || s.course_name.substring(0, 20)),
                    datasets: [{
                      label: 'Average Score (%)',
                      data: accessibleCourseStats.map(s => s.average_score || 0),
                      backgroundColor: accessibleCourseStats.map(s => {
                        const score = s.average_score || 0;
                        return score >= 80 ? '#4CAF50' : score >= 60 ? '#FF9800' : '#F44336';
                      }),
                      borderWidth: 0,
                    }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            return `Average Score: ${context.parsed.y.toFixed(1)}%`;
                          }
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                          callback: function(value) {
                            return value + '%';
                          }
                        }
                      },
                      x: {
                        ticks: {
                          maxRotation: 45,
                          minRotation: 45,
                        }
                      }
                    }
                  }}
                />
              </ChartWrapper>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};
