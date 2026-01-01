/**
 * CanvasGradingInterface - Full Canvas grading interface embedded in Grade tab
 * Uses settings-configured Canvas API key
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Chip,
  Slider,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  People as PeopleIcon,
  Grade as GradeIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  BarChart as BarChartIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { useRouter } from 'next/router';
import apiClient from '@/utils/apiClient';

interface Course {
  id: number;
  name: string;
  course_code: string;
}

interface Assignment {
  id: number;
  name: string;
  points_possible: number;
  due_at: string | null;
  published: boolean;
}

interface Submission {
  user_id: number;
  user_name: string;
  submission_id: number;
  submitted_at: string | null;
  workflow_state: string;
  score: number | null;
}

interface CanvasGradingInterfaceProps {
  onGradingComplete?: () => void;
}

export const CanvasGradingInterface: React.FC<CanvasGradingInterfaceProps> = ({ onGradingComplete }) => {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
  const [selectedSubmissions, setSelectedSubmissions] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [grading, setGrading] = useState(false);
  const [strictness, setStrictness] = useState(0.5);
  const [rubricId, setRubricId] = useState<string>('');
  const [syncJobId, setSyncJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rubrics, setRubrics] = useState<any[]>([]);
  const [gradingResults, setGradingResults] = useState<any[]>([]);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    fetchCourses();
    fetchRubrics();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      fetchAssignments(selectedCourseId);
    } else {
      setAssignments([]);
      setSelectedAssignmentId(null);
    }
  }, [selectedCourseId]);

  useEffect(() => {
    if (selectedCourseId && selectedAssignmentId) {
      fetchSubmissions(selectedCourseId, selectedAssignmentId);
    } else {
      setSubmissions([]);
      setSelectedSubmissions([]);
    }
  }, [selectedCourseId, selectedAssignmentId]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/settings/canvas/data/courses');
      if (response.data?.courses) {
        setCourses(response.data.courses);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch courses');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async (courseId: number) => {
    try {
      setLoadingAssignments(true);
      const response = await apiClient.get(`/api/settings/canvas/data/courses/${courseId}/assignments`);
      if (response.data?.assignments) {
        setAssignments(response.data.assignments);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch assignments');
    } finally {
      setLoadingAssignments(false);
    }
  };

  const fetchSubmissions = async (courseId: number, assignmentId: number) => {
    try {
      setLoadingSubmissions(true);
      const response = await apiClient.get(
        `/api/settings/canvas/data/courses/${courseId}/assignments/${assignmentId}/submissions`
      );
      if (response.data?.submissions) {
        setSubmissions(response.data.submissions);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch submissions');
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const fetchRubrics = async () => {
    try {
      const response = await apiClient.get('/api/rubrics');
      if (response.data?.rubrics) {
        setRubrics(response.data.rubrics);
      }
    } catch (err) {
      console.error('Failed to fetch rubrics:', err);
    }
  };

  const handleSyncSubmissions = async () => {
    if (!selectedCourseId || !selectedAssignmentId) {
      setError('Please select a course and assignment first');
      return;
    }

    try {
      setSyncing(true);
      setError(null);
      const response = await apiClient.post('/api/canvas/sync-submissions', {
        course_id: selectedCourseId,
        assignment_id: selectedAssignmentId,
        force_sync: false,
      });

      if (response.data?.sync_job_id) {
        setSyncJobId(response.data.sync_job_id);
        setSuccess('Submissions synced successfully. You can now select submissions to grade.');
      } else {
        setError('Failed to sync submissions');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to sync submissions');
    } finally {
      setSyncing(false);
    }
  };

  const handleGradeSelected = async () => {
    if (!syncJobId || selectedSubmissions.length === 0) {
      setError('Please sync submissions and select at least one submission to grade');
      return;
    }

    try {
      setGrading(true);
      setError(null);
      const response = await apiClient.post('/api/canvas/grade-selected-submissions', {
        sync_job_id: syncJobId,
        selected_user_ids: selectedSubmissions,
        rubric_id: rubricId || null,
        strictness: strictness,
      });

      if (response.data?.status === 'success') {
        const gradedCount = response.data.results?.length || selectedSubmissions.length;
        const savedToMongo = response.data.saved_to_mongodb || 0;
        setSavedCount(savedToMongo);
        setGradingResults(response.data.results || []);
        setSuccess(
          `Successfully graded ${gradedCount} submission(s). ${savedToMongo > 0 ? `${savedToMongo} result(s) saved to Results page.` : 'Results are being processed.'}`
        );
        setSelectedSubmissions([]);
        setShowResultsDialog(true);
        // Refresh submissions to show updated scores
        if (selectedCourseId && selectedAssignmentId) {
          setTimeout(() => {
            fetchSubmissions(selectedCourseId, selectedAssignmentId);
          }, 1500);
        }
        // Trigger a custom event to refresh dashboard/comparison data
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gradingCompleted', {
            detail: {
              courseId: selectedCourseId,
              assignmentId: selectedAssignmentId,
              results: response.data.results || []
            }
          }));
        }
        if (onGradingComplete) {
          onGradingComplete();
        }
      } else {
        setError(response.data?.message || 'Grading failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to grade submissions');
    } finally {
      setGrading(false);
    }
  };

  const toggleSubmission = (userId: number) => {
    setSelectedSubmissions((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleAllSubmissions = () => {
    if (selectedSubmissions.length === submissions.length) {
      setSelectedSubmissions([]);
    } else {
      setSelectedSubmissions(submissions.map((s) => s.user_id));
    }
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert 
          severity="success" 
          sx={{ mb: 2 }} 
          onClose={() => setSuccess(null)}
          action={
            savedCount > 0 && (
              <Button
                color="inherit"
                size="small"
                component={Link}
                href="/results"
                startIcon={<VisibilityIcon />}
                sx={{ ml: 2 }}
              >
                View Results
              </Button>
            )
          }
        >
          {success}
        </Alert>
      )}

      {/* Course and Assignment Selection */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Select Course</InputLabel>
            <Select
              value={selectedCourseId || ''}
              onChange={(e) => setSelectedCourseId(e.target.value as number)}
              label="Select Course"
              disabled={loading}
            >
              {courses.map((course) => (
                <MenuItem key={course.id} value={course.id}>
                  {course.course_code || course.name} - {course.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth disabled={!selectedCourseId || loadingAssignments}>
            <InputLabel>Select Assignment</InputLabel>
            <Select
              value={selectedAssignmentId || ''}
              onChange={(e) => setSelectedAssignmentId(e.target.value as number)}
              label="Select Assignment"
            >
              {assignments.map((assignment) => (
                <MenuItem key={assignment.id} value={assignment.id}>
                  {assignment.name} ({assignment.points_possible} pts)
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* Submissions Table */}
      {selectedCourseId && selectedAssignmentId && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Submissions</Typography>
              <Box display="flex" gap={2}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleSyncSubmissions}
                  disabled={syncing}
                >
                  {syncing ? 'Syncing...' : 'Sync Submissions'}
                </Button>
              </Box>
            </Box>

            {loadingSubmissions ? (
              <LinearProgress />
            ) : submissions.length > 0 ? (
              <>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedSubmissions.length === submissions.length && submissions.length > 0}
                            indeterminate={selectedSubmissions.length > 0 && selectedSubmissions.length < submissions.length}
                            onChange={toggleAllSubmissions}
                          />
                        </TableCell>
                        <TableCell>Student</TableCell>
                        <TableCell>Submitted</TableCell>
                        <TableCell align="right">Score</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {submissions.map((submission) => (
                        <TableRow key={submission.user_id} hover>
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={selectedSubmissions.includes(submission.user_id)}
                              onChange={() => toggleSubmission(submission.user_id)}
                            />
                          </TableCell>
                          <TableCell>{submission.user_name}</TableCell>
                          <TableCell>
                            {submission.submitted_at
                              ? new Date(submission.submitted_at).toLocaleDateString()
                              : 'Not submitted'}
                          </TableCell>
                          <TableCell align="right">
                            {submission.score !== null ? `${submission.score}` : '-'}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={submission.workflow_state}
                              size="small"
                              color={
                                submission.workflow_state === 'graded'
                                  ? 'success'
                                  : submission.workflow_state === 'submitted'
                                  ? 'info'
                                  : 'default'
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {selectedSubmissions.length > 0 && (
                  <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Grade {selectedSubmissions.length} selected submission(s)
                    </Typography>

                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                          <InputLabel>Rubric (Optional)</InputLabel>
                          <Select
                            value={rubricId}
                            onChange={(e) => setRubricId(e.target.value)}
                            label="Rubric (Optional)"
                          >
                            <MenuItem value="">Use Default Rubric</MenuItem>
                            <MenuItem value="ai_generated">AI-Generated Rubric</MenuItem>
                            {rubrics.map((rubric) => (
                              <MenuItem key={rubric.id} value={rubric.id}>
                                {rubric.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <Typography gutterBottom>Strictness: {strictness.toFixed(1)}</Typography>
                        <Slider
                          value={strictness}
                          onChange={(e, value) => setStrictness(value as number)}
                          min={0}
                          max={1}
                          step={0.1}
                          marks={[
                            { value: 0, label: 'Lenient' },
                            { value: 0.5, label: 'Moderate' },
                            { value: 1, label: 'Strict' },
                          ]}
                        />
                      </Grid>
                    </Grid>

                    <Button
                      variant="contained"
                      startIcon={<GradeIcon />}
                      onClick={handleGradeSelected}
                      disabled={grading || !syncJobId}
                      fullWidth
                      sx={{ mt: 2 }}
                    >
                      {grading ? 'Grading...' : `Grade ${selectedSubmissions.length} Submission(s)`}
                    </Button>
                  </Box>
                )}
              </>
            ) : (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                {syncJobId
                  ? 'No submissions found. Click "Sync Submissions" to download submission data.'
                  : 'Click "Sync Submissions" to fetch submission data from Canvas.'}
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* Grading Results Dialog */}
      <Dialog
        open={showResultsDialog}
        onClose={() => setShowResultsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Grading Results</Typography>
            <Chip
              icon={<CheckCircleIcon />}
              label={`${savedCount} saved`}
              color="success"
              size="small"
            />
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="success" sx={{ mb: 2 }}>
            Results have been saved to the database and are available in the Results page.
          </Alert>
          
          {gradingResults.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Student</strong></TableCell>
                    <TableCell align="right"><strong>Score</strong></TableCell>
                    <TableCell align="right"><strong>Percentage</strong></TableCell>
                    <TableCell align="center"><strong>Grade</strong></TableCell>
                    <TableCell align="center"><strong>Status</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {gradingResults
                    .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
                    .map((result, index) => {
                      const percentage = result.percentage || 0;
                      const gradeLetter = percentage >= 90 ? 'A' : 
                                         percentage >= 80 ? 'B' : 
                                         percentage >= 70 ? 'C' : 
                                         percentage >= 60 ? 'D' : 'F';
                      const gradeColor = percentage >= 90 ? 'success' : 
                                         percentage >= 80 ? 'info' : 
                                         percentage >= 70 ? 'warning' : 'error';
                      return (
                        <TableRow key={index} hover>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="body2" fontWeight="medium">
                                {result.user_name || `User ${result.user_id}`}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="medium">
                              {result.raw_score !== undefined ? `${result.raw_score}/${result.total_points || 100}` : '-'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={`${percentage.toFixed(1)}%`}
                              size="small"
                              color={gradeColor}
                              sx={{ fontWeight: 'bold' }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={gradeLetter}
                              size="small"
                              color={gradeColor}
                              variant="outlined"
                              sx={{ fontWeight: 'bold', minWidth: 40 }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={result.status === 'graded' ? 'Graded' : result.status || 'Unknown'}
                              size="small"
                              color={result.status === 'graded' ? 'success' : 'default'}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
              No results to display
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowResultsDialog(false)}>Close</Button>
          {savedCount > 0 && (
            <>
              <Button
                component={Link}
                href="/dashboard"
                variant="outlined"
                startIcon={<BarChartIcon />}
                onClick={() => setShowResultsDialog(false)}
              >
                View Comparison
              </Button>
              <Button
                component={Link}
                href="/results"
                variant="contained"
                startIcon={<VisibilityIcon />}
                onClick={() => setShowResultsDialog(false)}
              >
                View All Results
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};


