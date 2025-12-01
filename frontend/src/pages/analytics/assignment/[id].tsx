import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import IconButton from '@mui/material/IconButton';
import Link from 'next/link';
import axios from 'axios';
import { API_BASE_URL } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('react-chartjs-2').then(mod => mod.Bar), { ssr: false });
const PieChart = dynamic(() => import('react-chartjs-2').then(mod => mod.Pie), { ssr: false });

axios.defaults.baseURL = API_BASE_URL;
axios.defaults.headers.common['Accept'] = 'application/json';

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface AnalyticsData {
  assignment_id: string;
  class_stats: {
    total_submissions: number;
    graded_submissions: number;
    average_score: number;
    median_score: number;
    highest_score: number;
    lowest_score: number;
    pass_rate: number;
    fail_rate: number;
    grade_distribution: Record<string, number>;
  };
  rubric_performance: Array<{
    criterion_name: string;
    average_score: number;
    max_points: number;
    average_percentage: number;
    difficulty_level: string;
  }>;
  student_rankings: Array<{
    rank: number;
    score: number;
    percentage: number;
    is_anonymized: boolean;
  }>;
  common_mistakes: Array<{
    mistake: string;
    count: number;
  }>;
}

export default function AssignmentAnalytics() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchAnalytics();
    }
  }, [id]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/analytics/assignment/${id}`);
      setAnalytics(response.data);
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const getGradeDistributionData = () => {
    if (!analytics?.class_stats.grade_distribution) return null;
    
    return {
      labels: Object.keys(analytics.class_stats.grade_distribution),
      datasets: [{
        label: 'Number of Students',
        data: Object.values(analytics.class_stats.grade_distribution),
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(255, 99, 132, 0.6)',
          'rgba(153, 102, 255, 0.6)',
        ],
      }],
    };
  };

  const getRubricPerformanceData = () => {
    if (!analytics?.rubric_performance) return null;
    
    return {
      labels: analytics.rubric_performance.map(r => r.criterion_name),
      datasets: [{
        label: 'Average Percentage',
        data: analytics.rubric_performance.map(r => r.average_percentage),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
      }],
    };
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box mb={3} display="flex" alignItems="center" gap={2}>
        <IconButton component={Link} href="/analytics">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Analytics: {id}
        </Typography>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : !analytics ? (
        <Alert severity="info">No analytics data available</Alert>
      ) : (
        <>
          {/* Class Statistics */}
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">Total Submissions</Typography>
                  <Typography variant="h4">{analytics.class_stats.total_submissions}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">Average Score</Typography>
                  <Typography variant="h4">{analytics.class_stats.average_score.toFixed(1)}%</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">Pass Rate</Typography>
                  <Typography variant="h4">{(analytics.class_stats.pass_rate).toFixed(1)}%</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">Median Score</Typography>
                  <Typography variant="h4">{analytics.class_stats.median_score.toFixed(1)}%</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Charts */}
          <Grid container spacing={3} mb={3}>
            {getGradeDistributionData() && (
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>Grade Distribution</Typography>
                  <Box sx={{ height: 300 }}>
                    <Chart
                      data={getGradeDistributionData()!}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                        },
                      }}
                    />
                  </Box>
                </Paper>
              </Grid>
            )}

            {getRubricPerformanceData() && (
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>Rubric Performance</Typography>
                  <Box sx={{ height: 300 }}>
                    <Chart
                      data={getRubricPerformanceData()!}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                        },
                      }}
                    />
                  </Box>
                </Paper>
              </Grid>
            )}
          </Grid>

          {/* Rubric Performance Table */}
          {analytics.rubric_performance && analytics.rubric_performance.length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>Rubric Criterion Performance</Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Criterion</TableCell>
                      <TableCell align="center">Average Score</TableCell>
                      <TableCell align="center">Max Points</TableCell>
                      <TableCell align="center">Average %</TableCell>
                      <TableCell align="center">Difficulty</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analytics.rubric_performance.map((criterion, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{criterion.criterion_name}</TableCell>
                        <TableCell align="center">{criterion.average_score.toFixed(1)}</TableCell>
                        <TableCell align="center">{criterion.max_points}</TableCell>
                        <TableCell align="center">{criterion.average_percentage.toFixed(1)}%</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={criterion.difficulty_level}
                            size="small"
                            color={
                              criterion.difficulty_level === 'easy' ? 'success' :
                              criterion.difficulty_level === 'medium' ? 'warning' : 'error'
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          {/* Common Mistakes */}
          {analytics.common_mistakes && analytics.common_mistakes.length > 0 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Common Mistakes</Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Mistake</TableCell>
                      <TableCell align="center">Frequency</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analytics.common_mistakes.map((mistake, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{mistake.mistake}</TableCell>
                        <TableCell align="center">{mistake.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </>
      )}
    </Container>
  );
}

