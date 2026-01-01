/**
 * CanvasAnalyticsTab - Enhanced Canvas analytics tab with improved charts and insights
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 */

import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  LinearProgress,
  Alert,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Autocomplete,
  TextField,
} from '@mui/material';
import Link from 'next/link';
import RefreshIcon from '@mui/icons-material/Refresh';
import apiClient from '@/utils/apiClient';
import GradeIcon from '@mui/icons-material/Grade';
import SchoolIcon from '@mui/icons-material/School';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { ChartWrapper } from '../charts/ChartWrapper';
import { StatsCard } from '../cards/StatsCard';
import { StudentsList } from './StudentsList';
import { ClassIssuesInsights } from './ClassIssuesInsights';
import { StudentComparison } from './StudentComparison';
import dynamic from 'next/dynamic';

const BarChart = dynamic(() => import('react-chartjs-2').then(mod => mod.Bar), { ssr: false });
const PieChart = dynamic(() => import('react-chartjs-2').then(mod => mod.Pie), { ssr: false });

interface Assignment {
  id: number;
  name: string;
  points_possible: number | null;
  due_at: string | null;
  published: boolean;
  submission_types: string[];
  statistics?: {
    submissions_count: number;
    graded_count: number;
    average_score: number | null;
  };
}

interface CourseDetails {
  assignments: Assignment[];
  total_submissions: number;
  total_graded: number;
  average_score: number | null;
}

interface CanvasAnalyticsTabProps {
  canvasConfigured: boolean;
  courses: Array<{ id: number; name: string; course_code: string }>;
  selectedCourseId: number | null;
  courseDetails: CourseDetails | null;
  loadingCourseDetails: boolean;
  onCourseChange: (courseId: number) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export const CanvasAnalyticsTab: React.FC<CanvasAnalyticsTabProps> = ({
  canvasConfigured,
  courses,
  selectedCourseId,
  courseDetails,
  loadingCourseDetails,
  onCourseChange,
  onRefresh,
  refreshing,
}) => {
  const [students, setStudents] = React.useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = React.useState(false);

  React.useEffect(() => {
    if (selectedCourseId) {
      fetchStudents();
    }
  }, [selectedCourseId]);

  // Listen for grading completion events to refresh student data
  React.useEffect(() => {
    const handleGradingComplete = (event: CustomEvent) => {
      // Refresh student data if the grading was for this course
      if (selectedCourseId && event.detail?.courseId === selectedCourseId) {
        setTimeout(() => {
          fetchStudents();
        }, 2000);
      }
    };

    window.addEventListener('gradingCompleted', handleGradingComplete as EventListener);
    return () => {
      window.removeEventListener('gradingCompleted', handleGradingComplete as EventListener);
    };
  }, [selectedCourseId]);

  const fetchStudents = async () => {
    if (!selectedCourseId) return;
    
    try {
      setLoadingStudents(true);
      const response = await apiClient.get(
        `/api/settings/canvas/data/courses/${selectedCourseId}/students?include_performance=true`
      );
      if (response.data?.students) {
        setStudents(response.data.students);
      }
    } catch (err: any) {
      console.error('Error fetching students for insights:', err);
    } finally {
      setLoadingStudents(false);
    }
  };
  if (!canvasConfigured) {
    return (
      <Alert severity="info">
        Canvas is not configured. Please configure your Canvas API key in{' '}
        <Link href="/settings" prefetch={true} style={{ textDecoration: 'underline' }}>
          Settings
        </Link>{' '}
        to view analytics.
      </Alert>
    );
  }

  const handleTestAccess = async () => {
    if (!selectedCourseId) return;
    
    try {
      const response = await apiClient.get(`/api/settings/canvas/data/courses/${selectedCourseId}/test-access`);
      if (response.data?.test_results) {
        const results = response.data.test_results;
        const message = `Access Test Results:\n` +
          `Course: ${results.can_access_course ? '✓' : '✗'}\n` +
          `Assignments: ${results.can_access_assignments ? '✓' : '✗'}\n` +
          `Students: ${results.can_access_students ? '✓' : '✗'}\n` +
          `Submissions: ${results.can_access_submissions ? '✓' : '✗'}\n` +
          (results.errors.length > 0 ? `\nErrors:\n${results.errors.join('\n')}` : '') +
          (results.recommendations.length > 0 ? `\nRecommendations:\n${results.recommendations.join('\n')}` : '');
        alert(message);
      }
    } catch (err: any) {
      alert(`Test failed: ${err.response?.data?.detail || err.message}`);
    }
  };

  if (courses.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <SchoolIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          No courses found
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          You don't have access to any courses yet, or your Canvas API key doesn't have the
          necessary permissions.
        </Typography>
      </Paper>
    );
  }

