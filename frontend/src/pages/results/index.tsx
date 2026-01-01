/**
 * ScorePAL - Results Dashboard
 * Comprehensive view of AI grading results with filters, charts, and export
 * Statically generated at build time - data fetched client-side
 */

import React, { useState, useEffect, useMemo } from 'react';
import { GetStaticProps } from 'next';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Button,
  CircularProgress,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Tabs,
  Tab,
  LinearProgress,
  Collapse,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { styled, useTheme, alpha } from '@mui/material/styles';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';
import { TopNavBar } from '@/components/layout/TopNavBar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import AssignmentIcon from '@mui/icons-material/Assignment';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BarChartIcon from '@mui/icons-material/BarChart';
import DownloadIcon from '@mui/icons-material/Download';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import PeopleIcon from '@mui/icons-material/People';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterListIcon from '@mui/icons-material/FilterList';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import GradeIcon from '@mui/icons-material/Grade';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import ViewListIcon from '@mui/icons-material/ViewList';
import GridViewIcon from '@mui/icons-material/GridView';
import InsertChartIcon from '@mui/icons-material/InsertChart';
import { API_BASE_URL } from '@/config/api';
import { SavedViewsManager, SavedView } from '@/components/results/SavedViewsManager';
import BookmarkIcon from '@mui/icons-material/Bookmark';

// Dynamic import for Chart.js
import dynamic from 'next/dynamic';
import { ChartWrapper } from '@/components/charts/ChartWrapper';
import { registerChartJS } from '@/utils/chartRegistry';

// Pre-register Chart.js on module load
if (typeof window !== 'undefined') {
  registerChartJS();
}

const BarChart = dynamic(() => import('react-chartjs-2').then(mod => mod.Bar), { ssr: false });
const PieChart = dynamic(() => import('react-chartjs-2').then(mod => mod.Pie), { ssr: false });
const LineChart = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), { ssr: false });

// Use centralized apiClient
import apiClient from '@/utils/apiClient';

// Types
interface RubricScore {
  criterion: string;
  score: number;
  max_score: number;
  feedback: string;
}

interface Result {
  id: string;
  assignment_id: string;
  assignment_name?: string;
  student_id?: string;
  student_name: string;
  score: number;
  total_points: number;
  percentage: number;
  grade_letter: string;
  graded_at: string;
  overall_feedback?: string;
  rubric_scores?: RubricScore[];
}

interface AssignmentGroup {
  assignment_id: string;
  assignment_name?: string;
  results: Result[];
  count: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
  passing_count: number;
  latest_graded: string;
}

interface CachedResults {
  results: Result[];
  timestamp: number;
}

type SortField = 'student_name' | 'percentage' | 'grade_letter' | 'graded_at';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'cards' | 'table';

const RESULTS_CACHE_KEY = 'scorepal_results_cache';
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

const getResultsCache = (): CachedResults | null => {
  try {
    const cached = localStorage.getItem(RESULTS_CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached) as CachedResults;
      if (Date.now() - data.timestamp < CACHE_DURATION) {
        return data;
      }
    }
  } catch (err) {
    // Cache read error - silently fail
  }
  return null;
};

const setResultsCache = (results: Result[]) => {
  try {
    const data: CachedResults = { results, timestamp: Date.now() };
    localStorage.setItem(RESULTS_CACHE_KEY, JSON.stringify(data));
  } catch (err) {
    // Cache write error - silently fail
  }
};

const clearResultsCache = () => {
  try {
    localStorage.removeItem(RESULTS_CACHE_KEY);
  } catch (err) {
    // Cache clear error - silently fail
  }
};

// Styled components
const StatsCard = styled(Card)(({ theme }) => ({
  height: '100%',
  transition: 'all 0.2s ease',
  borderRadius: theme.shape.borderRadius * 2,
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
  },
}));

const AssignmentCard = styled(Card)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius * 2,
  overflow: 'hidden',
  transition: 'all 0.2s ease',
  '&:hover': {
    boxShadow: theme.shadows[6],
  },
}));

