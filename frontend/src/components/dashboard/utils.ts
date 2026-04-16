/**
 * Dashboard Utilities - Optimized with error handling and caching
 */

import axios, { AxiosError } from 'axios';
import { Course, CourseDetails, DashboardStats } from './types';

// Simple in-memory cache for API responses
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds cache

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

// Error types for better handling
export interface ApiError {
  type: 'access_denied' | 'not_found' | 'network' | 'timeout' | 'unknown';
  message: string;
  details?: string;
}

export interface CourseWithAccess extends Course {
  accessible: boolean;
  accessError?: string;
  partialAccess?: boolean;
}

export interface CourseDetailsResult {
  data: CourseDetails | null;
  accessible: boolean;
  partialAccess: boolean;
  error?: ApiError;
}

const parseError = (error: any): ApiError => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<any>;
    
    if (axiosError.code === 'ECONNABORTED' || axiosError.message.includes('timeout')) {
      return {
        type: 'timeout',
        message: 'Request timed out. Canvas may be slow to respond.',
        details: 'Try refreshing or selecting a smaller dataset.'
      };
    }
    
    if (axiosError.response?.status === 403) {
      return {
        type: 'access_denied',
        message: axiosError.response.data?.detail || 'Access denied to this resource.',
        details: 'Your Canvas API key may not have sufficient permissions.'
      };
    }
    
    if (axiosError.response?.status === 404) {
      return {
        type: 'not_found',
        message: 'Resource not found.',
        details: 'The course or assignment may have been deleted or is not accessible.'
      };
    }
    
    if (!axiosError.response) {
      return {
        type: 'network',
        message: 'Network error. Unable to connect to server.',
        details: 'Check your internet connection and try again.'
      };
    }
  }
  
  return {
    type: 'unknown',
    message: error?.message || 'An unexpected error occurred.',
    details: 'Please try again or contact support.'
  };
};

export const checkCanvasConfig = async (): Promise<boolean> => {
  try {
    const cached = getCached<boolean>('canvas_config');
    if (cached !== null) return cached;
    
    const response = await axios.get('/api/settings/canvas', { timeout: 10000 });
    const isValid = response.data.canvas_key_valid || response.data.canvas_key_configured || false;
    setCache('canvas_config', isValid);
    return isValid;
  } catch (error) {
    console.error('Error checking Canvas config:', error);
    return false;
  }
};

export const fetchCourses = async (): Promise<Course[]> => {
  try {
    const cached = getCached<Course[]>('courses');
    if (cached) return cached;
    
    const response = await axios.get('/api/settings/canvas/data/courses', { timeout: 15000 });
    if (response.data.status === 'success') {
      const courses = response.data.courses || [];
      setCache('courses', courses);
      return courses;
    }
    return [];
  } catch (error) {
    console.error('Error fetching courses:', error);
    return [];
  }
};

export const fetchCoursesWithAccessInfo = async (): Promise<CourseWithAccess[]> => {
  try {
    const cached = getCached<CourseWithAccess[]>('courses_with_access');
    if (cached) return cached;
    
    const response = await axios.get('/api/settings/canvas/data/courses', { timeout: 15000 });
    if (response.data.status === 'success') {
      const courses: Course[] = response.data.courses || [];
      
      // Mark all courses as accessible initially (we'll check details later)
      const coursesWithAccess: CourseWithAccess[] = courses.map(course => ({
        ...course,
        accessible: true,
        partialAccess: false
      }));
      
      setCache('courses_with_access', coursesWithAccess);
      return coursesWithAccess;
    }
    return [];
  } catch (error) {
    console.error('Error fetching courses:', error);
    return [];
  }
};

export const fetchCourseDetails = async (courseId: number): Promise<CourseDetailsResult> => {
  const cacheKey = `course_details_${courseId}`;
  
  try {
    const cached = getCached<CourseDetailsResult>(cacheKey);
    if (cached) return cached;
    
    const response = await axios.get(
      `/api/settings/canvas/data/courses/${courseId}/details?include_submissions=true`,
      { timeout: 30000 }
    );
    
    const result: CourseDetailsResult = {
      data: response.data,
      accessible: true,
      partialAccess: response.data.status === 'partial'
    };
    
    if (response.data.status === 'partial') {
      result.error = {
        type: 'access_denied',
        message: response.data.message || 'Partial access to course data.',
        details: 'Some assignments or submissions may not be visible.'
      };
    }
    
    setCache(cacheKey, result);
    return result;
  } catch (error) {
    const apiError = parseError(error);
    return {
      data: null,
      accessible: apiError.type !== 'access_denied',
      partialAccess: false,
      error: apiError
    };
  }
};

export const fetchStudents = async (courseId: number): Promise<any[]> => {
  const cacheKey = `students_${courseId}`;
  
  try {
    const cached = getCached<any[]>(cacheKey);
    if (cached) return cached;
    
    const response = await axios.get(
      `/api/settings/canvas/data/courses/${courseId}/students?include_performance=true`,
      { timeout: 20000 }
    );
    
    const students = response.data?.students || [];
    setCache(cacheKey, students);
    return students;
  } catch (error) {
    console.error('Error fetching students:', error);
    return [];
  }
};

// Fetch course details for multiple courses in parallel with rate limiting
export const fetchMultipleCourseDetails = async (
  courseIds: number[],
  onProgress?: (completed: number, total: number) => void
): Promise<Map<number, CourseDetailsResult>> => {
  const results = new Map<number, CourseDetailsResult>();
  const batchSize = 3; // Limit concurrent requests
  
  for (let i = 0; i < courseIds.length; i += batchSize) {
    const batch = courseIds.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (id) => {
        const result = await fetchCourseDetails(id);
        return { id, result };
      })
    );
    
    batchResults.forEach(({ id, result }) => {
      results.set(id, result);
    });
    
    if (onProgress) {
      onProgress(Math.min(i + batchSize, courseIds.length), courseIds.length);
    }
  }
  
  return results;
};

export const calculateStats = (recentGradings: any[]): DashboardStats | null => {
  if (!recentGradings.length) return null;
  const totalGradings = recentGradings.length;
  const avgScore = recentGradings.reduce((sum, g) => sum + (g.percentage || 0), 0) / totalGradings;
  const uniqueAssignments = new Set(recentGradings.map(g => g.assignment_id || g.assignment_name)).size;
  const uniqueStudents = new Set(recentGradings.map(g => g.student_name || g.student_id)).size;
  const highPerformers = recentGradings.filter(g => (g.percentage || 0) >= 90).length;
  return { totalGradings, avgScore, uniqueAssignments, uniqueStudents, highPerformers };
};

// Clear cache - useful after updates or when forcing refresh
export const clearCache = () => {
  cache.clear();
};

// Clear specific cache entry
export const clearCacheEntry = (key: string) => {
  cache.delete(key);
};