  const stats = courseDetails ? {
    totalAssignments: courseDetails.assignments.length,
    publishedAssignments: courseDetails.assignments.filter(a => a.published).length,
    totalSubmissions: courseDetails.total_submissions,
    totalGraded: courseDetails.total_graded,
    avgScore: courseDetails.average_score,
    gradingProgress: courseDetails.total_submissions > 0 
      ? (courseDetails.total_graded / courseDetails.total_submissions) * 100 
      : 0,
  } : null;

  return (
    <Box>
      {/* Access Test Alert */}
      {canvasConfigured && selectedCourseId && (
        <Alert 
          severity="info" 
          sx={{ mb: 2 }}
          action={
            <Button
              size="small"
              onClick={handleTestAccess}
            >
              Test Access
            </Button>
          }
        >
          Having access issues? Click "Test Access" to diagnose permission problems.
        </Alert>
      )}

      {/* Course Selector - Compact with Autocomplete */}
      <Paper sx={{ p: 1.5, mb: 2, bgcolor: 'grey.50' }}>
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={12} md={onRefresh ? 10 : 12}>
            <Autocomplete
              options={courses}
              getOptionLabel={(option) => 
                option.course_code 
                  ? `${option.course_code} - ${option.name}` 
                  : option.name
              }
              value={courses.find(c => c.id === selectedCourseId) || null}
              onChange={(event, newValue) => {
                if (newValue) {
                  onCourseChange(newValue.id);
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Course"
                  size="small"
                  placeholder={courses.length > 0 ? "Search or select a course..." : "No courses available"}
                  sx={{
                    bgcolor: 'white',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1,
                    }
                  }}
                />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props} sx={{ py: 1 }}>
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {option.course_code || option.name}
                    </Typography>
                    {option.course_code && (
                      <Typography variant="caption" color="text.secondary">
                        {option.name}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
              noOptionsText={courses.length === 0 ? "No courses available" : "No courses found"}
              disabled={courses.length === 0}
            />
          </Grid>
          {onRefresh && (
            <Grid item xs={12} md={2}>
              <Tooltip title="Refresh courses">
                <IconButton 
                  onClick={onRefresh} 
                  disabled={refreshing}
                  size="small"
                  sx={{ 
                    bgcolor: 'white',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    '&:hover': { bgcolor: 'grey.100' }
                  }}
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Grid>
          )}
        </Grid>
        {courses.length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {courses.length} course{courses.length !== 1 ? 's' : ''} available
          </Typography>
        )}
      </Paper>

      {/* Loading State */}
      {loadingCourseDetails && (
        <Box mb={2}>
          <LinearProgress sx={{ borderRadius: 1 }} />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
            Loading course analytics...
          </Typography>
        </Box>
      )}

      {/* Empty State - No Course Selected */}
      {!loadingCourseDetails && !courseDetails && selectedCourseId && (
        <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
          <Typography variant="body2" color="text.secondary">
            Loading course details...
          </Typography>
        </Paper>
      )}

      {/* Statistics and Charts */}
      {courseDetails && stats ? (
        <>
          {/* Statistics Cards */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="Total Assignments"
                value={stats.totalAssignments}
                subtitle={`${stats.publishedAssignments} published`}
                icon={<AssignmentIcon sx={{ fontSize: 40 }} />}
                color="primary"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="Total Submissions"
                value={stats.totalSubmissions}
                subtitle={`${stats.totalGraded} graded`}
                icon={<PeopleIcon sx={{ fontSize: 40 }} />}
                color="success"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="Average Score"
                value={stats.avgScore !== null ? `${stats.avgScore.toFixed(1)}%` : 'N/A'}
                subtitle="Across all assignments"
                icon={<TrendingUpIcon sx={{ fontSize: 40 }} />}
                color="info"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="Grading Progress"
                value={`${stats.gradingProgress.toFixed(0)}%`}
                subtitle={
                  <LinearProgress
                    variant="determinate"
                    value={stats.gradingProgress}
                    sx={{ mt: 1, height: 6, borderRadius: 3 }}
                  />
                }
                icon={<CheckCircleIcon sx={{ fontSize: 40 }} />}
                color="warning"
              />
            </Grid>
          </Grid>

          {/* Charts */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {/* Assignment Scores Chart */}
            <Grid item xs={12} md={8}>
              <Card>
                <CardHeader
                  title="Assignment Performance"
                  subheader="Average scores across assignments"
                  sx={{ pb: 1 }}
                  titleTypographyProps={{ variant: 'h6', fontSize: '1rem', fontWeight: 600 }}
                  subheaderTypographyProps={{ variant: 'body2', fontSize: '0.875rem' }}
                />
                <CardContent sx={{ pt: 1 }}>
                  <ChartWrapper>
                    <BarChart
                      data={{
                        labels: courseDetails.assignments
                          .filter(a => a.statistics?.average_score !== null)
                          .map(a => a.name.length > 20 ? a.name.substring(0, 20) + '...' : a.name),
                        datasets: [
                          {
                            label: 'Average Score (%)',
                            data: courseDetails.assignments
                              .filter(a => a.statistics?.average_score !== null)
                              .map(a => a.statistics!.average_score!),
                            backgroundColor: 'rgba(54, 162, 235, 0.7)',
                            borderColor: 'rgba(54, 162, 235, 1)',
                            borderWidth: 1,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          title: { display: false },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                              callback: function (value) {
                                return value + '%';
                              },
                            },
                          },
                        },
                      }}
                      height={300}
                    />
                  </ChartWrapper>
                </CardContent>
              </Card>
            </Grid>

            {/* Submission Status Pie Chart */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardHeader 
                  title="Submission Status" 
                  sx={{ pb: 1 }}
                  titleTypographyProps={{ variant: 'h6', fontSize: '1rem', fontWeight: 600 }}
                />
                <CardContent sx={{ pt: 1 }}>
                  <ChartWrapper>
                    <PieChart
                      data={{
                        labels: ['Graded', 'Ungraded'],
                        datasets: [
                          {
                            data: [stats.totalGraded, stats.totalSubmissions - stats.totalGraded],
                            backgroundColor: ['rgba(75, 192, 192, 0.7)', 'rgba(255, 99, 132, 0.7)'],
                            borderColor: ['rgba(75, 192, 192, 1)', 'rgba(255, 99, 132, 1)'],
                            borderWidth: 1,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { position: 'bottom' },
                        },
                      }}
                      height={300}
                    />
                  </ChartWrapper>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Student Comparison */}
          {selectedCourseId && students.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <StudentComparison students={students} loading={loadingStudents} />
            </Box>
          )}

          {/* Class Issues Insights */}
          {selectedCourseId && !loadingStudents && students.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <ClassIssuesInsights students={students} />
            </Box>
          )}

          {/* Students List */}
          {selectedCourseId && (
            <Box sx={{ mb: 2 }}>
              <StudentsList courseId={selectedCourseId} />
            </Box>
          )}

          {/* Assignments Table */}
          <Card>
            <CardHeader
              title="Assignments Overview"
              sx={{ pb: 1 }}
              titleTypographyProps={{ variant: 'h6', fontSize: '1rem', fontWeight: 600 }}
              action={
                <Button
                  component={Link}
                  href="/grade"
                  variant="contained"
                  size="small"
                  startIcon={<GradeIcon />}
                >
                  Grade Now
                </Button>
              }
            />
            <TableContainer>
              <Table size="small" sx={{ '& .MuiTableCell-root': { py: 1 } }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Assignment</TableCell>
                    <TableCell align="right">Points</TableCell>
                    <TableCell align="right">Submissions</TableCell>
                    <TableCell align="right">Graded</TableCell>
                    <TableCell align="right">Avg Score</TableCell>
                    <TableCell align="right">Due Date</TableCell>
                    <TableCell align="center">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {courseDetails.assignments.map((assignment) => (
                    <TableRow key={assignment.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {assignment.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {assignment.submission_types.join(', ')}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{assignment.points_possible || 'N/A'}</TableCell>
                      <TableCell align="right">
                        {assignment.statistics?.submissions_count || 0}
                      </TableCell>
                      <TableCell align="right">
                        {assignment.statistics?.graded_count || 0}
                      </TableCell>
                      <TableCell align="right">
                        {assignment.statistics?.average_score !== null
                          ? `${assignment.statistics!.average_score.toFixed(1)}%`
                          : 'N/A'}
                      </TableCell>
                      <TableCell align="right">
                        {assignment.due_at
                          ? new Date(assignment.due_at).toLocaleDateString()
                          : 'No due date'}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={assignment.published ? 'Published' : 'Draft'}
                          color={assignment.published ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </>
      ) : !loadingCourseDetails && selectedCourseId ? (
        <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
          <Typography variant="body2" color="text.secondary">
            Loading course details...
          </Typography>
        </Paper>
      ) : null}
    </Box>
  );
};

