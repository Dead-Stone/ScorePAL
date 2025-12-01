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
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
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
import SearchIcon from '@mui/icons-material/Search';
import { API_BASE_URL } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';

// Configure axios
axios.defaults.baseURL = API_BASE_URL;
axios.defaults.headers.common['Accept'] = 'application/json';

// Add auth token to requests
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Types
interface Result {
  id: string;
  assignment_id: string;
  student_id?: string;
  student_name: string;
  score: number;
  total_points: number;
  percentage: number;
  grade_letter: string;
  graded_at: string;
  overall_feedback?: string;
}

interface AssignmentGroup {
  assignment_id: string;
  results: Result[];
  count: number;
  average_score: number;
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
  const { user, isAuthenticated } = useAuth();
  const [results, setResults] = useState<Result[]>([]);
  const [assignmentGroups, setAssignmentGroups] = useState<AssignmentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAssignment, setFilterAssignment] = useState<string>('all');
  const [stats, setStats] = useState({
    totalAssignments: 0,
    totalSubmissions: 0,
    averageScore: 0,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    fetchResults();
  }, [isAuthenticated]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch results from new MongoDB API
      const response = await axios.get('/api/results', {
        params: {
          limit: 1000, // Get all results
        }
      });
      
      if (response.data && response.data.results) {
        const fetchedResults: Result[] = response.data.results;
        setResults(fetchedResults);
        
        // Group results by assignment
        const grouped = groupResultsByAssignment(fetchedResults);
        setAssignmentGroups(grouped);
        
        // Calculate stats
        const uniqueAssignments = new Set(fetchedResults.map(r => r.assignment_id));
        const totalSubmissions = fetchedResults.length;
        const averageScore = fetchedResults.length > 0
          ? fetchedResults.reduce((sum, r) => sum + r.percentage, 0) / fetchedResults.length
          : 0;
        
        setStats({
          totalAssignments: uniqueAssignments.size,
          totalSubmissions,
          averageScore,
        });
      }
    } catch (err: any) {
      console.error('Error fetching results:', err);
      if (err.response?.status === 401) {
        setError('Please log in to view results.');
        router.push('/auth/login');
      } else {
        setError('Failed to load results. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const groupResultsByAssignment = (results: Result[]): AssignmentGroup[] => {
    const groups = new Map<string, Result[]>();
    
    results.forEach(result => {
      const assignmentId = result.assignment_id;
      if (!groups.has(assignmentId)) {
        groups.set(assignmentId, []);
      }
      groups.get(assignmentId)!.push(result);
    });
    
    return Array.from(groups.entries()).map(([assignmentId, assignmentResults]) => {
      const averageScore = assignmentResults.length > 0
        ? assignmentResults.reduce((sum, r) => sum + r.percentage, 0) / assignmentResults.length
        : 0;
      
      return {
        assignment_id: assignmentId,
        results: assignmentResults,
        count: assignmentResults.length,
        average_score: averageScore,
      };
    }).sort((a, b) => {
      // Sort by most recent graded date
      const aLatest = Math.max(...a.results.map(r => new Date(r.graded_at).getTime()));
      const bLatest = Math.max(...b.results.map(r => new Date(r.graded_at).getTime()));
      return bLatest - aLatest;
    });
  };

  const filteredGroups = assignmentGroups.filter(group => {
    const matchesSearch = searchTerm === '' || 
      group.assignment_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.results.some(r => r.student_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = filterAssignment === 'all' || group.assignment_id === filterAssignment;
    
    return matchesSearch && matchesFilter;
  });

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
      setError('Failed to download results');
    }
  };

  const getPageTitle = () => {
    if (user?.role === 'student') {
      return 'My Results';
    } else if (user?.role === 'grader') {
      return 'Grading Results';
    }
    return 'All Results';
  };

  const getPageSubtitle = () => {
    if (user?.role === 'student') {
      return 'View your graded assignments and feedback';
    } else if (user?.role === 'grader') {
      return 'View results for assignments you are grading';
    }
    return 'View and analyze all grading results';
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          {getPageTitle()}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          {getPageSubtitle()}
        </Typography>
      </Box>

      {/* Search and Filter */}
      <Box mb={3} display="flex" gap={2} flexWrap="wrap">
        <TextField
          placeholder="Search assignments or students..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ flexGrow: 1, minWidth: 200 }}
        />
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Filter by Assignment</InputLabel>
          <Select
            value={filterAssignment}
            onChange={(e) => setFilterAssignment(e.target.value)}
            label="Filter by Assignment"
          >
            <MenuItem value="all">All Assignments</MenuItem>
            {assignmentGroups.map((group) => (
              <MenuItem key={group.assignment_id} value={group.assignment_id}>
                {group.assignment_id} ({group.count} results)
              </MenuItem>
            ))}
          </Select>
        </FormControl>
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
      ) : filteredGroups.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            No results found
          </Typography>
          <Typography color="textSecondary" paragraph>
            {searchTerm || filterAssignment !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : user?.role === 'student'
              ? 'You don\'t have any graded assignments yet.'
              : 'No grading results available. Start by grading some assignments.'}
          </Typography>
          {user?.role !== 'student' && (
            <Button 
              variant="contained" 
              component={Link} 
              href="/"
              sx={{ mt: 2 }}
            >
              Grade New Assignment
            </Button>
          )}
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredGroups.map((group) => (
            <Grid item xs={12} key={group.assignment_id}>
              <Card elevation={2}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Box display="flex" alignItems="center">
                      <AssignmentIcon color="primary" sx={{ mr: 1.5 }} />
                      <Box>
                        <Typography variant="h6" fontWeight="medium">
                          {group.assignment_id}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {group.count} {group.count === 1 ? 'result' : 'results'}
                        </Typography>
                      </Box>
                    </Box>
                    <Box display="flex" gap={1} alignItems="center">
                      <Chip 
                        label={`Avg: ${group.average_score.toFixed(1)}%`}
                        color={group.average_score >= 70 ? 'success' : group.average_score >= 50 ? 'warning' : 'error'}
                        size="small"
                      />
                      <Tooltip title="View Assignment Results">
                        <IconButton 
                          color="primary"
                          onClick={() => router.push(`/results/assignment/${group.assignment_id}`)}
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="View Analytics">
                        <IconButton 
                          color="secondary"
                          onClick={() => router.push(`/analytics/assignment/${group.assignment_id}`)}
                        >
                          <BarChartIcon />
                        </IconButton>
                      </Tooltip>
                      {(user?.role === 'teacher' || user?.role === 'admin') && (
                        <Tooltip title="Download Results">
                          <IconButton 
                            color="default"
                            onClick={() => downloadResults(group.assignment_id)}
                          >
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  {/* Show individual results for students, summary for teachers */}
                  {user?.role === 'student' ? (
                    <Box>
                      {group.results
                        .filter(r => r.student_id === user.id)
                        .map((result) => (
                          <Box key={result.id} mb={2} p={2} sx={{ bgcolor: 'background.default', borderRadius: 1 }}>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Box>
                                <Typography variant="body1" fontWeight="medium">
                                  Score: {result.score}/{result.total_points} ({result.percentage.toFixed(1)}%)
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Grade: {result.grade_letter} • {formatDate(result.graded_at)}
                                </Typography>
                              </Box>
                              <Chip 
                                label={result.grade_letter}
                                color={
                                  result.percentage >= 90 ? 'success' :
                                  result.percentage >= 80 ? 'primary' :
                                  result.percentage >= 70 ? 'info' :
                                  result.percentage >= 60 ? 'warning' : 'error'
                                }
                              />
                            </Box>
                            {result.overall_feedback && (
                              <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                                {result.overall_feedback.substring(0, 150)}...
                              </Typography>
                            )}
                            <Button
                              size="small"
                              onClick={() => router.push(`/results/${result.id}`)}
                              sx={{ mt: 1 }}
                            >
                              View Details
                            </Button>
                          </Box>
                        ))}
                    </Box>
                  ) : (
                    <TableContainer>
                      <Table size="small">
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
                          {group.results.slice(0, 5).map((result) => (
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
                                <IconButton 
                                  size="small"
                                  onClick={() => router.push(`/results/${result.id}`)}
                                >
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {group.results.length > 5 && (
                        <Box p={2} textAlign="center">
                          <Button 
                            size="small"
                            onClick={() => router.push(`/results/assignment/${group.assignment_id}`)}
                          >
                            View All {group.results.length} Results
                          </Button>
                        </Box>
                      )}
                    </TableContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
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