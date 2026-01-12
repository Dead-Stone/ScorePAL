/**
 * ScorePAL - Results Dashboard
 * Refactored to use modular components
 */

import React, { useState, useEffect, useMemo } from 'react';
import { GetStaticProps } from 'next';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Chip,
  Tooltip,
  LinearProgress,
  Tabs,
  Tab,
} from '@mui/material';
import { useRouter } from 'next/router';
import Link from 'next/link';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import ViewListIcon from '@mui/icons-material/ViewList';
import GridViewIcon from '@mui/icons-material/GridView';
import BarChartIcon from '@mui/icons-material/BarChart';
import InsertChartIcon from '@mui/icons-material/InsertChart';

import { TopNavBar } from '@/components/layout/TopNavBar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/utils/apiClient';
import { Result, AssignmentGroup, SortField, SortOrder, ViewMode } from '@/components/results/index/types';
import {
  getResultsCache,
  setResultsCache,
  clearResultsCache,
  groupResultsByAssignment,
  calculateStats,
  formatLastRefreshed,
} from '@/components/results/index/utils';
import { filterResults, downloadResults as downloadResultsUtil } from '@/components/results/index/filterUtils';
import { ResultsStatsCards } from '@/components/results/index/ResultsStatsCards';
import { ResultsFilters } from '@/components/results/index/ResultsFilters';
import { AssignmentGroupsTab } from '@/components/results/index/AssignmentGroupsTab';
import { AllResultsTab } from '@/components/results/index/AllResultsTab';
import { ResultsChartsTab } from '@/components/results/index/ResultsChartsTab';
import { ResultDetailsDialog } from '@/components/results/index/ResultDetailsDialog';
import { SavedViewsManager } from '@/components/results/SavedViewsManager';

export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {},
    revalidate: 3600,
  };
};

export default function ResultsDashboard() {
  const router = useRouter();
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

  useEffect(() => {
    if (!isAuthenticated) return;

    const handleGradingComplete = () => {
      setTimeout(() => {
        fetchResults(true);
      }, 2000);
    };

    window.addEventListener('gradingCompleted', handleGradingComplete);
    return () => {
      window.removeEventListener('gradingCompleted', handleGradingComplete);
    };
  }, [isAuthenticated]);

  const initializeResults = async () => {
    setLoading(true);
    
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

  // Compute stats
  const stats = useMemo(() => calculateStats(results), [results]);

  // Filtered results
  const filteredResults = useMemo(() => {
    return filterResults(results, {
      searchTerm,
      selectedAssignment,
      gradeFilter,
      dateRange,
      scoreRange,
      resultType,
    }, sortField, sortOrder);
  }, [results, searchTerm, selectedAssignment, gradeFilter, dateRange, scoreRange, resultType, sortField, sortOrder]);

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

  const handleDownloadResults = async (format: 'json' | 'csv' = 'json') => {
    try {
      const dataToExport = selectedAssignment === 'all' ? results : filteredResults;
      downloadResultsUtil(dataToExport, format);
    } catch (err) {
      setError('Failed to download results');
    }
  };

  const openDetails = (result: Result) => {
    setSelectedResult(result);
    setDetailsOpen(true);
  };

  // Redirect students
  useEffect(() => {
    if (user?.role === 'student') {
      router.replace('/dashboard/student');
    }
  }, [user, router]);

  if (user?.role === 'student') {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
          <TopNavBar />
          <Container maxWidth="xl" sx={{ py: 6, pt: { xs: 12, sm: 12 } }}>
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
              <CircularProgress />
            </Box>
          </Container>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['teacher', 'admin', 'grader']}>
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
                Grading Results
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                {stats.totalSubmissions} submissions across {stats.totalAssignments} assignments
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              {lastRefreshed && (
                <Chip 
                  size="small" 
                  label={`Updated ${formatLastRefreshed(lastRefreshed)}`} 
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
                onClick={() => handleDownloadResults('csv')}
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
          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          {/* Stats Overview */}
          <Box mb={4}>
            <ResultsStatsCards stats={stats} />
          </Box>

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
              <Tab label="By Assignment" icon={<ViewListIcon />} iconPosition="start" />
              <Tab label="All Results" icon={<GridViewIcon />} iconPosition="start" />
              <Tab label="Overview Charts" icon={<BarChartIcon />} iconPosition="start" />
            </Tabs>
          </Box>

          {/* Filters */}
          <Box mb={3}>
            <ResultsFilters
              searchTerm={searchTerm}
              selectedAssignment={selectedAssignment}
              gradeFilter={gradeFilter}
              dateRange={dateRange}
              scoreRange={scoreRange}
              resultType={resultType}
              assignmentGroups={assignmentGroups}
              filteredResultsCount={filteredResults.length}
              onSearchChange={setSearchTerm}
              onAssignmentChange={setSelectedAssignment}
              onGradeFilterChange={setGradeFilter}
              onDateRangeChange={setDateRange}
              onScoreRangeChange={setScoreRange}
              onResultTypeChange={setResultType}
            />
          </Box>

          {/* Content */}
          {loading ? (
            <Box display="flex" justifyContent="center" py={8}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {activeTab === 0 && (
                <AssignmentGroupsTab
                  assignmentGroups={assignmentGroups}
                  expandedGroups={expandedGroups}
                  onToggleGroup={toggleGroup}
                  onViewResult={openDetails}
                />
              )}
              
              {activeTab === 1 && (
                <AllResultsTab
                  results={filteredResults}
                  viewMode={viewMode}
                  sortField={sortField}
                  sortOrder={sortOrder}
                  page={page}
                  resultsPerPage={resultsPerPage}
                  onSort={handleSort}
                  onPageChange={setPage}
                  onViewResult={openDetails}
                />
              )}
              
              {activeTab === 2 && (
                <ResultsChartsTab
                  results={results}
                  assignmentGroups={assignmentGroups}
                />
              )}
            </>
          )}

          {/* Result Details Dialog */}
          <ResultDetailsDialog
            open={detailsOpen}
            result={selectedResult}
            onClose={() => setDetailsOpen(false)}
          />

          {/* Footer */}
          <Box mt={4} display="flex" justifyContent="space-between">
            <Button variant="outlined" component={Link} href="/">
              Back to Home
            </Button>
          </Box>

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
        </Container>
      </div>
    </ProtectedRoute>
  );
}
