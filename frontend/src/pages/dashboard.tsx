/**
 * ScorePAL - Analytics Dashboard
 * Main dashboard with Canvas analytics - Analytics-first approach
 * Role-based views for teachers, graders, and students
 * Statically generated at build time - data fetched client-side
 */

import React, { useState, useEffect, useCallback, useTransition } from 'react';
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
  CircularProgress,
  Alert,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tab,
  Tabs,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import Link from 'next/link';
import { useRouter } from 'next/router';
import axios from 'axios';
import SchoolIcon from '@mui/icons-material/School';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import BarChartIcon from '@mui/icons-material/BarChart';
import RefreshIcon from '@mui/icons-material/Refresh';
import AssessmentIcon from '@mui/icons-material/Assessment';
import GradeIcon from '@mui/icons-material/Grade';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { API_BASE_URL } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { RecentGradingsTab } from '@/components/dashboard/RecentGradingsTab';
import { CanvasAnalyticsTab } from '@/components/dashboard/CanvasAnalyticsTab';
import { GraderDashboard } from '@/components/dashboard/GraderDashboard';
import { TabPanel } from '@/components/common/TabPanel';
import { PageLayout } from '@/components/layout/PageLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { StatsCard } from '@/components/cards/StatsCard';

// Configure axios
axios.defaults.baseURL = API_BASE_URL;
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Use centralized ChartWrapper
import { ChartWrapper } from '@/components/charts/ChartWrapper';

interface Course {
  id: number;
  name: string;
  course_code: string;
  total_students?: number;
  term?: { name: string };
}

interface Assignment {
  id: number;
  name: string;
  points_possible: number;
  due_at: string | null;
  published: boolean;
  submission_types: string[];
  statistics?: {
    submissions_count: number;
    graded_count: number;
    average_score: number | null;
    high_score: number | null;
    low_score: number | null;
  };
}

interface CourseDetails {
  course_info: Course;
  assignments: Assignment[];
  total_submissions: number;
  total_graded: number;
  average_score: number | null;
  all_scores: number[];
}