const GradeChip = styled(Chip)<{ grade: string }>(({ theme, grade }) => {
  const colors: Record<string, string> = {
    'A+': theme.palette.success.dark,
    'A': theme.palette.success.main,
    'A-': theme.palette.success.light,
    'B+': theme.palette.primary.main,
    'B': theme.palette.primary.light,
    'B-': theme.palette.info.main,
    'C+': theme.palette.info.light,
    'C': theme.palette.warning.main,
    'C-': theme.palette.warning.light,
    'D': theme.palette.error.light,
    'F': theme.palette.error.main,
  };
  
  return {
    backgroundColor: alpha(colors[grade] || theme.palette.grey[500], 0.15),
    color: colors[grade] || theme.palette.grey[700],
    fontWeight: 'bold',
    borderRadius: '8px',
  };
});

// Static generation - compile at build time only
export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {},
    revalidate: 3600, // Revalidate every hour
  };
};

export default function ResultsDashboard() {
  const router = useRouter();
  const theme = useTheme();
  const { user, isAuthenticated } = useAuth();
  
  // State
  const [results, setResults] = useState<Result[]>([]);
  const [assignmentGroups, setAssignmentGroups] = useState<AssignmentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState<string>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'all' | '7days' | '30days' | '90days'>('all');
  const [scoreRange, setScoreRange] = useState<string>('all');
  const [resultType, setResultType] = useState<'all' | 'single' | 'batch' | 'canvas'>('all');
  
  // Saved views
  const [savedViewsOpen, setSavedViewsOpen] = useState(false);
  
  // View
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [activeTab, setActiveTab] = useState(0);
  const [sortField, setSortField] = useState<SortField>('graded_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(1);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [selectedResult, setSelectedResult] = useState<Result | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  const resultsPerPage = 10;

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    initializeResults();
  }, [isAuthenticated]);

  // Listen for grading completion events to refresh results
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleGradingComplete = () => {
      // Refresh results after a short delay to allow backend to save
      setTimeout(() => {
        fetchResults(true); // Pass true to force refresh
      }, 2000);
    };

    window.addEventListener('gradingCompleted', handleGradingComplete);
    return () => {
      window.removeEventListener('gradingCompleted', handleGradingComplete);
    };
  }, [isAuthenticated]);

  const initializeResults = async () => {
    setLoading(true);
    
    // Try cache first
    const cached = getResultsCache();
    if (cached && cached.results.length > 0) {
      setResults(cached.results);
      const grouped = groupResultsByAssignment(cached.results);
      setAssignmentGroups(grouped);
      if (grouped.length > 0) {
        setExpandedGroups([grouped[0].assignment_id]);
      }
      setLastRefreshed(new Date(cached.timestamp));
      setLoading(false);
      return;
    }
    
    await fetchResults();
  };

  const fetchResults = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        clearResultsCache();
      } else {
        setLoading(true);
      }
      setError('');
      
      const response = await apiClient.get('/api/results', {
        params: { limit: 1000 }
      });
      
      if (response.data?.results) {
        const fetchedResults: Result[] = response.data.results;
        setResults(fetchedResults);
        setResultsCache(fetchedResults);
        setLastRefreshed(new Date());
        
        const grouped = groupResultsByAssignment(fetchedResults);
        setAssignmentGroups(grouped);
        
        if (grouped.length > 0 && expandedGroups.length === 0) {
          setExpandedGroups([grouped[0].assignment_id]);
        }
      }
    } catch (err: any) {
      // Error handled by UI state
      if (err.response?.status === 401) {
        setError('Please log in to view results.');
        router.push('/auth/login');
      } else {
        setError('Failed to load results. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatLastRefreshed = () => {
    if (!lastRefreshed) return '';
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastRefreshed.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return lastRefreshed.toLocaleDateString();
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
      const scores = assignmentResults.map(r => r.percentage);
      const averageScore = scores.length > 0
        ? scores.reduce((sum, s) => sum + s, 0) / scores.length
        : 0;
      
      return {
        assignment_id: assignmentId,
        assignment_name: assignmentResults[0]?.assignment_name || assignmentId,
        results: assignmentResults,
        count: assignmentResults.length,
        average_score: averageScore,
        highest_score: Math.max(...scores, 0),
        lowest_score: Math.min(...scores, 100),
        passing_count: assignmentResults.filter(r => r.percentage >= 60).length,
        latest_graded: assignmentResults.reduce((latest, r) => 
          new Date(r.graded_at) > new Date(latest) ? r.graded_at : latest, 
          assignmentResults[0]?.graded_at || ''
        ),
      };
    }).sort((a, b) => new Date(b.latest_graded).getTime() - new Date(a.latest_graded).getTime());
  };

  // Compute stats
  const stats = useMemo(() => {
    const totalAssignments = assignmentGroups.length;
    const totalSubmissions = results.length;
    const averageScore = results.length > 0
      ? results.reduce((sum, r) => sum + r.percentage, 0) / results.length
      : 0;
    const passingCount = results.filter(r => r.percentage >= 60).length;
    const passRate = totalSubmissions > 0 ? (passingCount / totalSubmissions) * 100 : 0;
    
    // Grade distribution
    const gradeDistribution: Record<string, number> = {};
    results.forEach(r => {
      gradeDistribution[r.grade_letter] = (gradeDistribution[r.grade_letter] || 0) + 1;
    });
    
    // Score ranges
    const scoreRanges = {
      '90-100': results.filter(r => r.percentage >= 90).length,
      '80-89': results.filter(r => r.percentage >= 80 && r.percentage < 90).length,
      '70-79': results.filter(r => r.percentage >= 70 && r.percentage < 80).length,
      '60-69': results.filter(r => r.percentage >= 60 && r.percentage < 70).length,
      '0-59': results.filter(r => r.percentage < 60).length,
    };
    
    return {
      totalAssignments,
      totalSubmissions,
      averageScore,
      passRate,
      passingCount,
      gradeDistribution,
      scoreRanges,
    };
  }, [results, assignmentGroups]);

  // Filtered results
  const filteredResults = useMemo(() => {
    let filtered = [...results];
    
    // Search
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.student_name.toLowerCase().includes(search) ||
        r.assignment_id.toLowerCase().includes(search) ||
        r.assignment_name?.toLowerCase().includes(search)
      );
    }
    
    // Assignment filter
    if (selectedAssignment !== 'all') {
      filtered = filtered.filter(r => r.assignment_id === selectedAssignment);
    }
    
    // Grade filter
    if (gradeFilter !== 'all') {
      filtered = filtered.filter(r => r.grade_letter === gradeFilter);
    }
    
    // Date filter
    if (dateRange !== 'all') {
      const now = new Date();
      const days = dateRange === '7days' ? 7 : dateRange === '30days' ? 30 : 90;
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(r => new Date(r.graded_at) >= cutoff);
    }
    
    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'student_name':
          comparison = a.student_name.localeCompare(b.student_name);
          break;
        case 'percentage':
          comparison = a.percentage - b.percentage;
          break;
        case 'grade_letter':
          comparison = a.grade_letter.localeCompare(b.grade_letter);
          break;
        case 'graded_at':
          comparison = new Date(a.graded_at).getTime() - new Date(b.graded_at).getTime();
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  }, [results, searchTerm, selectedAssignment, gradeFilter, dateRange, sortField, sortOrder]);

  // Pagination
  const paginatedResults = useMemo(() => {
    const start = (page - 1) * resultsPerPage;
    return filteredResults.slice(start, start + resultsPerPage);
  }, [filteredResults, page]);

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const downloadResults = async (format: 'json' | 'csv' = 'json') => {
    try {
      const dataToExport = selectedAssignment === 'all' ? results : filteredResults;
      
      if (format === 'csv') {
        const headers = ['Student', 'Assignment', 'Score', 'Total', 'Percentage', 'Grade', 'Graded At'];
        const rows = dataToExport.map(r => [
          r.student_name,
          r.assignment_name || r.assignment_id,
          r.score,
          r.total_points,
          r.percentage.toFixed(1),
          r.grade_letter,
          r.graded_at,
        ]);
        
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `scorepal_results_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
      } else {
        const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `scorepal_results_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      // Download error handled by UI
      setError('Failed to download results');
    }
  };

  const openDetails = (result: Result) => {
    setSelectedResult(result);
    setDetailsOpen(true);
  };

  // Chart data
  const scoreDistributionData = {
    labels: Object.keys(stats.scoreRanges),
    datasets: [{
      label: 'Number of Students',
      data: Object.values(stats.scoreRanges),
      backgroundColor: [
        'rgba(76, 175, 80, 0.7)',
        'rgba(33, 150, 243, 0.7)',
        'rgba(255, 193, 7, 0.7)',
        'rgba(255, 152, 0, 0.7)',
        'rgba(244, 67, 54, 0.7)',
      ],
      borderRadius: 8,
    }]
  };

  const gradeDistributionData = {
    labels: Object.keys(stats.gradeDistribution),
    datasets: [{
      data: Object.values(stats.gradeDistribution),
      backgroundColor: [
        '#2e7d32', '#4caf50', '#81c784',
        '#1976d2', '#42a5f5', '#64b5f6',
        '#f9a825', '#ffb74d',
        '#e65100', '#f44336',
      ],
    }]
  };

  const getGradeIcon = (percentage: number) => {
    if (percentage >= 80) return <CheckCircleIcon color="success" />;
    if (percentage >= 60) return <WarningIcon color="warning" />;
    return <ErrorIcon color="error" />;
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <TopNavBar />
        <Container maxWidth="xl" sx={{ py: 6, pt: { xs: 12, sm: 12 } }}>
          {/* Header */}
          <Box mb={4} display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
            <Box>
              <Typography 
                variant="h3" 
                component="h1" 
                gutterBottom 
                fontWeight="bold"
                sx={{ 
                  background: 'linear-gradient(135deg, #1D80C3 0%, #4F46E5 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1
                }}
              >
                {user?.role === 'student' ? 'My Results' : 'Grading Results'}
              </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {user?.role === 'student' 
              ? 'View your graded assignments and feedback'
              : `${stats.totalSubmissions} submissions across ${stats.totalAssignments} assignments`
            }
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          {lastRefreshed && (
            <Chip 
              size="small" 
              label={`Updated ${formatLastRefreshed()}`} 
              variant="outlined"
              sx={{ mr: 1 }}
            />
          )}
          <Tooltip title="Refresh results (clears cache)">
            <Button
              variant="outlined"
              size="small"
              startIcon={refreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
              onClick={() => fetchResults(true)}
              disabled={refreshing}
            >
              Refresh
            </Button>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => downloadResults('csv')}
            size="small"
          >
            Export CSV
          </Button>
          <Button
            variant="contained"
            component={Link}
            href="/dashboard"
            startIcon={<InsertChartIcon />}
          >
            Dashboard
          </Button>
        </Box>
      </Box>

      {refreshing && <LinearProgress sx={{ mb: 2 }} />}

      {/* Stats Overview */}
      <Grid container spacing={2} mb={4}>
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

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="By Assignment" icon={<ViewListIcon />} iconPosition="start" />
          <Tab label="All Results" icon={<GridViewIcon />} iconPosition="start" />
          <Tab label="Overview Charts" icon={<BarChartIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
          <TextField
            placeholder="Search students or assignments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
            }}
            sx={{ minWidth: 250, flexGrow: 1 }}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Assignment</InputLabel>
            <Select
              value={selectedAssignment}
              onChange={(e) => setSelectedAssignment(e.target.value)}
              label="Assignment"
            >
              <MenuItem value="all">All Assignments</MenuItem>
              {assignmentGroups.map(g => (
                <MenuItem key={g.assignment_id} value={g.assignment_id}>
                  {g.assignment_name || g.assignment_id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Grade</InputLabel>
            <Select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              label="Grade"
            >
              <MenuItem value="all">All Grades</MenuItem>
              {['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'].map(g => (
                <MenuItem key={g} value={g}>{g}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Period</InputLabel>
            <Select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              label="Period"
            >
              <MenuItem value="all">All Time</MenuItem>
              <MenuItem value="7days">Last 7 Days</MenuItem>
              <MenuItem value="30days">Last 30 Days</MenuItem>
              <MenuItem value="90days">Last 90 Days</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="body2" color="text.secondary">
            {filteredResults.length} results
          </Typography>
        </Box>
      </Paper>

      {/* Content */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
      ) : (
        <>
          {/* Tab 0: By Assignment */}
          {activeTab === 0 && (
            <Grid container spacing={3}>
              {assignmentGroups.map(group => (
                <Grid item xs={12} key={group.assignment_id}>
                  <AssignmentCard>
                    <CardHeader
                      sx={{ 
                        cursor: 'pointer',
                        bgcolor: expandedGroups.includes(group.assignment_id) 
                          ? alpha(theme.palette.primary.main, 0.05) 
                          : 'transparent'
                      }}
                      onClick={() => toggleGroup(group.assignment_id)}
                      avatar={<AssignmentIcon color="primary" />}
                      title={
                        <Typography variant="h6" fontWeight="medium">
                          {group.assignment_name || group.assignment_id}
                        </Typography>
                      }
                      subheader={
                        <Box display="flex" gap={1} mt={0.5}>
                          <Chip size="small" label={`${group.count} submissions`} />
                          <Chip 
                            size="small" 
                            label={`Avg: ${group.average_score.toFixed(1)}%`}
                            color={group.average_score >= 70 ? 'success' : group.average_score >= 50 ? 'warning' : 'error'}
                          />
                          <Chip 
                            size="small" 
                            label={`${group.passing_count}/${group.count} passing`}
                            variant="outlined"
                          />
                        </Box>
                      }
                      action={
                        <IconButton>
                          {expandedGroups.includes(group.assignment_id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      }
                    />
                    <Collapse in={expandedGroups.includes(group.assignment_id)}>
                      <Divider />
                      <CardContent>
                        {/* Mini stats */}
                        <Grid container spacing={2} mb={2}>
                          <Grid item xs={3}>
                            <Box textAlign="center" p={1} sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), borderRadius: 1 }}>
                              <Typography variant="h6" color="success.main">{group.highest_score.toFixed(1)}%</Typography>
                              <Typography variant="caption">Highest</Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={3}>
                            <Box textAlign="center" p={1} sx={{ bgcolor: alpha(theme.palette.error.main, 0.1), borderRadius: 1 }}>
                              <Typography variant="h6" color="error.main">{group.lowest_score.toFixed(1)}%</Typography>
                              <Typography variant="caption">Lowest</Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={3}>
                            <Box textAlign="center" p={1} sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), borderRadius: 1 }}>
                              <Typography variant="h6" color="primary.main">{group.average_score.toFixed(1)}%</Typography>
                              <Typography variant="caption">Average</Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={3}>
                            <Box textAlign="center" p={1} sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), borderRadius: 1 }}>
                              <Typography variant="h6" color="info.main">
                                {((group.passing_count / group.count) * 100).toFixed(0)}%
                              </Typography>
                              <Typography variant="caption">Pass Rate</Typography>
                            </Box>
                          </Grid>
                        </Grid>

                        {/* Results table */}
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
                              {group.results.slice(0, 10).map(result => (
                                <TableRow key={result.id} hover>
                                  <TableCell>
                                    <Box display="flex" alignItems="center" gap={1}>
                                      {getGradeIcon(result.percentage)}
                                      {result.student_name}
                                    </Box>
                                  </TableCell>
                                  <TableCell align="center">
                                    {result.score}/{result.total_points}
                                  </TableCell>
                                  <TableCell align="center">
                                    <Chip 
                                      size="small"
                                      label={`${result.percentage.toFixed(1)}%`}
                                      color={result.percentage >= 70 ? 'success' : result.percentage >= 50 ? 'warning' : 'error'}
                                    />
                                  </TableCell>
                                  <TableCell align="center">
                                    <GradeChip grade={result.grade_letter} label={result.grade_letter} size="small" />
                                  </TableCell>
                                  <TableCell>{formatDate(result.graded_at)}</TableCell>
                                  <TableCell align="center">
                                    <Tooltip title="View Details">
                                      <IconButton size="small" onClick={() => openDetails(result)}>
                                        <VisibilityIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                        {group.results.length > 10 && (
                          <Box mt={2} textAlign="center">
                            <Button 
                              size="small"
                              onClick={() => {
                                setSelectedAssignment(group.assignment_id);
                                setActiveTab(1);
                              }}
                            >
                              View All {group.results.length} Results
                            </Button>
                          </Box>
                        )}
                      </CardContent>
                    </Collapse>
                  </AssignmentCard>
                </Grid>
              ))}
            </Grid>
          )}

          {/* Tab 1: All Results */}
          {activeTab === 1 && (
            <Paper>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <TableSortLabel
                          active={sortField === 'student_name'}
                          direction={sortField === 'student_name' ? sortOrder : 'asc'}
                          onClick={() => handleSort('student_name')}
                        >
                          Student
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>Assignment</TableCell>
                      <TableCell align="center">
                        <TableSortLabel
                          active={sortField === 'percentage'}
                          direction={sortField === 'percentage' ? sortOrder : 'asc'}
                          onClick={() => handleSort('percentage')}
                        >
                          Score
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="center">
                        <TableSortLabel
                          active={sortField === 'grade_letter'}
                          direction={sortField === 'grade_letter' ? sortOrder : 'asc'}
                          onClick={() => handleSort('grade_letter')}
                        >
                          Grade
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel
                          active={sortField === 'graded_at'}
                          direction={sortField === 'graded_at' ? sortOrder : 'asc'}
                          onClick={() => handleSort('graded_at')}
                        >
                          Date
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedResults.map(result => (
                      <TableRow key={result.id} hover>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            {getGradeIcon(result.percentage)}
                            <Typography fontWeight="medium">{result.student_name}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{result.assignment_name || result.assignment_id}</TableCell>
                        <TableCell align="center">
                          <Chip 
                            size="small"
                            label={`${result.percentage.toFixed(1)}%`}
                            color={result.percentage >= 70 ? 'success' : result.percentage >= 50 ? 'warning' : 'error'}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <GradeChip grade={result.grade_letter} label={result.grade_letter} size="small" />
                        </TableCell>
                        <TableCell>{formatDate(result.graded_at)}</TableCell>
                        <TableCell align="center">
                          <Tooltip title="View Details">
                            <IconButton size="small" onClick={() => openDetails(result)}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box display="flex" justifyContent="center" py={2}>
                <Pagination
                  count={Math.ceil(filteredResults.length / resultsPerPage)}
                  page={page}
                  onChange={(e, p) => setPage(p)}
                  color="primary"
                />
              </Box>
            </Paper>
          )}

          {/* Tab 2: Charts */}
          {activeTab === 2 && (
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
          )}
        </>
      )}

      {/* Result Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        {selectedResult && (
          <>
            <DialogTitle>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">{selectedResult.student_name}</Typography>
                <GradeChip grade={selectedResult.grade_letter} label={selectedResult.grade_letter} />
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Assignment</Typography>
                  <Typography fontWeight="medium">{selectedResult.assignment_name || selectedResult.assignment_id}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Score</Typography>
                  <Typography fontWeight="medium">{selectedResult.score}/{selectedResult.total_points}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Percentage</Typography>
                  <Typography fontWeight="medium">{selectedResult.percentage.toFixed(1)}%</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Graded At</Typography>
                  <Typography fontWeight="medium">{formatDate(selectedResult.graded_at)}</Typography>
                </Grid>
              </Grid>
              
              {selectedResult.overall_feedback && (
                <Box mt={3}>
                  <Typography variant="subtitle2" gutterBottom>Overall Feedback</Typography>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="body2">{selectedResult.overall_feedback}</Typography>
                  </Paper>
                </Box>
              )}
              
              {selectedResult.rubric_scores && selectedResult.rubric_scores.length > 0 && (
                <Box mt={3}>
                  <Typography variant="subtitle2" gutterBottom>Rubric Breakdown</Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Criterion</TableCell>
                          <TableCell align="center">Score</TableCell>
                          <TableCell>Feedback</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedResult.rubric_scores.map((rubric, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{rubric.criterion}</TableCell>
                            <TableCell align="center">
                              <Chip 
                                size="small"
                                label={`${rubric.score}/${rubric.max_score}`}
                                color={rubric.score >= rubric.max_score * 0.7 ? 'success' : 'warning'}
                              />
                            </TableCell>
                            <TableCell>{rubric.feedback}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailsOpen(false)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Footer */}
      <Box mt={4} display="flex" justifyContent="space-between">
        <Button variant="outlined" component={Link} href="/">
          Back to Home
        </Button>
      </Box>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
        </Container>
        
        {/* Saved Views Manager */}
        <SavedViewsManager
          open={savedViewsOpen}
          onClose={() => setSavedViewsOpen(false)}
          currentFilters={{
            searchTerm,
            selectedAssignment,
            gradeFilter,
            dateRange,
            sortField,
            sortOrder,
            viewMode,
          }}
          onLoadView={(view) => {
            setSearchTerm(view.filters.searchTerm);
            setSelectedAssignment(view.filters.selectedAssignment);
            setGradeFilter(view.filters.gradeFilter);
            setDateRange(view.filters.dateRange as any);
            setSortField(view.filters.sortField as SortField);
            setSortOrder(view.filters.sortOrder as SortOrder);
            setViewMode(view.filters.viewMode as ViewMode);
          }}
        />
      </div>
    </ProtectedRoute>
  );
}
