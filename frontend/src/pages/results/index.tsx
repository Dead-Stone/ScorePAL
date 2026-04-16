/**
 * ScorePAL - Modern Results Dashboard
 * Comprehensive results management with sleek design
 */

import React, { useState, useEffect, useMemo } from 'react';
import { GetStaticProps } from 'next';
import { useRouter } from 'next/router';
import Link from 'next/link';

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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  Download,
  RefreshCw,
  LayoutGrid,
  List,
  BarChart3,
  AlertCircle,
  Sparkles,
  FileText,
  Target,
  TrendingUp,
  Calendar,
  ChevronDown,
  Filter,
  Search,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const getStaticProps: GetStaticProps = async () => {
  return { props: {}, revalidate: 3600 };
};

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  iconBg: string;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, icon, iconBg, delay = 0 }) => (
  <div 
    className="stat-card animate-fade-in-up"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="data-label mb-2">{title}</p>
        <p className="data-value-lg">{value}</p>
        {change !== undefined && (
          <div className={cn(
            "flex items-center gap-1 mt-2 text-sm font-medium",
            change >= 0 ? "text-emerald-600" : "text-rose-600"
          )}>
            {change >= 0 ? (
              <ArrowUpRight className="w-4 h-4" />
            ) : (
              <ArrowDownRight className="w-4 h-4" />
            )}
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>
      <div className={cn("icon-container w-14 h-14", iconBg)}>
        {icon}
      </div>
    </div>
  </div>
);

export default function ResultsDashboard() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  
  const [results, setResults] = useState<Result[]>([]);
  const [assignmentGroups, setAssignmentGroups] = useState<AssignmentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState<string>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'all' | '7days' | '30days' | '90days'>('all');
  const [scoreRange, setScoreRange] = useState<string>('all');
  const [resultType, setResultType] = useState<'all' | 'single' | 'batch' | 'canvas'>('all');
  
  const [savedViewsOpen, setSavedViewsOpen] = useState(false);
  
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

  const stats = useMemo(() => calculateStats(results), [results]);

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

  useEffect(() => {
    if (user?.role === 'student') {
      router.replace('/dashboard/student');
    }
  }, [user, router]);

  if (user?.role === 'student') {
    return (
      <ProtectedRoute>
        <div className="min-h-screen page-gradient">
          <TopNavBar />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
            <div className="flex items-center justify-center min-h-[60vh]">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['teacher', 'admin', 'grader']}>
        <div className="min-h-screen page-gradient">
          <TopNavBar />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center animate-pulse">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <p className="text-gray-500 font-medium">Loading results...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['teacher', 'admin', 'grader']}>
      <div className="min-h-screen page-gradient">
        <TopNavBar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pt-24">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 animate-fade-in">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">
                Grading <span className="gradient-text">Results</span>
              </h1>
              <p className="text-gray-500">
                {stats.totalSubmissions} submissions across {stats.totalAssignments} assignments
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {lastRefreshed && (
                <span className="badge-blue text-xs">
                  <Calendar className="w-3 h-3 mr-1.5" />
                  Updated {formatLastRefreshed(lastRefreshed)}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchResults(true)}
                disabled={refreshing}
                className="h-10 px-4 rounded-xl border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadResults('csv')}
                className="h-10 px-4 rounded-xl border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Link href="/dashboard">
                <Button className="btn-primary h-10 px-6">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert className="mb-6 rounded-xl border-rose-200 bg-rose-50 text-rose-800 animate-fade-in-down">
              <AlertCircle className="h-5 w-5" />
              <AlertDescription className="font-medium">{error}</AlertDescription>
            </Alert>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              title="Total Submissions"
              value={stats.totalSubmissions}
              icon={<FileText className="w-6 h-6 text-blue-600" />}
              iconBg="icon-container-blue"
              delay={0}
            />
            <StatCard
              title="Average Score"
              value={`${stats.avgScore}%`}
              icon={<Target className="w-6 h-6 text-emerald-600" />}
              iconBg="icon-container-emerald"
              delay={100}
            />
            <StatCard
              title="Assignments"
              value={stats.totalAssignments}
              icon={<LayoutGrid className="w-6 h-6 text-violet-600" />}
              iconBg="icon-container-violet"
              delay={200}
            />
            <StatCard
              title="Pass Rate"
              value={`${stats.passRate || 0}%`}
              icon={<TrendingUp className="w-6 h-6 text-amber-600" />}
              iconBg="icon-container-amber"
              delay={300}
            />
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 p-1.5 bg-gray-100/80 rounded-xl w-fit mb-6 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
            <button
              onClick={() => setActiveTab(0)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200",
                activeTab === 0
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
              )}
            >
              <List className="w-4 h-4" />
              By Assignment
            </button>
            <button
              onClick={() => setActiveTab(1)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200",
                activeTab === 1
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
              All Results
            </button>
            <button
              onClick={() => setActiveTab(2)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200",
                activeTab === 2
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
              )}
            >
              <BarChart3 className="w-4 h-4" />
              Charts
            </button>
          </div>

          {/* Filters */}
          <Card className="card-modern mb-6 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <CardContent className="p-4">
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
            </CardContent>
          </Card>

          {/* Content */}
          <div className="animate-fade-in-up" style={{ animationDelay: '250ms' }}>
            {activeTab === 0 && (
              <Card className="card-modern">
                <CardContent className="p-6">
                  <AssignmentGroupsTab
                    assignmentGroups={assignmentGroups}
                    expandedGroups={expandedGroups}
                    onToggleGroup={toggleGroup}
                    onViewResult={openDetails}
                  />
                </CardContent>
              </Card>
            )}
            
            {activeTab === 1 && (
              <Card className="card-modern">
                <CardContent className="p-6">
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
                </CardContent>
              </Card>
            )}
            
            {activeTab === 2 && (
              <Card className="card-modern">
                <CardHeader className="border-b border-gray-100 bg-gray-50/50">
                  <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-900">
                    <div className="icon-container-blue w-10 h-10">
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                    </div>
                    Analytics Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <ResultsChartsTab
                    results={results}
                    assignmentGroups={assignmentGroups}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Result Details Dialog */}
          <ResultDetailsDialog
            open={detailsOpen}
            result={selectedResult}
            onClose={() => setDetailsOpen(false)}
          />

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
      </div>
    </ProtectedRoute>
  );
}
