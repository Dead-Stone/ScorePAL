/**
 * ScorePAL - Analytics Dashboard
 * Refactored to use modular components
 */

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { GetStaticProps } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import axios from 'axios';
import { RefreshCw, Award, Loader2, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { RecentGradingsTab } from '@/components/dashboard/RecentGradingsTab';
import { CanvasAnalyticsTab } from '@/components/dashboard/CanvasAnalyticsTab';
import { GraderDashboard } from '@/components/dashboard/GraderDashboard';
import { DashboardCharts } from '@/components/dashboard/DashboardCharts';
import { DashboardStatsCards } from '@/components/dashboard/DashboardStatsCards';
import { TopNavBar } from '@/components/layout/TopNavBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Course, CourseDetails } from '@/components/dashboard/types';
import {
  checkCanvasConfig,
  fetchCourses,
  fetchCourseDetails,
  fetchStudents,
  calculateStats,
} from '@/components/dashboard/utils';

axios.defaults.baseURL = API_BASE_URL;
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {},
    revalidate: 3600,
  };
};

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
            `Access denied to this course. Your Canvas API key may not have permission to access course ${courseId}. Please check your Canvas permissions or try a different course.`
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
      console.error('Error fetching students:', err);
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
        selectedCourseId ? loadCourseDetails(selectedCourseId) : Promise.resolve()
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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
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

  const stats = calculateStats(recentGradings);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <TopNavBar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pt-28">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              {canvasConfigured && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="h-9"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              )}
              <Button asChild size="sm" className="h-9 bg-blue-600 hover:bg-blue-700 text-white">
                <Link href="/grade">
                  <Award className="w-4 h-4 mr-2" />
                  Grade Assignments
                </Link>
              </Button>
            </div>
          </div>

          {isGrader ? (
            <Card className="border-0 shadow-md">
              <CardContent className="p-6">
                <GraderDashboard
                  recentGradings={recentGradings}
                  students={students}
                  loading={loadingGradings}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {stats && !loadingGradings && <DashboardStatsCards stats={stats} />}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-4">
                  <DashboardCharts gradings={recentGradings} loading={loadingGradings} />
                </div>
                <div className="lg:col-span-1">
                  <Card className="border-0 shadow-md h-full">
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

              {error && (
                <Alert className={`${
                  error.includes('Access denied') || error.includes('permission') 
                    ? 'border-yellow-200 bg-yellow-50' 
                    : 'border-red-200 bg-red-50'
                }`}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}
              <Card className="border-0 shadow-md">
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
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
