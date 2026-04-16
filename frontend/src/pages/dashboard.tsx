/**
 * ScorePAL - Modern Analytics Dashboard
 * Sleek, modern design for teachers, admins, and graders
 */

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { GetStaticProps } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import axios from 'axios';
import { 
  RefreshCw, 
  Award, 
  Loader2, 
  AlertCircle, 
  TrendingUp, 
  Users, 
  FileText,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  Sparkles,
  Zap,
  Target,
  BookOpen,
} from 'lucide-react';
import { API_BASE_URL } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { RecentGradingsTab } from '@/components/dashboard/RecentGradingsTab';
import { CanvasAnalyticsTab } from '@/components/dashboard/CanvasAnalyticsTab';
import { GraderDashboard } from '@/components/dashboard/GraderDashboard';
import { DashboardCharts } from '@/components/dashboard/DashboardCharts';
import { TopNavBar } from '@/components/layout/TopNavBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Course, CourseDetails } from '@/components/dashboard/types';
import {
  checkCanvasConfig,
  fetchCourses,
  fetchCourseDetails,
  fetchStudents,
  calculateStats,
} from '@/components/dashboard/utils';
import { cn } from '@/lib/utils';

axios.defaults.baseURL = API_BASE_URL;
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
            <span>{Math.abs(change)}% from last week</span>
          </div>
        )}
      </div>
      <div className={cn("icon-container w-14 h-14", iconBg)}>
        {icon}
      </div>
    </div>
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  const [recentGradings, setRecentGradings] = useState<any[]>([]);
  const [loadingGradings, setLoadingGradings] = useState(false);

  const [canvasConfigured, setCanvasConfigured] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [courseDetails, setCourseDetails] = useState<CourseDetails | null>(null);
  const [loadingCourseDetails, setLoadingCourseDetails] = useState(false);
  
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
  const isGrader = user?.role === 'grader';
  const isStudent = user?.role === 'student';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isStudent) {
      router.replace('/dashboard/student');
    }
  }, [isStudent, router]);

  useEffect(() => {
    if (!mounted) return;
    startTransition(() => {
      initialize();
      fetchRecentGradings();
    });
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    const handleGradingComplete = (event: CustomEvent) => {
      setTimeout(() => {
        fetchRecentGradings();
      }, 2000);
      if (selectedCourseId) {
        setTimeout(() => {
          loadCourseDetails(selectedCourseId);
        }, 2000);
      }
    };
    window.addEventListener('gradingCompleted', handleGradingComplete as EventListener);
    return () => {
      window.removeEventListener('gradingCompleted', handleGradingComplete as EventListener);
    };
  }, [mounted, selectedCourseId]);

  useEffect(() => {
    if (!mounted || !selectedCourseId) return;
    startTransition(() => {
      loadCourseDetails(selectedCourseId);
    });
  }, [selectedCourseId, mounted]);

  const fetchRecentGradings = async () => {
    if (!mounted) return;
    startTransition(() => {
      setLoadingGradings(true);
    });
    try {
      const response = await axios.get('/api/results', { params: { limit: 20 } });
      if (response.data?.results) {
        startTransition(() => {
          setRecentGradings(response.data.results);
        });
      }
    } catch (err: any) {
      startTransition(() => {
        setError('Failed to load recent gradings');
      });
    } finally {
      startTransition(() => {
        setLoadingGradings(false);
      });
    }
  };

  const initialize = async () => {
    if (!mounted) return;
    startTransition(() => {
      setLoading(true);
      setError(null);
    });
    try {
      const isValid = await checkCanvasConfig();
      startTransition(() => {
        setCanvasConfigured(isValid);
      });
      if (isValid) {
        await loadCourses();
      }
    } catch (err: any) {
      startTransition(() => {
        setError(err.response?.data?.detail || 'Failed to initialize dashboard');
      });
    } finally {
      startTransition(() => {
        setLoading(false);
      });
    }
  };

  const loadCourses = async () => {
    if (!mounted) return;
    try {
      const coursesData = await fetchCourses();
      startTransition(() => {
        setCourses(coursesData);
        if (coursesData.length > 0 && !selectedCourseId) {
          setSelectedCourseId(coursesData[0].id);
        }
      });
    } catch (err: any) {
      startTransition(() => {
        setError('Failed to fetch courses. Please check your Canvas configuration.');
      });
    }
  };

  const loadCourseDetails = async (courseId: number) => {
    if (!mounted) return;
    startTransition(() => {
      setLoadingCourseDetails(true);
    });
    try {
      const details = await fetchCourseDetails(courseId);
      startTransition(() => {
        setCourseDetails(details);
      });
      if (isGrader && details) {
        await loadStudents(courseId);
      }
    } catch (err: any) {
      startTransition(() => {
        if (err.response?.status === 403) {
          setError(
            `Access denied to this course. Your Canvas API key may not have permission to access course ${courseId}.`
          );
        } else {
          setError(err.response?.data?.detail || 'Failed to fetch course details.');
        }
        setCourseDetails(null);
      });
    } finally {
      startTransition(() => {
        setLoadingCourseDetails(false);
      });
    }
  };

  const loadStudents = async (courseId: number) => {
    if (!mounted || !isGrader) return;
    try {
      setLoadingStudents(true);
      const studentsData = await fetchStudents(courseId);
      setStudents(studentsData);
    } catch (err: any) {
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleRefresh = async () => {
    if (!mounted) return;
    startTransition(() => {
      setRefreshing(true);
      setError(null);
    });
    try {
      await Promise.all([
        checkCanvasConfig().then(isValid => {
          startTransition(() => setCanvasConfigured(isValid));
          return isValid ? loadCourses() : Promise.resolve();
        }),
        selectedCourseId ? loadCourseDetails(selectedCourseId) : Promise.resolve(),
        fetchRecentGradings()
      ]);
    } catch (err: any) {
      startTransition(() => {
        setError(err.response?.data?.detail || 'Failed to refresh data');
      });
    } finally {
      startTransition(() => {
        setRefreshing(false);
      });
    }
  };

  if (isStudent) {
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
      <ProtectedRoute>
        <div className="min-h-screen page-gradient">
          <TopNavBar />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center animate-pulse">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <p className="text-gray-500 font-medium">Loading your dashboard...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const stats = calculateStats(recentGradings);

  return (
    <ProtectedRoute>
      <div className="min-h-screen page-gradient">
        <TopNavBar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pt-24">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 animate-fade-in">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">
                Welcome back, <span className="gradient-text">{user?.first_name || 'there'}</span>
              </h1>
              <p className="text-gray-500">
                Here's an overview of your grading activity
              </p>
            </div>
            <div className="flex items-center gap-3">
              {canvasConfigured && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="h-10 px-4 rounded-xl border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
                >
                  <RefreshCw className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")} />
                  Refresh
                </Button>
              )}
              <Link href="/grade">
                <Button className="btn-primary h-10 px-6">
                  <Zap className="w-4 h-4 mr-2" />
                  Start Grading
                </Button>
              </Link>
            </div>
          </div>

          {isGrader ? (
            <Card className="card-modern">
              <CardContent className="p-6">
                <GraderDashboard
                  recentGradings={recentGradings}
                  students={students}
                  loading={loadingGradings}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {/* Stats Grid */}
              {stats && !loadingGradings && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    title="Total Submissions"
                    value={stats.totalSubmissions}
                    change={12}
                    icon={<FileText className="w-6 h-6 text-blue-600" />}
                    iconBg="icon-container-blue"
                    delay={0}
                  />
                  <StatCard
                    title="Average Score"
                    value={`${stats.avgScore}%`}
                    change={5}
                    icon={<Target className="w-6 h-6 text-emerald-600" />}
                    iconBg="icon-container-emerald"
                    delay={100}
                  />
                  <StatCard
                    title="Assignments"
                    value={stats.assignmentsGraded}
                    icon={<BookOpen className="w-6 h-6 text-violet-600" />}
                    iconBg="icon-container-violet"
                    delay={200}
                  />
                  <StatCard
                    title="Graded Today"
                    value={stats.gradedToday || 0}
                    icon={<CheckCircle2 className="w-6 h-6 text-amber-600" />}
                    iconBg="icon-container-amber"
                    delay={300}
                  />
                </div>
              )}

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Charts Section */}
                <div className="lg:col-span-2 space-y-6">
                  <Card className="card-modern animate-fade-in-up" style={{ animationDelay: '150ms' }}>
                    <CardHeader className="border-b border-gray-100 bg-gray-50/50">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-900">
                          <div className="icon-container-blue w-10 h-10">
                            <BarChart3 className="w-5 h-5 text-blue-600" />
                          </div>
                          Performance Analytics
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <DashboardCharts gradings={recentGradings} loading={loadingGradings} />
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity */}
                <div className="lg:col-span-1">
                  <Card className="card-modern h-full animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                    <CardHeader className="border-b border-gray-100 bg-gray-50/50">
                      <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-900">
                        <div className="icon-container-violet w-10 h-10">
                          <Clock className="w-5 h-5 text-violet-600" />
                        </div>
                        Recent Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <RecentGradingsTab
                        gradings={recentGradings}
                        loading={loadingGradings}
                        onRefresh={fetchRecentGradings}
                      />
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Error Alert */}
              {error && (
                <Alert className={cn(
                  "animate-fade-in-up rounded-xl",
                  error.includes('Access denied') || error.includes('permission') 
                    ? 'border-amber-200 bg-amber-50' 
                    : 'border-rose-200 bg-rose-50'
                )}>
                  <AlertCircle className="h-5 w-5" />
                  <AlertDescription className="text-sm font-medium">{error}</AlertDescription>
                </Alert>
              )}

              {/* Canvas Analytics */}
              <Card className="card-modern animate-fade-in-up" style={{ animationDelay: '250ms' }}>
                <CardHeader className="border-b border-gray-100 bg-gray-50/50">
                  <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-900">
                    <div className="icon-container-teal w-10 h-10">
                      <TrendingUp className="w-5 h-5 text-teal-600" />
                    </div>
                    Canvas Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <CanvasAnalyticsTab
                    canvasConfigured={canvasConfigured}
                    courses={courses}
                    selectedCourseId={selectedCourseId}
                    courseDetails={courseDetails}
                    loadingCourseDetails={loadingCourseDetails}
                    onCourseChange={setSelectedCourseId}
                    onRefresh={handleRefresh}
                    refreshing={refreshing}
                  />
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                <Link href="/grade" className="block">
                  <div className="card-interactive p-6 group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-transform">
                        <Zap className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Quick Grade</h3>
                        <p className="text-sm text-gray-500">Grade a single submission</p>
                      </div>
                    </div>
                  </div>
                </Link>
                <Link href="/results" className="block">
                  <div className="card-interactive p-6 group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/25 group-hover:scale-110 transition-transform">
                        <BarChart3 className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">View Results</h3>
                        <p className="text-sm text-gray-500">Browse all grading results</p>
                      </div>
                    </div>
                  </div>
                </Link>
                <Link href="/rubrics" className="block">
                  <div className="card-interactive p-6 group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-teal-500/25 group-hover:scale-110 transition-transform">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Manage Rubrics</h3>
                        <p className="text-sm text-gray-500">Create and edit rubrics</p>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
