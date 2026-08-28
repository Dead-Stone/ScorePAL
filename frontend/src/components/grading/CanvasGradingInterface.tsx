/**
 * CanvasGradingInterface - Full Canvas grading interface embedded in Grade tab
 * Enhanced with smooth error handling and access status indicators
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Alert, AlertTitle, LinearProgress, Chip, Typography, Button, Collapse, IconButton } from '@mui/material';
import { useRouter } from 'next/router';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import LockIcon from '@mui/icons-material/Lock';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { CourseAssignmentSelector } from './canvas/CourseAssignmentSelector';
import { SubmissionsTable } from './canvas/SubmissionsTable';
import { GradingConfiguration } from './canvas/GradingConfiguration';
import { GradingResultsTable } from './canvas/GradingResultsTable';
import {
  fetchCourses,
  fetchAssignments,
  fetchSubmissions,
  syncSubmissions,
  gradeSubmissions,
  fetchRubrics,
  testCourseAccess,
  clearCanvasCache,
  ApiError,
} from './canvas/utils';
import { CourseWithAccess, AssignmentWithAccess, Submission } from './canvas/types';

interface CanvasGradingInterfaceProps {
  onGradingComplete?: () => void;
}

export const CanvasGradingInterface: React.FC<CanvasGradingInterfaceProps> = ({ onGradingComplete }) => {
  const router = useRouter();
  const [courses, setCourses] = useState<CourseWithAccess[]>([]);
  const [assignments, setAssignments] = useState<AssignmentWithAccess[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
  const [selectedSubmissions, setSelectedSubmissions] = useState<number[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [grading, setGrading] = useState(false);
  
  // Error states
  const [courseError, setCourseError] = useState<ApiError | null>(null);
  const [assignmentError, setAssignmentError] = useState<ApiError | null>(null);
  const [submissionError, setSubmissionError] = useState<ApiError | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Access test state
  const [accessTestExpanded, setAccessTestExpanded] = useState(false);
  const [accessTestResult, setAccessTestResult] = useState<{
    course: boolean;
    assignments: boolean;
    students: boolean;
    submissions: boolean;
    errors: string[];
    recommendations: string[];
  } | null>(null);
  
  // Grading state
  const [strictness, setStrictness] = useState(0.5);
  const [rubricId, setRubricId] = useState<string>('');
  const [syncJobId, setSyncJobId] = useState<string | null>(null);
  const [rubrics, setRubrics] = useState<any[]>([]);
  const [gradingResults, setGradingResults] = useState<any[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [showResults, setShowResults] = useState(false);

  // Load initial data
  useEffect(() => {
    loadCourses();
    loadRubrics();
  }, []);

  // Load assignments when course changes
  useEffect(() => {
    if (selectedCourseId) {
      loadAssignments(selectedCourseId);
      setAccessTestResult(null);
    } else {
      setAssignments([]);
      setSelectedAssignmentId(null);
      setAssignmentError(null);
    }
  }, [selectedCourseId]);

  // Load submissions when assignment changes
  useEffect(() => {
    if (selectedCourseId && selectedAssignmentId) {
      loadSubmissions(selectedCourseId, selectedAssignmentId);
    } else {
      setSubmissions([]);
      setSelectedSubmissions([]);
      setSubmissionError(null);
    }
  }, [selectedCourseId, selectedAssignmentId]);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setCourseError(null);
    
    const result = await fetchCourses();
    
    if (result.success) {
      setCourses(result.data);
    } else {
      setCourseError(result.error || null);
      setCourses([]);
    }
    
    setLoading(false);
  }, []);

  const loadAssignments = useCallback(async (courseId: number) => {
    setLoadingAssignments(true);
    setAssignmentError(null);
    
    const result = await fetchAssignments(courseId);
    
    if (result.success) {
      setAssignments(result.data);
    } else {
      setAssignmentError(result.error || null);
      setAssignments([]);
    }
    
    setLoadingAssignments(false);
  }, []);

  const loadSubmissions = useCallback(async (courseId: number, assignmentId: number) => {
    setLoadingSubmissions(true);
    setSubmissionError(null);
    
    const result = await fetchSubmissions(courseId, assignmentId);
    
    if (result.success) {
      setSubmissions(result.data);
    } else {
      setSubmissionError(result.error || null);
      setSubmissions([]);
    }
    
    setLoadingSubmissions(false);
  }, []);

  const loadRubrics = useCallback(async () => {
    const result = await fetchRubrics();
    if (result.success) {
      setRubrics(result.data);
    }
  }, []);

  const handleTestAccess = useCallback(async () => {
    if (!selectedCourseId) return;
    
    setAccessTestExpanded(true);
    const result = await testCourseAccess(selectedCourseId);
    setAccessTestResult(result);
  }, [selectedCourseId]);

  const handleRefresh = useCallback(() => {
    clearCanvasCache();
    loadCourses();
    if (selectedCourseId) {
      loadAssignments(selectedCourseId);
      if (selectedAssignmentId) {
        loadSubmissions(selectedCourseId, selectedAssignmentId);
      }
    }
  }, [selectedCourseId, selectedAssignmentId, loadCourses, loadAssignments, loadSubmissions]);

  const handleSyncSubmissions = async () => {
    if (!selectedCourseId || !selectedAssignmentId) {
      setGeneralError('Please select a course and assignment first');
      return;
    }

    setSyncing(true);
    setGeneralError(null);
    
    const result = await syncSubmissions(selectedCourseId, selectedAssignmentId);
    
    if (result.success) {
      setSyncJobId(result.data);
      setSuccess('Submissions synced successfully. You can now select submissions to grade.');
      // Refresh submissions
      await loadSubmissions(selectedCourseId, selectedAssignmentId);
    } else {
      setGeneralError(result.error?.message || 'Failed to sync submissions');
    }
    
    setSyncing(false);
  };

  const handleGradeSelected = async () => {
    if (!syncJobId || selectedSubmissions.length === 0) {
      setGeneralError('Please sync submissions and select at least one submission to grade');
      return;
    }

    setGrading(true);
    setGeneralError(null);
    
    const result = await gradeSubmissions(
      syncJobId,
      selectedSubmissions,
      rubricId,
      strictness
    );

    if (result.success) {
      const gradedCount = result.data.results.length || selectedSubmissions.length;
      setSavedCount(result.data.saved_to_mongodb);
      setGradingResults(result.data.results);
      setSuccess(
        `Successfully graded ${gradedCount} submission(s). ${result.data.saved_to_mongodb > 0 ? `${result.data.saved_to_mongodb} result(s) saved.` : 'Results are being processed.'}`
      );
      setSelectedSubmissions([]);
      setShowResults(true);
      
      if (selectedCourseId && selectedAssignmentId) {
        setTimeout(() => {
          loadSubmissions(selectedCourseId, selectedAssignmentId);
        }, 1500);
      }
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gradingCompleted', {
          detail: {
            courseId: selectedCourseId,
            assignmentId: selectedAssignmentId,
            results: result.data.results
          }
        }));
      }
      
      if (onGradingComplete) {
        onGradingComplete();
      }
    } else {
      setGeneralError(result.error?.message || 'Failed to grade submissions');
    }
    
    setGrading(false);
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
      {/* General Loading Progress */}
      {(loading || loadingAssignments || loadingSubmissions) && (
        <LinearProgress 
          sx={{ 
            mb: 2, 
            borderRadius: 1,
            '& .MuiLinearProgress-bar': {
              transition: 'transform 0.2s ease'
            }
          }} 
        />
      )}

      {/* General Error Alert */}
      {generalError && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }} 
          onClose={() => setGeneralError(null)}
        >
          {generalError}
        </Alert>
      )}

      {/* Success Alert */}
      {success && (
        <Alert 
          severity="success" 
          sx={{ mb: 2 }} 
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}

      {/* Access Issues Warning */}
      {(courseError || assignmentError || submissionError) && (
        <Alert 
          severity="warning" 
          sx={{ mb: 2 }}
          icon={<LockIcon />}
          action={
            selectedCourseId && (
              <Button 
                size="small" 
                onClick={handleTestAccess}
                sx={{ whiteSpace: 'nowrap' }}
              >
                Test Access
              </Button>
            )
          }
        >
          <AlertTitle>Access Restrictions Detected</AlertTitle>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Some data may not be accessible. This is usually due to Canvas API permissions.
          </Typography>
          {selectedCourseId && (
            <Box>
              <Button
                size="small"
                onClick={() => setAccessTestExpanded(!accessTestExpanded)}
                endIcon={accessTestExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              >
                {accessTestExpanded ? 'Hide Details' : 'Show Details'}
              </Button>
            </Box>
          )}
        </Alert>
      )}

      {/* Access Test Results */}
      <Collapse in={accessTestExpanded && accessTestResult !== null}>
        <Alert 
          severity="info" 
          sx={{ mb: 2 }}
          icon={false}
        >
          <Typography variant="subtitle2" gutterBottom>Access Test Results</Typography>
          <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
            <Chip
              icon={accessTestResult?.course ? <CheckCircleIcon /> : <LockIcon />}
              label="Course"
              color={accessTestResult?.course ? 'success' : 'error'}
              size="small"
            />
            <Chip
              icon={accessTestResult?.assignments ? <CheckCircleIcon /> : <LockIcon />}
              label="Assignments"
              color={accessTestResult?.assignments ? 'success' : 'error'}
              size="small"
            />
            <Chip
              icon={accessTestResult?.students ? <CheckCircleIcon /> : <LockIcon />}
              label="Students"
              color={accessTestResult?.students ? 'success' : 'error'}
              size="small"
            />
            <Chip
              icon={accessTestResult?.submissions ? <CheckCircleIcon /> : <LockIcon />}
              label="Submissions"
              color={accessTestResult?.submissions ? 'success' : 'error'}
              size="small"
            />
          </Box>
          {accessTestResult?.errors && accessTestResult.errors.length > 0 && (
            <Box mb={1}>
              <Typography variant="caption" color="error">
                Errors: {accessTestResult.errors.join(', ')}
              </Typography>
            </Box>
          )}
          {accessTestResult?.recommendations && accessTestResult.recommendations.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Recommendations: {accessTestResult.recommendations.join(', ')}
              </Typography>
            </Box>
          )}
        </Alert>
      </Collapse>

      {/* Refresh Button */}
      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Button
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          size="small"
          disabled={loading || loadingAssignments || loadingSubmissions}
        >
          Refresh
        </Button>
      </Box>

      {/* Course and Assignment Selector */}
      <CourseAssignmentSelector
        courses={courses}
        assignments={assignments}
        selectedCourseId={selectedCourseId}
        selectedAssignmentId={selectedAssignmentId}
        loading={loading}
        loadingAssignments={loadingAssignments}
        onCourseChange={setSelectedCourseId}
        onAssignmentChange={setSelectedAssignmentId}
        courseError={courseError}
        assignmentError={assignmentError}
      />

      {/* Submissions Table */}
      {selectedCourseId && selectedAssignmentId && (
        <>
          {/* Submission Error */}
          {submissionError && (
            <Alert 
              severity="warning" 
              sx={{ mb: 2, mt: 2 }}
              icon={<LockIcon />}
            >
              <AlertTitle>Cannot Access Submissions</AlertTitle>
              <Typography variant="body2">
                {submissionError.message}
              </Typography>
              {submissionError.details && (
                <Typography variant="caption" color="text.secondary">
                  {submissionError.details}
                </Typography>
              )}
            </Alert>
          )}

          <SubmissionsTable
            submissions={submissions}
            selectedSubmissions={selectedSubmissions}
            loadingSubmissions={loadingSubmissions}
            syncing={syncing}
            syncJobId={syncJobId}
            onToggleSubmission={toggleSubmission}
            onToggleAll={toggleAllSubmissions}
            onSync={handleSyncSubmissions}
          />

          <GradingConfiguration
            rubrics={rubrics}
            rubricId={rubricId}
            strictness={strictness}
            selectedSubmissions={selectedSubmissions}
            grading={grading}
            onRubricChange={setRubricId}
            onStrictnessChange={setStrictness}
            onGrade={handleGradeSelected}
          />
        </>
      )}

      {/* Grading Results */}
      {showResults && gradingResults.length > 0 && (
        <GradingResultsTable
          results={gradingResults}
          savedCount={savedCount}
          onHide={() => setShowResults(false)}
        />
      )}
    </Box>
  );
};
