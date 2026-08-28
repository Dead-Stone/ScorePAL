/**
 * Canvas Grading Utilities - Optimized with error handling
 */

import apiClient from '@/utils/apiClient';
import { Course, Assignment, Submission, CourseWithAccess, AssignmentWithAccess } from './types';

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

const getCached = <T>(key: string): T | null => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }
  return null;
};

const setCache = (key: string, data: any) => {
  cache.set(key, { data, timestamp: Date.now() });
};

export interface ApiError {
  type: 'access_denied' | 'not_found' | 'network' | 'timeout' | 'unknown';
  message: string;
  details?: string;
}

export interface FetchResult<T> {
  data: T;
  success: boolean;
  error?: ApiError;
  partialAccess?: boolean;
}

const parseError = (error: any): ApiError => {
  if (error?.response?.status === 403) {
    return {
      type: 'access_denied',
      message: error.response.data?.detail || 'Access denied to this resource.',
      details: 'Your Canvas API key may not have permission to access this resource.'
    };
  }
  
  if (error?.response?.status === 404) {
    return {
      type: 'not_found',
      message: 'Resource not found.',
      details: 'The course or assignment may have been deleted.'
    };
  }
  
  if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
    return {
      type: 'timeout',
      message: 'Request timed out.',
      details: 'Canvas may be slow. Try again in a moment.'
    };
  }
  
  if (!error?.response) {
    return {
      type: 'network',
      message: 'Network error.',
      details: 'Check your internet connection.'
    };
  }
  
  return {
    type: 'unknown',
    message: error?.message || 'An unexpected error occurred.',
    details: 'Please try again.'
  };
};

export const fetchCourses = async (): Promise<FetchResult<CourseWithAccess[]>> => {
  const cacheKey = 'canvas_courses';
  
  try {
    const cached = getCached<CourseWithAccess[]>(cacheKey);
    if (cached) {
      return { data: cached, success: true };
    }
    
    const response = await apiClient.get('/api/settings/canvas/data/courses', { timeout: 15000 });
    const courses: Course[] = response.data?.courses || [];
    
    // Mark all courses as accessible (we'll update when details are fetched)
    const coursesWithAccess: CourseWithAccess[] = courses.map(course => ({
      ...course,
      accessible: true,
      accessChecked: false
    }));
    
    setCache(cacheKey, coursesWithAccess);
    return { data: coursesWithAccess, success: true };
  } catch (error) {
    return {
      data: [],
      success: false,
      error: parseError(error)
    };
  }
};

export const fetchAssignments = async (courseId: number): Promise<FetchResult<AssignmentWithAccess[]>> => {
  const cacheKey = `assignments_${courseId}`;
  
  try {
    const cached = getCached<AssignmentWithAccess[]>(cacheKey);
    if (cached) {
      return { data: cached, success: true };
    }
    
    const response = await apiClient.get(
      `/api/settings/canvas/data/courses/${courseId}/assignments`,
      { timeout: 20000 }
    );
    
    const assignments: Assignment[] = response.data?.assignments || [];
    
    // Mark all as accessible initially
    const assignmentsWithAccess: AssignmentWithAccess[] = assignments.map(assignment => ({
      ...assignment,
      accessible: true,
      accessChecked: false
    }));
    
    setCache(cacheKey, assignmentsWithAccess);
    return { data: assignmentsWithAccess, success: true };
  } catch (error) {
    return {
      data: [],
      success: false,
      error: parseError(error)
    };
  }
};

export const fetchSubmissions = async (
  courseId: number,
  assignmentId: number
): Promise<FetchResult<Submission[]>> => {
  const cacheKey = `submissions_${courseId}_${assignmentId}`;
  
  try {
    const cached = getCached<Submission[]>(cacheKey);
    if (cached) {
      return { data: cached, success: true };
    }
    
    const response = await apiClient.get(
      `/api/settings/canvas/data/courses/${courseId}/assignments/${assignmentId}/submissions`,
      { timeout: 20000 }
    );
    
    const submissions = response.data?.submissions || [];
    setCache(cacheKey, submissions);
    return { data: submissions, success: true };
  } catch (error) {
    const apiError = parseError(error);
    return {
      data: [],
      success: false,
      error: apiError,
      partialAccess: apiError.type === 'access_denied'
    };
  }
};

export const syncSubmissions = async (
  courseId: number,
  assignmentId: number
): Promise<FetchResult<string>> => {
  try {
    const response = await apiClient.post('/api/canvas/sync-submissions', {
      course_id: courseId,
      assignment_id: assignmentId,
      force_sync: false,
    }, { timeout: 60000 });
    
    return {
      data: response.data?.sync_job_id || '',
      success: true
    };
  } catch (error) {
    return {
      data: '',
      success: false,
      error: parseError(error)
    };
  }
};

export const gradeSubmissions = async (
  syncJobId: string,
  userIds: number[],
  rubricId: string,
  strictness: number
): Promise<FetchResult<{ results: any[]; saved_to_mongodb: number }>> => {
  try {
    const response = await apiClient.post('/api/canvas/grade-selected-submissions', {
      sync_job_id: syncJobId,
      selected_user_ids: userIds,
      rubric_id: rubricId || null,
      strictness: strictness,
    }, { timeout: 120000 }); // Long timeout for grading
    
    return {
      data: {
        results: response.data?.results || [],
        saved_to_mongodb: response.data?.saved_to_mongodb || 0,
      },
      success: true
    };
  } catch (error) {
    return {
      data: { results: [], saved_to_mongodb: 0 },
      success: false,
      error: parseError(error)
    };
  }
};

export const fetchRubrics = async (): Promise<FetchResult<any[]>> => {
  const cacheKey = 'rubrics';
  
  try {
    const cached = getCached<any[]>(cacheKey);
    if (cached) {
      return { data: cached, success: true };
    }
    
    const response = await apiClient.get('/api/rubrics', { timeout: 10000 });
    const rubrics = response.data?.rubrics || [];
    setCache(cacheKey, rubrics);
    return { data: rubrics, success: true };
  } catch (error) {
    return {
      data: [],
      success: false,
      error: parseError(error)
    };
  }
};

// Test course access - useful for diagnostics
export const testCourseAccess = async (courseId: number): Promise<{
  course: boolean;
  assignments: boolean;
  students: boolean;
  submissions: boolean;
  errors: string[];
  recommendations: string[];
}> => {
  try {
    const response = await apiClient.get(
      `/api/settings/canvas/data/courses/${courseId}/test-access`,
      { timeout: 30000 }
    );
    return response.data?.test_results || {
      course: false,
      assignments: false,
      students: false,
      submissions: false,
      errors: ['Unable to test access'],
      recommendations: []
    };
  } catch (error: any) {
    return {
      course: false,
      assignments: false,
      students: false,
      submissions: false,
      errors: [error.response?.data?.detail || error.message || 'Test failed'],
      recommendations: ['Check your Canvas API key permissions']
    };
  }
};

// Clear cache
export const clearCanvasCache = () => {
  cache.clear();
};

// Clear specific cache
export const clearCacheFor = (key: string) => {
  for (const [k] of cache) {
    if (k.includes(key)) {
      cache.delete(k);
    }
  }
};
