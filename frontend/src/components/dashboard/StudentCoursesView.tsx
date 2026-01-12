/**
 * StudentCoursesView - Shows student courses with grades
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  School as SchoolIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  TrendingUp as TrendingUpIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import apiClient from '@/utils/apiClient';

interface Course {
  id: number;
  name: string;
  course_code: string;
  current_score?: number;
  final_score?: number;
  current_grade?: string;
  enrollment_state?: string;
}

interface Assignment {
  id: number;
  name: string;
  due_at?: string;
  points_possible?: number;
  score?: number;
  percentage?: number;
  grade?: string;
  submitted_at?: string;
  graded_at?: string;
  workflow_state?: string;
  late?: boolean;
  missing?: boolean;
}

interface CoursePerformance {
  course_info: {
    id: number;
    name: string;
    course_code: string;
    term?: string;
  };
  student_assignments: Assignment[];
  student_total_points: number;
  student_total_possible: number;
  student_overall_percentage?: number;
  student_average?: number;
  comparison?: {
    class_average?: number;
    class_high?: number;
    class_low?: number;
    student_percentile?: number;
    total_students?: number;
  };
}

interface StudentCoursesViewProps {
  userId: string;
}

export const StudentCoursesView: React.FC<StudentCoursesViewProps> = ({ userId }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCourse, setExpandedCourse] = useState<number | null>(null);
  const [coursePerformance, setCoursePerformance] = useState<Record<number, CoursePerformance>>({});
  const [loadingPerformance, setLoadingPerformance] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetchCourses();
  }, [userId]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/api/settings/canvas/data/student/courses');
      if (response.data?.courses) {
        // Process courses to extract grades from enrollments if needed
        const processedCourses = response.data.courses.map((course: any) => {
          // Extract grades from enrollments if available
          const enrollments = course.enrollments || [];
          const studentEnrollment = enrollments.find((e: any) => e.type === 'StudentEnrollment');
          
          if (studentEnrollment?.grades) {
            return {
              ...course,
              current_score: studentEnrollment.grades.current_score,
              final_score: studentEnrollment.grades.final_score,
              current_grade: studentEnrollment.grades.current_grade,
              final_grade: studentEnrollment.grades.final_grade,
            };
          }
          return course;
        });
        setCourses(processedCourses);
        
        // Show helpful message if courses seem missing
        if (response.data.message && processedCourses.length === 0) {
          setError(response.data.message);
        } else if (processedCourses.length === 0 && response.data.total_fetched === 0) {
          setError('No courses found. Make sure you are enrolled in courses and they are published in Canvas.');
        }
      }
    } catch (err: any) {
      if (err.response?.status === 400) {
        setError('Canvas API key not configured. Please configure it in settings.');
      } else {
        const errorMsg = err.response?.data?.detail || 'Failed to load courses';
        // Add helpful context
        if (errorMsg.includes('permission') || errorMsg.includes('403')) {
          setError(`${errorMsg} Make sure your Canvas API key has permission to read courses and enrollments.`);
        } else {
          setError(`${errorMsg} If courses are missing, they may be concluded, unpublished, or you may not be enrolled. Check Canvas directly to verify.`);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleCourse = async (courseId: number) => {
    if (expandedCourse === courseId) {
      setExpandedCourse(null);
    } else {
      setExpandedCourse(courseId);
      // Fetch performance data when expanding
      if (!coursePerformance[courseId] && !loadingPerformance[courseId]) {
        await fetchCoursePerformance(courseId);
      }
    }
  };

  const fetchCoursePerformance = async (courseId: number) => {
    try {
      setLoadingPerformance(prev => ({ ...prev, [courseId]: true }));
      const response = await apiClient.get(`/api/settings/canvas/data/student/courses/${courseId}/performance?include_comparison=true`);
      if (response.data) {
        setCoursePerformance(prev => ({ ...prev, [courseId]: response.data }));
      }
    } catch (err: any) {
      console.error('Failed to fetch course performance:', err);
    } finally {
      setLoadingPerformance(prev => ({ ...prev, [courseId]: false }));
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (state?: string, late?: boolean, missing?: boolean) => {
    if (missing) return 'error';
    if (late) return 'warning';
    if (state === 'graded') return 'success';
    if (state === 'submitted') return 'info';
    return 'default';
  };

  const getStatusLabel = (assignment: Assignment) => {
    if (assignment.missing) return 'Missing';
    if (assignment.late) return 'Late';
    if (assignment.workflow_state === 'graded') return 'Graded';
    if (assignment.workflow_state === 'submitted') return 'Submitted';
    if (assignment.workflow_state === 'unsubmitted') return 'Not Submitted';
    return 'Unknown';
  };

  const getGradeColor = (grade?: string) => {
    if (!grade) return 'default';
    if (grade.startsWith('A')) return 'success';
    if (grade.startsWith('B')) return 'info';
    if (grade.startsWith('C')) return 'warning';
    return 'error';
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="info">{error}</Alert>
        </CardContent>
      </Card>
    );
  }

  if (courses.length === 0) {
    return (
      <Card>
        <CardContent>
          <Box textAlign="center" py={4}>
            <SchoolIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No courses found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You are not enrolled in any courses yet, or Canvas is not configured.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Grid container spacing={2}>
      {courses.map((course) => (
        <Grid item xs={12} key={course.id}>
          <Card>
            <CardHeader
              avatar={<SchoolIcon />}
              title={
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="h6">{course.name}</Typography>
                  {course.course_code && (
                    <Chip label={course.course_code} size="small" variant="outlined" />
                  )}
                </Box>
              }
              subheader={
                <Box display="flex" alignItems="center" gap={2} mt={1}>
                  {course.current_score !== null && course.current_score !== undefined && (
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Current Score
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="h6" fontWeight="bold">
                          {course.current_score.toFixed(1)}%
                        </Typography>
                        {course.current_grade && (
                          <Chip
                            label={course.current_grade}
                            size="small"
                            color={getGradeColor(course.current_grade)}
                          />
                        )}
                      </Box>
                    </Box>
                  )}
                  {course.final_score !== null && course.final_score !== undefined && (
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Final Score
                      </Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {course.final_score.toFixed(1)}%
                      </Typography>
                    </Box>
                  )}
                </Box>
              }
              action={
                <IconButton onClick={() => toggleCourse(course.id)}>
                  {expandedCourse === course.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              }
            />
            <Collapse in={expandedCourse === course.id} timeout="auto" unmountOnExit>
              <CardContent>
                {loadingPerformance[course.id] ? (
                  <Box display="flex" justifyContent="center" py={3}>
                    <CircularProgress size={24} />
                  </Box>
                ) : coursePerformance[course.id] ? (
                  <Box>
                    {/* Performance Summary */}
                    {coursePerformance[course.id].student_overall_percentage !== null && (
                      <Box mb={3}>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={4}>
                            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                              <Typography variant="body2">Overall Score</Typography>
                              <Typography variant="h5" fontWeight="bold">
                                {coursePerformance[course.id].student_overall_percentage?.toFixed(1)}%
                              </Typography>
                            </Paper>
                          </Grid>
                          {coursePerformance[course.id].student_average && (
                            <Grid item xs={12} sm={4}>
                              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.light', color: 'info.contrastText' }}>
                                <Typography variant="body2">Average</Typography>
                                <Typography variant="h5" fontWeight="bold">
                                  {coursePerformance[course.id].student_average?.toFixed(1)}%
                                </Typography>
                              </Paper>
                            </Grid>
                          )}
                          {coursePerformance[course.id].comparison?.student_percentile && (
                            <Grid item xs={12} sm={4}>
                              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'success.contrastText' }}>
                                <Typography variant="body2">Percentile</Typography>
                                <Typography variant="h5" fontWeight="bold">
                                  {coursePerformance[course.id].comparison?.student_percentile}th
                                </Typography>
                              </Paper>
                            </Grid>
                          )}
                        </Grid>
                      </Box>
                    )}

                    {/* Assignments Table */}
                    <Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 2 }}>
                      Assignments
                    </Typography>
                    {coursePerformance[course.id].student_assignments.length > 0 ? (
                      <TableContainer component={Paper} variant="outlined">
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell><strong>Assignment</strong></TableCell>
                              <TableCell><strong>Due Date</strong></TableCell>
                              <TableCell align="right"><strong>Points</strong></TableCell>
                              <TableCell align="right"><strong>Score</strong></TableCell>
                              <TableCell align="right"><strong>Grade</strong></TableCell>
                              <TableCell align="center"><strong>Status</strong></TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {coursePerformance[course.id].student_assignments.map((assignment) => (
                              <TableRow key={assignment.id} hover>
                                <TableCell>
                                  <Box>
                                    <Typography variant="body2" fontWeight="medium">
                                      {assignment.name}
                                    </Typography>
                                    {assignment.submitted_at && (
                                      <Typography variant="caption" color="text.secondary">
                                        Submitted: {formatDate(assignment.submitted_at)}
                                      </Typography>
                                    )}
                                  </Box>
                                </TableCell>
                                <TableCell>{formatDate(assignment.due_at)}</TableCell>
                                <TableCell align="right">
                                  {assignment.points_possible ? `${assignment.points_possible}` : 'N/A'}
                                </TableCell>
                                <TableCell align="right">
                                  {assignment.score !== null && assignment.score !== undefined ? (
                                    <Typography variant="body2" fontWeight="medium">
                                      {assignment.score.toFixed(1)}
                                      {assignment.percentage && (
                                        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                          ({assignment.percentage.toFixed(1)}%)
                                        </Typography>
                                      )}
                                    </Typography>
                                  ) : (
                                    <Typography variant="body2" color="text.secondary">-</Typography>
                                  )}
                                </TableCell>
                                <TableCell align="right">
                                  {assignment.grade ? (
                                    <Chip label={assignment.grade} size="small" color={getGradeColor(assignment.grade)} />
                                  ) : (
                                    <Typography variant="body2" color="text.secondary">-</Typography>
                                  )}
                                </TableCell>
                                <TableCell align="center">
                                  <Chip
                                    label={getStatusLabel(assignment)}
                                    size="small"
                                    color={getStatusColor(assignment.workflow_state, assignment.late, assignment.missing)}
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Alert severity="info">No assignments found for this course.</Alert>
                    )}

                    {/* Class Comparison */}
                    {coursePerformance[course.id].comparison && (
                      <Box mt={3}>
                        <Typography variant="h6" gutterBottom>
                          Class Comparison
                        </Typography>
                        <Grid container spacing={2}>
                          {coursePerformance[course.id].comparison?.class_average !== null && (
                            <Grid item xs={12} sm={4}>
                              <Paper sx={{ p: 2 }}>
                                <Typography variant="body2" color="text.secondary">Class Average</Typography>
                                <Typography variant="h6">{coursePerformance[course.id].comparison?.class_average?.toFixed(1)}%</Typography>
                              </Paper>
                            </Grid>
                          )}
                          {coursePerformance[course.id].comparison?.class_high !== null && (
                            <Grid item xs={12} sm={4}>
                              <Paper sx={{ p: 2 }}>
                                <Typography variant="body2" color="text.secondary">Highest Score</Typography>
                                <Typography variant="h6">{coursePerformance[course.id].comparison?.class_high?.toFixed(1)}%</Typography>
                              </Paper>
                            </Grid>
                          )}
                          {coursePerformance[course.id].comparison?.total_students && (
                            <Grid item xs={12} sm={4}>
                              <Paper sx={{ p: 2 }}>
                                <Typography variant="body2" color="text.secondary">Total Students</Typography>
                                <Typography variant="h6">{coursePerformance[course.id].comparison?.total_students}</Typography>
                              </Paper>
                            </Grid>
                          )}
                        </Grid>
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Alert severity="info">
                    Click to load course details and assignments from Canvas.
                  </Alert>
                )}
              </CardContent>
            </Collapse>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};


