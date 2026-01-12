/**
 * StudentComparisonGraphs - Comprehensive graphs comparing student to class
 * Shows various visualizations of student performance vs class average
 */

import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Paper,
  Chip,
} from '@mui/material';
import dynamic from 'next/dynamic';
import { ChartWrapper } from '../charts/ChartWrapper';

const BarChart = dynamic(() => import('react-chartjs-2').then(mod => mod.Bar), { ssr: false });
const LineChart = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), { ssr: false });
const PieChart = dynamic(() => import('react-chartjs-2').then(mod => mod.Pie), { ssr: false });
const DoughnutChart = dynamic(() => import('react-chartjs-2').then(mod => mod.Doughnut), { ssr: false });
const RadarChart = dynamic(() => import('react-chartjs-2').then(mod => mod.Radar), { ssr: false });

interface ComparisonData {
  studentScore: number;
  classAverage: number;
  classHigh: number;
  classLow: number;
  percentile: number;
  totalStudents: number;
}

interface AssignmentComparison {
  assignmentName: string;
  studentScore: number;
  classAverage: number;
  maxPoints: number;
}

interface StudentComparisonGraphsProps {
  overallComparison?: ComparisonData;
  assignmentComparisons?: AssignmentComparison[];
  courseComparisons?: Array<{
    courseName: string;
    studentScore: number;
    classAverage: number;
  }>;
  gradeDistribution?: Array<{
    range: string;
    studentCount: number;
    studentPosition: number;
  }>;
}

