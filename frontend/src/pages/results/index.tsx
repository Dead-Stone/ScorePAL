import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  CircularProgress,
  Divider,
  Chip,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';
import AssignmentIcon from '@mui/icons-material/Assignment';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BarChartIcon from '@mui/icons-material/BarChart';
import DownloadIcon from '@mui/icons-material/Download';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import EventIcon from '@mui/icons-material/Event';
import PeopleIcon from '@mui/icons-material/People';

// Configure axios
axios.defaults.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
axios.defaults.headers.common['Accept'] = 'application/json';

// Types
interface Assignment {
  id: string;
  name: string;
  created_at: string;
  submission_count: number;
  average_score?: number;
  passing_count?: number;
  has_results: boolean;
}

// Styled components
const GradientCard = styled(Card)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
  color: theme.palette.primary.contrastText,
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: theme.shadows[10],
  },
}));

const StatCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  transition: 'all 0.2s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
  },
}));

// Main component
export default function RecentResults() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalAssignments: 0,
    totalSubmissions: 0,
    averageScore: 0,
  });

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/assignments');
        if (response.data && Array.isArray(response.data.assignments)) {
          const assignmentsWithResults = response.data.assignments.filter(
            (a: Assignment) => a.has_results
          );
          setAssignments(assignmentsWithResults);
          
          // Calculate stats
          if (assignmentsWithResults.length > 0) {
            const totalSubmissions = assignmentsWithResults.reduce(
              (sum: number, a: Assignment) => sum + a.submission_count, 0
            );
            
            const averageScores = assignmentsWithResults
              .filter((a: Assignment) => a.average_score !== undefined)
              .map((a: Assignment) => a.average_score as number);
              
            const overallAverage = averageScores.length > 0
              ? averageScores.reduce((sum: number, score: number) => sum + score, 0) / averageScores.length
              : 0;
            
            setStats({
              totalAssignments: assignmentsWithResults.length,
              totalSubmissions,
              averageScore: overallAverage,
            });
          }
        }
      } catch (err) {
        console.error('Error fetching assignments:', err);
        setError('Failed to load assignments. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, []);

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const downloadResults = async (assignmentId: string) => {
    try {
      const response = await axios.get(`/grading-results/${assignmentId}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `results_${assignmentId}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error downloading results:', err);
      setError('Failed to download results');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          Recently Graded Assignments
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          View and analyze your recent grading results
        </Typography>
      </Box>

      {/* Stats Overview */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={4}>
          <StatCard>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <AssignmentIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" fontWeight="medium">
                  Assignments
                </Typography>
              </Box>
              <Typography variant="h3" fontWeight="bold">
                {stats.totalAssignments}
              </Typography>
            </CardContent>
          </StatCard>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <StatCard>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <PeopleIcon color="secondary" sx={{ mr: 1 }} />
                <Typography variant="h6" fontWeight="medium">
                  Submissions
                </Typography>
              </Box>
              <Typography variant="h3" fontWeight="bold">
                {stats.totalSubmissions}
              </Typography>
            </CardContent>
          </StatCard>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <StatCard>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <TrendingUpIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6" fontWeight="medium">
                  Average Score
                </Typography>
              </Box>
              <Typography variant="h3" fontWeight="bold">
                {stats.averageScore.toFixed(1)}%
              </Typography>
            </CardContent>
          </StatCard>
        </Grid>
      </Grid>

      {/* Main content */}
      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Paper sx={{ p: 3, backgroundColor: '#fff8f8' }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      ) : assignments.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            No graded assignments found
          </Typography>
          <Typography color="textSecondary" paragraph>
            Start by grading some assignments from the home page.
          </Typography>
          <Button 
            variant="contained" 
            component={Link} 
            href="/"
            sx={{ mt: 2 }}
          >
            Grade New Assignment
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper} elevation={2}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                <TableCell>Assignment Name</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="center">Submissions</TableCell>
                <TableCell align="center">Avg. Score</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assignments.map((assignment) => (
                <TableRow 
                  key={assignment.id}
                  sx={{ '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }}
                >
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <AssignmentIcon color="primary" sx={{ mr: 1.5 }} />
                      <Typography fontWeight="medium">
                        {assignment.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <EventIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                      {formatDate(assignment.created_at)}
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={assignment.submission_count} 
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={assignment.average_score ? `${assignment.average_score.toFixed(1)}%` : 'N/A'} 
                      size="small"
                      color={
                        !assignment.average_score ? 'default' :
                        assignment.average_score >= 70 ? 'success' : 
                        assignment.average_score >= 50 ? 'warning' : 'error'
                      }
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Box>
                      <Tooltip title="View Results">
                        <IconButton 
                          color="primary"
                          onClick={() => router.push(`/results/${assignment.id}`)}
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="View Analytics">
                        <IconButton 
                          color="secondary"
                          onClick={() => router.push(`/analytics/${assignment.id}`)}
                        >
                          <BarChartIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Download Results">
                        <IconButton 
                          color="default"
                          onClick={() => downloadResults(assignment.id)}
                        >
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Box mt={4} display="flex" justifyContent="space-between">
        <Button 
          variant="outlined"
          component={Link}
          href="/"
        >
          Back to Home
        </Button>
        <Button
          variant="contained"
          component={Link}
          href="/analytics"
        >
          Analytics Dashboard
        </Button>
      </Box>
    </Container>
  );
} 