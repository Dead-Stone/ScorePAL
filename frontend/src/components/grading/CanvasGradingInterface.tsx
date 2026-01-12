/**
 * CanvasGradingInterface - Full Canvas grading interface embedded in Grade tab
 * Refactored to use modular components
 */

import React, { useState, useEffect } from 'react';
import { Box, Alert } from '@mui/material';
import { useRouter } from 'next/router';
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
} from './canvas/utils';
import { extractErrorMessage } from '@/utils/errorUtils';
import { Course, Assignment, Submission } from './canvas/types';

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
  const [savedCount, setSavedCount] = useState(0);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    loadCourses();
    loadRubrics();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      loadAssignments(selectedCourseId);
    } else {
      setAssignments([]);
      setSelectedAssignmentId(null);
    }
  }, [selectedCourseId]);

  useEffect(() => {
    if (selectedCourseId && selectedAssignmentId) {
      loadSubmissions(selectedCourseId, selectedAssignmentId);
    } else {
      setSubmissions([]);
      setSelectedSubmissions([]);
    }
  }, [selectedCourseId, selectedAssignmentId]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const coursesData = await fetchCourses();
      setCourses(coursesData);
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to fetch courses'));
    } finally {
      setLoading(false);
    }
  };

  const loadAssignments = async (courseId: number) => {
    try {
      setLoadingAssignments(true);
      const assignmentsData = await fetchAssignments(courseId);
      setAssignments(assignmentsData);
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to fetch assignments'));
    } finally {
      setLoadingAssignments(false);
    }
  };

  const loadSubmissions = async (courseId: number, assignmentId: number) => {
    try {
      setLoadingSubmissions(true);
      const submissionsData = await fetchSubmissions(courseId, assignmentId);
      setSubmissions(submissionsData);
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to fetch submissions'));
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const loadRubrics = async () => {
    try {
      const rubricsData = await fetchRubrics();
      setRubrics(rubricsData);
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
      const jobId = await syncSubmissions(selectedCourseId, selectedAssignmentId);
      setSyncJobId(jobId);
      setSuccess('Submissions synced successfully. You can now select submissions to grade.');
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to sync submissions'));
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
      const result = await gradeSubmissions(
        syncJobId,
        selectedSubmissions,
        rubricId,
        strictness
      );

      const gradedCount = result.results.length || selectedSubmissions.length;
      setSavedCount(result.saved_to_mongodb);
      setGradingResults(result.results);
      setSuccess(
        `Successfully graded ${gradedCount} submission(s). ${result.saved_to_mongodb > 0 ? `${result.saved_to_mongodb} result(s) saved.` : 'Results are being processed.'}`
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
            results: result.results
          }
        }));
      }
      
      if (onGradingComplete) {
        onGradingComplete();
      }
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to grade submissions'));
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
        >
          {success}
        </Alert>
      )}

      <CourseAssignmentSelector
        courses={courses}
        assignments={assignments}
        selectedCourseId={selectedCourseId}
        selectedAssignmentId={selectedAssignmentId}
        loading={loading}
        loadingAssignments={loadingAssignments}
        onCourseChange={setSelectedCourseId}
        onAssignmentChange={setSelectedAssignmentId}
      />

      {selectedCourseId && selectedAssignmentId && (
        <>
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