// Static generation - compile at build time only
export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {},
    revalidate: 3600, // Revalidate every hour
  };
};

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  // Recent gradings state
  const [recentGradings, setRecentGradings] = useState<any[]>([]);
  const [loadingGradings, setLoadingGradings] = useState(false);

  // Canvas state
  const [canvasConfigured, setCanvasConfigured] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [courseDetails, setCourseDetails] = useState<CourseDetails | null>(null);
  const [loadingCourseDetails, setLoadingCourseDetails] = useState(false);
  
  // Students data for grader dashboard
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    startTransition(() => {
      initialize();
      if (currentTab === 0) {
        fetchRecentGradings();
      }
    });
  }, [currentTab, mounted]);

  // Listen for grading completion events to refresh data
  useEffect(() => {
    if (!mounted) return;

    const handleGradingComplete = (event: CustomEvent) => {
      // Refresh recent gradings
      if (currentTab === 0) {
        setTimeout(() => {
          fetchRecentGradings();
        }, 2000);
      }
      // Refresh course details if on analytics tab
      if (currentTab === 1 && selectedCourseId) {
        setTimeout(() => {
          fetchCourseDetails(selectedCourseId);
        }, 2000);
      }
    };

    window.addEventListener('gradingCompleted', handleGradingComplete as EventListener);
    return () => {
      window.removeEventListener('gradingCompleted', handleGradingComplete as EventListener);
    };
  }, [mounted, currentTab, selectedCourseId]);

  useEffect(() => {
    if (!mounted) return;
    
    if (selectedCourseId && currentTab === 1) {
      startTransition(() => {
        fetchCourseDetails(selectedCourseId);
      });
    }
  }, [selectedCourseId, currentTab, mounted]);

  const fetchRecentGradings = async () => {
    if (!mounted) return;
    
    startTransition(() => {
      setLoadingGradings(true);
    });
    
    try {
      const response = await axios.get('/api/results', {
        params: { limit: 20 }
      });
      if (response.data?.results) {
        startTransition(() => {
          setRecentGradings(response.data.results);
        });
      }
    } catch (err: any) {
      // Error handled by UI state
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
      await checkCanvasConfig();
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

  const checkCanvasConfig = async () => {
    if (!mounted) return;
    
    try {
      const response = await axios.get('/api/settings/canvas');
      const isValid = response.data.canvas_key_valid || false;
      
      startTransition(() => {
        setCanvasConfigured(isValid);
      });

      if (isValid) {
        await fetchCourses();
      }
    } catch (err: any) {
      if (err.response?.status === 400) {
        startTransition(() => {
          setCanvasConfigured(false);
        });
      } else {
        throw err;
      }
    }
  };

  const fetchCourses = async () => {
    if (!mounted) return;
    
    try {
      const response = await axios.get('/api/settings/canvas/data/courses');
      if (response.data.status === 'success') {
        const coursesData = response.data.courses || [];
        
        startTransition(() => {
          setCourses(coursesData);
          if (coursesData.length > 0 && !selectedCourseId) {
            setSelectedCourseId(coursesData[0].id);
          }
        });
      }
    } catch (err: any) {
      // Error handled by UI state
      startTransition(() => {
        setError('Failed to fetch courses. Please check your Canvas configuration.');
      });
    }
  };

  const fetchCourseDetails = async (courseId: number) => {
    if (!mounted) return;
    
    startTransition(() => {
      setLoadingCourseDetails(true);
    });
    
    try {
      const response = await axios.get(
        `/api/settings/canvas/data/courses/${courseId}/details?include_submissions=true`
      );
      if (response.data.status === 'success' || response.data.status === 'partial') {
        startTransition(() => {
          setCourseDetails(response.data);
          if (response.data.status === 'partial' && response.data.message) {
            // Show info message for partial access
            setError(null);
            // You could show a warning toast here instead
          }
        });
        
        // Fetch students for grader dashboard
        if (isGrader) {
          fetchStudents(courseId);
        }
      }
    } catch (err: any) {
      // Error handled by UI state
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

  const fetchStudents = async (courseId: number) => {
    if (!mounted || !isGrader) return;
    
    try {
      setLoadingStudents(true);
      const response = await axios.get(
        `/api/settings/canvas/data/courses/${courseId}/students?include_performance=true`
      );
      if (response.data?.students) {
        setStudents(response.data.students);
      }
    } catch (err: any) {
      // Silently fail - students are optional
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
      await Promise.all([checkCanvasConfig(), selectedCourseId ? fetchCourseDetails(selectedCourseId) : Promise.resolve()]);
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

  const router = useRouter();
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
  const isGrader = user?.role === 'grader';
  const isStudent = user?.role === 'student';

  // Redirect students to their dedicated dashboard
  useEffect(() => {
    if (isStudent) {
      router.replace('/dashboard/student');
    }
  }, [isStudent, router]);

  if (isStudent) {
    return (
      <ProtectedRoute>
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <CircularProgress />
          </Box>
        </Container>
      </ProtectedRoute>
    );
  }

  // Calculate statistics
  const getOverallStats = () => {
    if (!courseDetails) return null;

    const totalAssignments = courseDetails.assignments.length;
    const publishedAssignments = courseDetails.assignments.filter(a => a.published).length;
    const totalSubmissions = courseDetails.total_submissions;
    const totalGraded = courseDetails.total_graded;
    const avgScore = courseDetails.average_score;

    return {
      totalAssignments,
      publishedAssignments,
      totalSubmissions,
      totalGraded,
      avgScore,
      gradingProgress: totalSubmissions > 0 ? (totalGraded / totalSubmissions) * 100 : 0,
    };
  };

  const stats = getOverallStats();

  if (loading) {
    return (
      <ProtectedRoute>
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <CircularProgress />
          </Box>
        </Container>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <PageLayout maxWidth="xl">
        {/* Compact Header with Actions */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={2}>
          <Typography
            variant="h5"
            fontWeight="600"
            sx={{
              background: 'linear-gradient(135deg, #1D80C3 0%, #4F46E5 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Dashboard
          </Typography>
          <Box display="flex" gap={1.5} alignItems="center">
            {currentTab === 1 && canvasConfigured && (
              <Tooltip title="Refresh data">
                <IconButton 
                  onClick={handleRefresh} 
                  disabled={refreshing}
                  size="small"
                  sx={{ 
                    bgcolor: 'white',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    '&:hover': { bgcolor: 'gray.50' }
                  }}
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Button
              component={Link}
              href="/grade"
              variant="contained"
              size="small"
              startIcon={<GradeIcon />}
              sx={{ 
                bgcolor: '#1D80C3',
                '&:hover': { bgcolor: '#1565A0' },
                boxShadow: '0 2px 4px rgba(29, 128, 195, 0.3)',
                textTransform: 'none',
                px: 2,
                py: 0.75
              }}
            >
              Grade Assignments
            </Button>
          </Box>
        </Box>

        {/* Tabs */}
        <Paper 
          elevation={0} 
          sx={{ 
            mb: 4,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden'
          }}
        >
          <Tabs 
            value={currentTab} 
            onChange={(e, newValue) => {
              startTransition(() => {
                setCurrentTab(newValue);
              });
            }}
            sx={{ 
              bgcolor: 'white',
              '& .MuiTab-root': {
                textTransform: 'none',
                fontSize: '0.95rem',
                fontWeight: 500,
                minHeight: 56,
                '&.Mui-selected': {
                  color: '#1D80C3',
                }
              },
              '& .MuiTabs-indicator': {
                height: 3,
                bgcolor: '#1D80C3',
              }
            }}
          >
            <Tab 
              icon={<GradeIcon />} 
              iconPosition="start"
              label="Recent Gradings" 
              id="dashboard-tab-0"
              aria-controls="dashboard-tabpanel-0"
            />
            <Tab 
              icon={<SchoolIcon />} 
              iconPosition="start"
              label="Canvas Analytics" 
              id="dashboard-tab-1"
              aria-controls="dashboard-tabpanel-1"
            />
          </Tabs>
        </Paper>

        {/* Recent Gradings Tab */}
        <TabPanel value={currentTab} index={0}>
          {isGrader ? (
            /* Grader Dashboard */
            <Box sx={{ 
              bgcolor: 'white',
              borderRadius: 2,
              p: 3,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <GraderDashboard
                recentGradings={recentGradings}
                students={students}
                loading={loadingGradings}
              />
            </Box>
          ) : (
            <>
              {/* Stats Overview Cards */}
              {!loadingGradings && recentGradings.length > 0 && (
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  {(() => {
                    const totalGradings = recentGradings.length;
                    const avgScore = recentGradings.reduce((sum, g) => sum + (g.percentage || 0), 0) / totalGradings;
                    const uniqueAssignments = new Set(recentGradings.map(g => g.assignment_id || g.assignment_name)).size;
                    const uniqueStudents = new Set(recentGradings.map(g => g.student_name || g.student_id)).size;
                    const highPerformers = recentGradings.filter(g => (g.percentage || 0) >= 90).length;
                    
                    return (
                      <>
                        <Grid item xs={12} sm={6} md={3}>
                          <StatsCard
                            title="Total Gradings"
                            value={totalGradings}
                            subtitle="All time"
                            icon={<GradeIcon sx={{ fontSize: 40 }} />}
                            color="primary"
                          />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <StatsCard
                            title="Average Score"
                            value={`${avgScore.toFixed(1)}%`}
                            subtitle="Across all gradings"
                            icon={<TrendingUpIcon sx={{ fontSize: 40 }} />}
                            color="success"
                          />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <StatsCard
                            title="Assignments"
                            value={uniqueAssignments}
                            subtitle="Unique assignments"
                            icon={<AssignmentIcon sx={{ fontSize: 40 }} />}
                            color="info"
                          />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <StatsCard
                            title="Students"
                            value={uniqueStudents}
                            subtitle={`${highPerformers} high performers`}
                            icon={<PeopleIcon sx={{ fontSize: 40 }} />}
                            color="warning"
                          />
                        </Grid>
                      </>
                    );
                  })()}
                </Grid>
              )}
              
              <Box sx={{ 
                bgcolor: 'white',
                borderRadius: 2,
                p: 3,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <RecentGradingsTab
                  gradings={recentGradings}
                  loading={loadingGradings}
                  onRefresh={fetchRecentGradings}
                />
              </Box>
            </>
          )}
        </TabPanel>

        {/* Canvas Analytics Tab */}
        <TabPanel value={currentTab} index={1}>
          {error && (
            <Alert 
              severity={error.includes('Access denied') || error.includes('permission') ? 'warning' : 'error'} 
              sx={{ 
                mb: 3,
                borderRadius: 2,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }} 
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}
          <Box sx={{ 
            bgcolor: 'white',
            borderRadius: 2,
            p: 3,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
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
          </Box>
        </TabPanel>
      </PageLayout>
    </ProtectedRoute>
  );
}

