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

interface StudentCoursesViewProps {
  userId: string;
}

export const StudentCoursesView: React.FC<StudentCoursesViewProps> = ({ userId }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCourse, setExpandedCourse] = useState<number | null>(null);

  useEffect(() => {
    fetchCourses();
  }, [userId]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/api/settings/canvas/data/student/courses');
      if (response.data?.courses) {
        setCourses(response.data.courses);
      }
    } catch (err: any) {
      if (err.response?.status === 400) {
        setError('Canvas API key not configured. Please configure it in settings.');
      } else {
        setError(err.response?.data?.detail || 'Failed to load courses');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleCourse = (courseId: number) => {
    setExpandedCourse(expandedCourse === courseId ? null : courseId);
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
                <Typography variant="body2" color="text.secondary">
                  Course details and assignments will be shown here
                </Typography>
              </CardContent>
            </Collapse>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};


