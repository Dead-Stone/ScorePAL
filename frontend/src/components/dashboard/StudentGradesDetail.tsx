/**
 * StudentGradesDetail - Detailed view of a student's grades with assignment breakdown
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 */

import React, { useState, useEffect, useTransition } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Paper,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Divider,
  LinearProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import GradeIcon from '@mui/icons-material/Grade';
import AssignmentIcon from '@mui/icons-material/Assignment';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import apiClient from '@/utils/apiClient';

interface AssignmentGrade {
  assignment_id: number;
  assignment_name: string;
  score: number | null;
  points_possible: number;
  percentage: number | null;
  grade: string | null;
  submitted: boolean;
  graded: boolean;
  submitted_at: string | null;
  graded_at: string | null;
  late: boolean;
  missing: boolean;
}

interface StudentGradesData {
  student_id: number;
  course_id: number;
  grades: {
    current_score: number | null;
    final_score: number | null;
    current_grade: string | null;
    final_grade: string | null;
    current_points: number | null;
    final_points: number | null;
  };
  assignments: AssignmentGrade[];
  summary?: {
    total_assignments: number;
    submitted_count: number;
    graded_count: number;
    average_score: number | null;
    total_points_earned: number;
    total_points_possible: number;
  };
}

interface StudentGradesDetailProps {
  open: boolean;
  onClose: () => void;
  courseId: number;
  studentId: number;
  studentName: string;
}

export const StudentGradesDetail: React.FC<StudentGradesDetailProps> = ({
  open,
  onClose,
  courseId,
  studentId,
  studentName,
}) => {
  const [gradesData, setGradesData] = useState<StudentGradesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !open || !courseId || !studentId) return;

    startTransition(() => {
      fetchStudentGrades();
    });
  }, [open, courseId, studentId, mounted]);

  const fetchStudentGrades = async () => {
    if (!mounted) return;

    try {
      startTransition(() => {
        setLoading(true);
        setError(null);
      });

      const response = await apiClient.get(
        `/api/settings/canvas/data/courses/${courseId}/students/${studentId}/grades?include_analytics=true`
      );

      if (response.data?.student_data) {
        startTransition(() => {
          setGradesData(response.data.student_data);
        });
      }
    } catch (err: any) {
      console.error('Error fetching student grades:', err);
      startTransition(() => {
        setError(err.response?.data?.detail || 'Failed to load student grades');
      });
    } finally {
      startTransition(() => {
        setLoading(false);
      });
    }
  };

  const getGradeColor = (percentage: number | null) => {
    if (percentage === null) return 'default';
    if (percentage >= 90) return 'success';
    if (percentage >= 80) return 'info';
    if (percentage >= 70) return 'warning';
    return 'error';
  };

  const getGradeLetter = (percentage: number | null) => {
    if (percentage === null) return 'N/A';
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  };

  const assignments = gradesData?.assignments || [];
  const summary = gradesData?.summary;
  const overallGrade = gradesData?.grades;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6" component="div">
              {studentName} - Grades
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Course ID: {courseId}
            </Typography>
          </Box>
          <Button onClick={onClose} size="small" startIcon={<CloseIcon />}>
            Close
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {loading || isPending ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : gradesData ? (
          <Box>
            {/* Summary Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Current Grade
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {overallGrade?.current_grade || 'N/A'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {overallGrade?.current_score !== null
                        ? `${overallGrade.current_score.toFixed(1)}%`
                        : 'N/A'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Total Points
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {summary?.total_points_earned.toFixed(1) || '0'} / {summary?.total_points_possible.toFixed(0) || '0'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {summary?.total_points_possible
                        ? `${((summary.total_points_earned / summary.total_points_possible) * 100).toFixed(1)}%`
                        : 'N/A'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Assignments
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {summary?.graded_count || 0} / {summary?.total_assignments || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Graded
                    </Typography>
                    {summary && summary.total_assignments > 0 && (
                      <LinearProgress
                        variant="determinate"
                        value={(summary.graded_count / summary.total_assignments) * 100}
                        sx={{ mt: 1, height: 6, borderRadius: 3 }}
                      />
                    )}
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Average Score
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color={`${getGradeColor(summary?.average_score || null)}.main`}>
                      {summary?.average_score !== null
                        ? `${summary.average_score.toFixed(1)}%`
                        : 'N/A'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {summary?.average_score !== null
                        ? `Grade: ${getGradeLetter(summary.average_score)}`
                        : 'No grades yet'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Assignments Table */}
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Assignment Breakdown
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Assignment</TableCell>
                    <TableCell align="right">Points</TableCell>
                    <TableCell align="right">Score</TableCell>
                    <TableCell align="right">Percentage</TableCell>
                    <TableCell align="center">Grade</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell>Submitted</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {assignments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                          No assignments found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    assignments.map((assignment) => (
                      <TableRow key={assignment.assignment_id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {assignment.assignment_name}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {assignment.points_possible || 'N/A'}
                        </TableCell>
                        <TableCell align="right">
                          {assignment.score !== null
                            ? `${assignment.score.toFixed(1)}`
                            : 'N/A'}
                        </TableCell>
                        <TableCell align="right">
                          {assignment.percentage !== null ? (
                            <Chip
                              label={`${assignment.percentage.toFixed(1)}%`}
                              color={getGradeColor(assignment.percentage) as any}
                              size="small"
                            />
                          ) : (
                            'N/A'
                          )}
                        </TableCell>
                        <TableCell align="center">
                          {assignment.grade ? (
                            <Chip
                              label={assignment.grade}
                              color={getGradeColor(assignment.percentage) as any}
                              size="small"
                            />
                          ) : (
                            'N/A'
                          )}
                        </TableCell>
                        <TableCell align="center">
                          {assignment.missing ? (
                            <Chip label="Missing" color="error" size="small" />
                          ) : assignment.late ? (
                            <Chip label="Late" color="warning" size="small" />
                          ) : assignment.submitted ? (
                            <Chip label="Submitted" color="success" size="small" />
                          ) : (
                            <Chip label="Not Submitted" color="default" size="small" />
                          )}
                        </TableCell>
                        <TableCell>
                          {assignment.submitted_at
                            ? new Date(assignment.submitted_at).toLocaleDateString()
                            : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        ) : null}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

