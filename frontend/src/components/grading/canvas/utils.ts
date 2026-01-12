/**
 * Canvas Grading Utilities
 */

import apiClient from '@/utils/apiClient';
import { extractErrorMessage } from '@/utils/errorUtils';
import { Course, Assignment, Submission } from './types';

export const fetchCourses = async (): Promise<Course[]> => {
  const response = await apiClient.get('/api/settings/canvas/data/courses');
  return response.data?.courses || [];
};

export const fetchAssignments = async (courseId: number): Promise<Assignment[]> => {
  const response = await apiClient.get(`/api/settings/canvas/data/courses/${courseId}/assignments`);
  return response.data?.assignments || [];
};

export const fetchSubmissions = async (
  courseId: number,
  assignmentId: number
): Promise<Submission[]> => {
  const response = await apiClient.get(
    `/api/settings/canvas/data/courses/${courseId}/assignments/${assignmentId}/submissions`
  );
  return response.data?.submissions || [];
};

export const syncSubmissions = async (
  courseId: number,
  assignmentId: number
): Promise<string> => {
  const response = await apiClient.post('/api/canvas/sync-submissions', {
    course_id: courseId,
    assignment_id: assignmentId,
    force_sync: false,
  });
  return response.data?.sync_job_id || '';
};

export const gradeSubmissions = async (
  syncJobId: string,
  userIds: number[],
  rubricId: string,
  strictness: number
): Promise<{ results: any[]; saved_to_mongodb: number }> => {
  const response = await apiClient.post('/api/canvas/grade-selected-submissions', {
    sync_job_id: syncJobId,
    selected_user_ids: userIds,
    rubric_id: rubricId || null,
    strictness: strictness,
  });
  return {
    results: response.data?.results || [],
    saved_to_mongodb: response.data?.saved_to_mongodb || 0,
  };
};

export const fetchRubrics = async (): Promise<any[]> => {
  const response = await apiClient.get('/api/rubrics');
  return response.data?.rubrics || [];
};
