import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetStaticProps, GetStaticPaths } from 'next';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import axios from 'axios';
import Link from 'next/link';
import { API_BASE_URL } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { TopNavBar } from '@/components/layout/TopNavBar';

axios.defaults.baseURL = API_BASE_URL;
axios.defaults.headers.common['Accept'] = 'application/json';

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface Result {
  id: string;
  student_id?: string;
  student_name: string;
  score: number;
  total_points: number;
  percentage: number;
  grade_letter: string;
  graded_at: string;
  overall_feedback?: string;
}

// Static generation for dynamic routes - compile at build time
export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: [],
    fallback: 'blocking', // Generate page on-demand but cache it
  };
};

export const getStaticProps: GetStaticProps = async (context) => {
  return {
    props: {},
    revalidate: 3600, // Revalidate every hour
  };
};

export default function AssignmentResults() {
  const router = useRouter();
  const { assignmentId } = router.query;
  const { user } = useAuth();
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (assignmentId) {
      fetchResults();
    }
  }, [assignmentId]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/results/assignment/${assignmentId}`);
      if (response.data && response.data.results) {
        setResults(response.data.results);
      }
    } catch (err: any) {
      console.error('Error fetching results:', err);
      setError('Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const downloadResults = async () => {
    try {
      const response = await axios.get(`/api/results/assignment/${assignmentId}`);
      const dataStr = JSON.stringify(response.data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = window.URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `results_${assignmentId}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading results:', err);
    }
  };

  // Calculate statistics
  const stats = results.length > 0 ? {
    average: results.reduce((sum, r) => sum + r.percentage, 0) / results.length,
    highest: Math.max(...results.map(r => r.percentage)),
    lowest: Math.min(...results.map(r => r.percentage)),
    passing: results.filter(r => r.percentage >= 60).length,
  } : null;

  // Filter results for students (only their own)
  const displayResults = user?.role === 'student'
    ? results.filter(r => r.student_id === String(user.id))
    : results;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <TopNavBar />
      <Container maxWidth="lg" sx={{ py: 6, pt: { xs: 12, sm: 12 } }}>
        <Box mb={3} display="flex" alignItems="center" gap={2}>
          <IconButton component={Link} href="/results">
            <ArrowBackIcon />
          </IconButton>
          <Typography 
            variant="h3" 
            component="h1" 
            fontWeight="bold"
            sx={{ 
              background: 'linear-gradient(135deg, #1D80C3 0%, #4F46E5 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Assignment Results: {assignmentId}
          </Typography>
        {(user?.role === 'teacher' || user?.role === 'admin') && (
          <Button
            startIcon={<DownloadIcon />}
            onClick={downloadResults}
            variant="outlined"
            sx={{ ml: 'auto' }}
          >
            Download
          </Button>
        )}
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Paper sx={{ p: 3 }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      ) : displayResults.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6">No results found</Typography>
        </Paper>
      ) : (
        <>
          {stats && (user?.role === 'teacher' || user?.role === 'admin' || user?.role === 'grader') && (
            <Grid container spacing={2} mb={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">Average</Typography>
                    <Typography variant="h5">{stats.average.toFixed(1)}%</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">Highest</Typography>
                    <Typography variant="h5">{stats.highest.toFixed(1)}%</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">Lowest</Typography>
                    <Typography variant="h5">{stats.lowest.toFixed(1)}%</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">Passing</Typography>
                    <Typography variant="h5">{stats.passing}/{results.length}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Student</TableCell>
                  <TableCell align="center">Score</TableCell>
                  <TableCell align="center">Percentage</TableCell>
                  <TableCell align="center">Grade</TableCell>
                  <TableCell>Graded At</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayResults.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell>{result.student_name}</TableCell>
                    <TableCell align="center">{result.score}/{result.total_points}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${result.percentage.toFixed(1)}%`}
                        size="small"
                        color={
                          result.percentage >= 70 ? 'success' :
                          result.percentage >= 50 ? 'warning' : 'error'
                        }
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={result.grade_letter} size="small" />
                    </TableCell>
                    <TableCell>{formatDate(result.graded_at)}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => router.replace(`/results/${result.id}`)}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
      </Container>
    </div>
  );
}

