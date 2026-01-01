/**
 * CanvasGradingSteps - Step-by-step flow for Canvas grading
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Chip,
  Slider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  PlayArrow as PlayArrowIcon,
  CheckCircle as CheckCircleIcon,
  Assessment as AssessmentIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import apiClient from '@/utils/apiClient';

interface CanvasGradingStepsProps {
  onComplete?: (data: {
    courseId: number;
    assignmentId: number;
    selectedSubmissions: string[];
    strictness: number;
  }) => void;
  isLoading?: boolean;
  rubricId?: string;
}

const steps = [
  { label: 'Select Course', icon: <SchoolIcon /> },
  { label: 'Select Assignment', icon: <AssignmentIcon /> },
  { label: 'Select Submissions', icon: <PeopleIcon /> },
  { label: 'Configure Settings', icon: <SettingsIcon /> },
  { label: 'Grade Submissions', icon: <PlayArrowIcon /> },
  { label: 'View Results', icon: <AssessmentIcon /> },
];

export const CanvasGradingSteps: React.FC<CanvasGradingStepsProps> = ({
  onComplete,
  isLoading: externalIsLoading = false,
  rubricId = '',
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [selectedSubmissions, setSelectedSubmissions] = useState<string[]>([]);
  const [strictness, setStrictness] = useState(0.5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [syncJobId, setSyncJobId] = useState<string | null>(null);
  const [gradingResults, setGradingResults] = useState<any[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [isGrading, setIsGrading] = useState(false);

  useEffect(() => {
    if (activeStep >= 0) {
      fetchCourses();
    }
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
    if (selectedAssignmentId && selectedCourseId) {
      fetchSubmissions(selectedAssignmentId);
    } else {
      setSubmissions([]);
      setSelectedSubmissions([]);
    }
  }, [selectedAssignmentId, selectedCourseId]);

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
      setLoading(true);
      setError('');
      const response = await apiClient.get(`/api/settings/canvas/data/courses/${courseId}/assignments`);
      if (response.data?.status === 'success' && response.data?.assignments) {
        setAssignments(response.data.assignments);
      } else if (response.data?.assignments) {
        setAssignments(response.data.assignments);
      } else {
        setError('No assignments found for this course');
        setAssignments([]);
      }
    } catch (err: any) {
      console.error('Error fetching assignments:', err);
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || 'Failed to fetch assignments';
      setError(errorMessage);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async (assignmentId: number) => {
    if (!selectedCourseId) return;
    
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.get(
        `/api/settings/canvas/data/courses/${selectedCourseId}/assignments/${assignmentId}/submissions`
      );
      if (response.data?.status === 'success' && response.data?.submissions) {
        setSubmissions(response.data.submissions);
      } else if (response.data?.submissions) {
        setSubmissions(response.data.submissions);
      } else {
        setError('No submissions found for this assignment');
        setSubmissions([]);
      }
    } catch (err: any) {
      console.error('Error fetching submissions:', err);
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || 'Failed to fetch submissions';
      setError(errorMessage);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  const syncSubmissions = async () => {
    if (!selectedCourseId || !selectedAssignmentId) return null;

    try {
      setLoading(true);
      setError('');
      const response = await apiClient.post('/api/canvas/sync-submissions', {
        course_id: selectedCourseId,
        assignment_id: selectedAssignmentId,
        force_sync: false,
      });

      if (response.data?.sync_job_id) {
        setSyncJobId(response.data.sync_job_id);
        return response.data.sync_job_id;
      } else {
        throw new Error('Failed to sync submissions');
      }
    } catch (err: any) {
      console.error('Error syncing submissions:', err);
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || 'Failed to sync submissions';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const performGrading = async () => {
    try {
      setIsGrading(true);
      setError('');

      // First, sync submissions if not already synced
      let jobId = syncJobId;
      if (!jobId) {
        jobId = await syncSubmissions();
      }

      if (!jobId) {
        setError('Failed to sync submissions. Please try again.');
        return;
      }

      // Convert selectedSubmissions (which are submission IDs) to user IDs
      const userIds = selectedSubmissions.map(subId => {
        const submission = submissions.find(s => 
          (s.submission_id || s.id || s.user_id)?.toString() === subId
        );
        return submission?.user_id;
      }).filter(Boolean) as number[];

      if (userIds.length === 0) {
        setError('No valid user IDs found for selected submissions');
        return;
      }

      // Perform grading
      const response = await apiClient.post('/api/canvas/grade-selected-submissions', {
        sync_job_id: jobId,
        selected_user_ids: userIds,
        rubric_id: rubricId || null,
        strictness: strictness,
      });

      if (response.data?.status === 'success') {
        const gradedCount = response.data.results?.length || selectedSubmissions.length;
        const savedToMongo = response.data.saved_to_mongodb || 0;
        setSavedCount(savedToMongo);
        setGradingResults(response.data.results || []);
        setActiveStep(activeStep + 1); // Move to results step
        setShowResultsDialog(true);
        
        // Call onComplete callback if provided
        if (onComplete) {
          onComplete({
            courseId: selectedCourseId!,
            assignmentId: selectedAssignmentId!,
            selectedSubmissions,
            strictness,
          });
        }

        // Trigger grading completed event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gradingCompleted', {
            detail: {
              courseId: selectedCourseId,
              assignmentId: selectedAssignmentId,
              results: response.data.results || []
            }
          }));
        }
      } else {
        setError(response.data?.message || 'Grading failed');
      }
    } catch (err: any) {
      console.error('Error performing grading:', err);
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || 'Failed to grade submissions';
      setError(errorMessage);
    } finally {
      setIsGrading(false);
    }
  };

  const handleNext = async () => {
    setError('');
    
    // Validation for each step
    if (activeStep === 0 && !selectedCourseId) {
      setError('Please select a course');
      return;
    }
    if (activeStep === 1 && !selectedAssignmentId) {
      setError('Please select an assignment');
      return;
    }
    if (activeStep === 2 && selectedSubmissions.length === 0) {
      setError('Please select at least one submission');
      return;
    }
    
    if (activeStep === steps.length - 2) {
      // Last step before results - trigger grading
      if (selectedCourseId && selectedAssignmentId) {
        await performGrading();
      }
    } else {
      setActiveStep(activeStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(activeStep - 1);
    setError('');
  };

  const handleReset = () => {
    setActiveStep(0);
    setSelectedCourseId(null);
    setSelectedAssignmentId(null);
    setSelectedSubmissions([]);
    setStrictness(0.5);
    setError('');
    setSyncJobId(null);
    setGradingResults([]);
    setSavedCount(0);
    setShowResultsDialog(false);
  };

  const toggleSubmission = (submissionId: string) => {
    setSelectedSubmissions(prev =>
      prev.includes(submissionId)
        ? prev.filter(id => id !== submissionId)
        : [...prev, submissionId]
    );
  };

  const isLoading = loading || isGrading || externalIsLoading;

  return (
    <Box>
      <Stepper activeStep={activeStep} orientation="vertical">
        {/* Step 1: Select Course */}
        <Step>
          <StepLabel StepIconComponent={() => <SchoolIcon />}>
            Select Course
          </StepLabel>
          <StepContent>
            {loading ? (
              <Box textAlign="center" py={4}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Course</InputLabel>
                  <Select
                    value={selectedCourseId || ''}
                    onChange={(e) => setSelectedCourseId(Number(e.target.value))}
                    label="Course"
                  >
                    <MenuItem value="">Select a course</MenuItem>
                    {courses.map((course) => (
                      <MenuItem key={course.id} value={course.id}>
                        {course.name} ({course.course_code || course.id})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                
                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                  <Button onClick={handleNext} variant="contained" disabled={!selectedCourseId}>
                    Next
                  </Button>
                </Box>
              </>
            )}
          </StepContent>
        </Step>

        {/* Step 2: Select Assignment */}
        <Step>
          <StepLabel StepIconComponent={() => <AssignmentIcon />}>
            Select Assignment
          </StepLabel>
          <StepContent>
            {loading ? (
              <Box textAlign="center" py={4}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                
                <FormControl fullWidth margin="normal">
                  <InputLabel>Assignment</InputLabel>
                  <Select
                    value={selectedAssignmentId || ''}
                    onChange={(e) => {
                      setSelectedAssignmentId(Number(e.target.value));
                      setError('');
                    }}
                    label="Assignment"
                    disabled={loading || assignments.length === 0}
                  >
                    <MenuItem value="">Select an assignment</MenuItem>
                    {assignments.length === 0 && !loading && (
                      <MenuItem disabled>No assignments found</MenuItem>
                    )}
                    {assignments.map((assignment) => (
                      <MenuItem key={assignment.id} value={assignment.id}>
                        {assignment.name} ({assignment.points_possible || 0} points)
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                {assignments.length === 0 && !loading && !error && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    No assignments found for this course. Make sure the course has published assignments.
                  </Alert>
                )}
                
                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                  <Button onClick={handleBack}>Back</Button>
                  <Button onClick={handleNext} variant="contained" disabled={!selectedAssignmentId}>
                    Next
                  </Button>
                </Box>
              </>
            )}
          </StepContent>
        </Step>

        {/* Step 3: Select Submissions */}
        <Step>
          <StepLabel StepIconComponent={() => <PeopleIcon />}>
            Select Submissions
          </StepLabel>
          <StepContent>
            {loading ? (
              <Box textAlign="center" py={4}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Select submissions to grade ({selectedSubmissions.length} selected)
                </Typography>
                <Box sx={{ maxHeight: 300, overflowY: 'auto', mt: 2 }}>
                  {submissions.map((submission) => {
                    const submissionKey = (submission.submission_id || submission.id || submission.user_id)?.toString();
                    if (!submissionKey) {
                      console.warn('Submission missing identifier:', submission);
                      return null;
                    }
                    
                    return (
                      <Card
                        key={submissionKey}
                        sx={{
                          mb: 1,
                          cursor: 'pointer',
                          border: selectedSubmissions.includes(submissionKey)
                            ? '2px solid'
                            : '1px solid',
                          borderColor: selectedSubmissions.includes(submissionKey)
                            ? 'primary.main'
                            : 'divider',
                        }}
                        onClick={() => toggleSubmission(submissionKey)}
                      >
                        <CardContent>
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="body1">
                              {submission.user_name || `Student ${submission.user_id || 'Unknown'}`}
                            </Typography>
                            {selectedSubmissions.includes(submissionKey) && (
                              <CheckCircleIcon color="primary" />
                            )}
                          </Box>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Box>
                
                {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                
                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                  <Button onClick={handleBack}>Back</Button>
                  <Button onClick={handleNext} variant="contained" disabled={selectedSubmissions.length === 0}>
                    Next
                  </Button>
                </Box>
              </>
            )}
          </StepContent>
        </Step>

        {/* Step 4: Configure Settings */}
        <Step>
          <StepLabel StepIconComponent={() => <SettingsIcon />}>
            Configure Settings
          </StepLabel>
          <StepContent>
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Grading Strictness
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Adjust how strict the AI grading should be (0.0 = lenient, 1.0 = strict)
                </Typography>
                <Box sx={{ px: 2, py: 2 }}>
                  <Slider
                    value={strictness}
                    onChange={(e, newValue) => setStrictness(newValue as number)}
                    min={0}
                    max={1}
                    step={0.1}
                    marks={[
                      { value: 0, label: 'Lenient' },
                      { value: 0.5, label: 'Moderate' },
                      { value: 1, label: 'Strict' },
                    ]}
                    valueLabelDisplay="auto"
                  />
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                    Current: {Math.round(strictness * 100)}% strict
                  </Typography>
                </Box>
              </CardContent>
            </Card>
            
            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button onClick={handleBack}>Back</Button>
              <Button onClick={handleNext} variant="contained">
                Next
              </Button>
            </Box>
          </StepContent>
        </Step>

        {/* Step 5: Grade Submissions */}
        <Step>
          <StepLabel StepIconComponent={() => <PlayArrowIcon />}>
            Grade Submissions
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              {isLoading ? (
                <>
                  <CircularProgress size={60} sx={{ mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Grading in Progress...
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Grading {selectedSubmissions.length} submission(s)
                  </Typography>
                </>
              ) : (
                <>
                  <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Ready to Grade
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {selectedSubmissions.length} submission(s) selected
                  </Typography>
                  {error && <Alert severity="error" sx={{ mt: 2, mb: 2 }}>{error}</Alert>}
                  <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
                    <Button onClick={handleBack}>Back</Button>
                    <Button onClick={handleNext} variant="contained" size="large">
                      Start Grading
                    </Button>
                  </Box>
                </>
              )}
            </Paper>
          </StepContent>
        </Step>

        {/* Step 6: View Results */}
        <Step>
          <StepLabel StepIconComponent={() => <AssessmentIcon />}>
            View Results
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Grading Complete!
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {savedCount > 0 
                  ? `Successfully graded ${gradingResults.length} submission(s). ${savedCount} result(s) saved to Results page.`
                  : `Successfully graded ${gradingResults.length} submission(s). Results are being processed.`}
              </Typography>
              {error && (
                <Alert severity="error" sx={{ mt: 2, mb: 2 }}>{error}</Alert>
              )}
              <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button 
                  onClick={() => setShowResultsDialog(true)} 
                  variant="contained"
                >
                  View Results
                </Button>
                {savedCount > 0 && (
                  <Button 
                    component={Link}
                    href="/results"
                    variant="outlined"
                    startIcon={<VisibilityIcon />}
                  >
                    Go to Results Page
                  </Button>
                )}
                <Button onClick={handleReset} variant="outlined">
                  Grade Another
                </Button>
              </Box>
            </Paper>
          </StepContent>
        </Step>
      </Stepper>

      {/* Results Dialog */}
      <Dialog
        open={showResultsDialog}
        onClose={() => setShowResultsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Grading Results
          {savedCount > 0 && (
            <Chip 
              label={`${savedCount} saved`} 
              color="success" 
              size="small" 
              sx={{ ml: 2 }} 
            />
          )}
        </DialogTitle>
        <DialogContent>
          <Alert severity="success" sx={{ mb: 2 }}>
            Successfully graded {gradingResults.length} submission(s).
            {savedCount > 0 && ` ${savedCount} result(s) have been saved to the Results page.`}
          </Alert>
          
          {gradingResults.length > 0 && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Student</TableCell>
                    <TableCell align="right">Score</TableCell>
                    <TableCell align="right">Percentage</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {gradingResults
                    .sort((a, b) => {
                      const scoreA = a.score || a.grade || 0;
                      const scoreB = b.score || b.grade || 0;
                      return scoreB - scoreA;
                    })
                    .map((result, index) => {
                      const score = result.score || result.grade || 0;
                      const percentage = result.percentage || (score > 0 ? Math.round((score / 100) * 100) : 0);
                      const status = result.error ? 'error' : 'success';
                      
                      return (
                        <TableRow key={index}>
                          <TableCell>
                            {result.user_name || `Student ${result.user_id || 'Unknown'}`}
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={score.toFixed(1)}
                              color={
                                percentage >= 90 ? 'success' :
                                percentage >= 70 ? 'info' :
                                percentage >= 50 ? 'warning' : 'error'
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">{percentage}%</TableCell>
                          <TableCell>
                            {result.error ? (
                              <Chip label="Error" color="error" size="small" />
                            ) : (
                              <Chip label="Graded" color="success" size="small" />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          {savedCount > 0 && (
            <Button
              component={Link}
              href="/results"
              startIcon={<VisibilityIcon />}
            >
              View All Results
            </Button>
          )}
          <Button onClick={() => setShowResultsDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