export const StudentComparisonGraphs: React.FC<StudentComparisonGraphsProps> = ({
  overallComparison,
  assignmentComparisons = [],
  courseComparisons = [],
  gradeDistribution = [],
}) => {
  // 1. Overall Performance Comparison (Bar Chart)
  const overallChartData = overallComparison ? {
    labels: ['Your Score', 'Class Average', 'Highest Score', 'Lowest Score'],
    datasets: [
      {
        label: 'Score (%)',
        data: [
          overallComparison.studentScore,
          overallComparison.classAverage,
          overallComparison.classHigh,
          overallComparison.classLow,
        ],
        backgroundColor: [
          'rgba(29, 128, 195, 0.8)',  // Your score - blue
          'rgba(75, 192, 192, 0.8)',  // Class average - teal
          'rgba(54, 162, 235, 0.8)',  // Highest - light blue
          'rgba(255, 99, 132, 0.8)',  // Lowest - red
        ],
        borderColor: [
          'rgba(29, 128, 195, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)',
        ],
        borderWidth: 2,
      },
    ],
  } : null;

  // 2. Assignment-by-Assignment Comparison (Grouped Bar Chart)
  const assignmentChartData = assignmentComparisons.length > 0 ? {
    labels: assignmentComparisons.map(a => a.assignmentName.length > 15 
      ? a.assignmentName.substring(0, 15) + '...' 
      : a.assignmentName),
    datasets: [
      {
        label: 'Your Score',
        data: assignmentComparisons.map(a => a.studentScore),
        backgroundColor: 'rgba(29, 128, 195, 0.8)',
        borderColor: 'rgba(29, 128, 195, 1)',
        borderWidth: 2,
      },
      {
        label: 'Class Average',
        data: assignmentComparisons.map(a => a.classAverage),
        backgroundColor: 'rgba(75, 192, 192, 0.8)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 2,
      },
    ],
  } : null;

  // 3. Course Performance Comparison (Horizontal Bar Chart)
  const courseChartData = courseComparisons.length > 0 ? {
    labels: courseComparisons.map(c => c.courseName),
    datasets: [
      {
        label: 'Your Score',
        data: courseComparisons.map(c => c.studentScore),
        backgroundColor: 'rgba(29, 128, 195, 0.8)',
        borderColor: 'rgba(29, 128, 195, 1)',
        borderWidth: 2,
      },
      {
        label: 'Class Average',
        data: courseComparisons.map(c => c.classAverage),
        backgroundColor: 'rgba(75, 192, 192, 0.8)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 2,
      },
    ],
  } : null;

  // 4. Grade Distribution (Histogram with student position)
  const distributionChartData = gradeDistribution.length > 0 ? {
    labels: gradeDistribution.map(d => d.range),
    datasets: [
      {
        label: 'Number of Students',
        data: gradeDistribution.map(d => d.studentCount),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
      {
        label: 'Your Position',
        data: gradeDistribution.map((d, idx) => d.studentPosition > 0 ? d.studentPosition : null),
        type: 'line' as const,
        borderColor: 'rgba(29, 128, 195, 1)',
        backgroundColor: 'rgba(29, 128, 195, 0.2)',
        borderWidth: 3,
        pointRadius: 8,
        pointBackgroundColor: 'rgba(29, 128, 195, 1)',
        fill: false,
      },
    ],
  } : null;

  // 5. Percentile Gauge (Doughnut Chart)
  const percentileChartData = overallComparison ? {
    labels: ['Your Percentile', 'Below You'],
    datasets: [
      {
        data: [
          overallComparison.percentile,
          100 - overallComparison.percentile,
        ],
        backgroundColor: [
          'rgba(29, 128, 195, 0.8)',
          'rgba(200, 200, 200, 0.3)',
        ],
        borderColor: [
          'rgba(29, 128, 195, 1)',
          'rgba(200, 200, 200, 0.5)',
        ],
        borderWidth: 2,
      },
    ],
  } : null;

  // 6. Performance Trend (Line Chart - Student vs Class over time)
  const trendChartData = assignmentComparisons.length > 0 ? {
    labels: assignmentComparisons.map((_, idx) => `Assignment ${idx + 1}`),
    datasets: [
      {
        label: 'Your Score',
        data: assignmentComparisons.map(a => a.studentScore),
        borderColor: 'rgba(29, 128, 195, 1)',
        backgroundColor: 'rgba(29, 128, 195, 0.2)',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Class Average',
        data: assignmentComparisons.map(a => a.classAverage),
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderWidth: 2,
        borderDash: [5, 5],
        tension: 0.4,
        fill: false,
      },
    ],
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${context.parsed.y?.toFixed(1) || context.parsed}%`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function(value: any) {
            return value + '%';
          },
        },
      },
    },
  };

  const horizontalChartOptions = {
    ...chartOptions,
    indexAxis: 'y' as const,
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
        Performance Comparison with Class
      </Typography>
      
      <Grid container spacing={3}>
        {/* Overall Performance Comparison */}
        {overallChartData && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader 
                title="Overall Performance Comparison"
                subheader="Your score vs class statistics"
              />
              <CardContent>
                <ChartWrapper>
                  <BarChart 
                    data={overallChartData} 
                    options={chartOptions}
                    height={300}
                  />
                </ChartWrapper>
                {overallComparison && (
                  <Box mt={2} display="flex" justifyContent="space-around" flexWrap="wrap" gap={1}>
                    <Chip 
                      label={`Percentile: ${overallComparison.percentile}th`}
                      color="primary"
                      size="small"
                    />
                    <Chip 
                      label={`Total Students: ${overallComparison.totalStudents}`}
                      color="default"
                      size="small"
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Percentile Gauge */}
        {percentileChartData && overallComparison && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader 
                title="Class Percentile Ranking"
                subheader={`You're in the ${overallComparison.percentile}th percentile`}
              />
              <CardContent>
                <Box display="flex" flexDirection="column" alignItems="center">
                  <ChartWrapper>
                    <DoughnutChart 
                      data={percentileChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { position: 'bottom' },
                          tooltip: {
                            callbacks: {
                              label: function(context: any) {
                                return `${context.label}: ${context.parsed}%`;
                              },
                            },
                          },
                        },
                      }}
                      height={250}
                    />
                  </ChartWrapper>
                  <Typography variant="h3" fontWeight="bold" color="primary" sx={{ mt: 2 }}>
                    {overallComparison.percentile}th
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Percentile
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Assignment-by-Assignment Comparison */}
        {assignmentChartData && (
          <Grid item xs={12}>
            <Card>
              <CardHeader 
                title="Assignment Performance: You vs Class Average"
                subheader="Compare your scores on each assignment"
              />
              <CardContent>
                <ChartWrapper>
                  <BarChart 
                    data={assignmentChartData} 
                    options={{
                      ...chartOptions,
                      scales: {
                        ...chartOptions.scales,
                        x: {
                          ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                          },
                        },
                      },
                    }}
                    height={350}
                  />
                </ChartWrapper>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Performance Trend Over Time */}
        {trendChartData && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader 
                title="Performance Trend"
                subheader="Your progress vs class average over time"
              />
              <CardContent>
                <ChartWrapper>
                  <LineChart 
                    data={trendChartData} 
                    options={chartOptions}
                    height={300}
                  />
                </ChartWrapper>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Grade Distribution */}
        {distributionChartData && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader 
                title="Grade Distribution"
                subheader="Where you stand in the class distribution"
              />
              <CardContent>
                <ChartWrapper>
                  <BarChart 
                    data={distributionChartData} 
                    options={chartOptions}
                    height={300}
                  />
                </ChartWrapper>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Course Performance Comparison */}
        {courseChartData && (
          <Grid item xs={12}>
            <Card>
              <CardHeader 
                title="Course Performance Comparison"
                subheader="Your scores vs class average by course"
              />
              <CardContent>
                <ChartWrapper>
                  <BarChart 
                    data={courseChartData} 
                    options={horizontalChartOptions}
                    height={Math.max(200, courseComparisons.length * 60)}
                  />
                </ChartWrapper>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};


