/**
 * Canvas Data Hooks - Optimized with SWR for instant data loading
 * Uses stale-while-revalidate pattern for fast UX
 */

import useSWR from 'swr';
import apiClient from '@/utils/apiClient';

// Fetcher function for SWR
const fetcher = async (url: string) => {
  const response = await apiClient.get(url, { timeout: 15000 });
  return response.data;
};

// Fast fetcher with shorter timeout for quick checks
const fastFetcher = async (url: string) => {
  const response = await apiClient.get(url, { timeout: 8000 });
  return response.data;
};

// SWR configuration for optimal performance
const swrConfig = {
  revalidateOnFocus: false, // Don't refetch on window focus (reduces API calls)
  revalidateOnReconnect: true,
  dedupingInterval: 30000, // Dedupe requests within 30 seconds
  errorRetryCount: 2,
  errorRetryInterval: 3000,
  shouldRetryOnError: true,
};

// Fast config for critical data
const fastConfig = {
  ...swrConfig,
  dedupingInterval: 60000, // Cache longer for config data
  revalidateIfStale: false, // Don't revalidate stale data automatically
};

export interface Course {
  id: number;
  name: string;
  course_code: string;
  total_students?: number;
}

export interface Assignment {
  id: number;
  name: string;
  points_possible: number;
  due_at: string | null;
  published: boolean;
}

export interface CanvasConfig {
  canvas_key_valid: boolean;
  canvas_key_configured: boolean;
  canvas_url?: string;
}

// Hook to check Canvas configuration (cached for 60s)
export function useCanvasConfig() {
  const { data, error, isLoading, mutate } = useSWR<CanvasConfig>(
    '/api/settings/canvas',
    fastFetcher,
    fastConfig
  );

  return {
    isConfigured: data?.canvas_key_valid || data?.canvas_key_configured || false,
    config: data,
    isLoading,
    error,
    refresh: mutate,
  };
}

// Hook to fetch courses (cached for 30s)
export function useCourses() {
  const { isConfigured } = useCanvasConfig();
  
  const { data, error, isLoading, mutate } = useSWR(
    isConfigured ? '/api/settings/canvas/data/courses' : null,
    fetcher,
    swrConfig
  );

  return {
    courses: (data?.courses || []) as Course[],
    isLoading,
    error,
    refresh: mutate,
  };
}

// Hook to fetch course details
export function useCourseDetails(courseId: number | null) {
  const { data, error, isLoading, mutate } = useSWR(
    courseId ? `/api/settings/canvas/data/courses/${courseId}/details?include_submissions=true` : null,
    fetcher,
    {
      ...swrConfig,
      dedupingInterval: 20000, // Shorter cache for details
    }
  );

  const hasPartialAccess = data?.status === 'partial';

  return {
    details: data,
    assignments: data?.assignments || [],
    isLoading,
    error,
    hasPartialAccess,
    refresh: mutate,
  };
}

// Hook to fetch assignments for a course
export function useAssignments(courseId: number | null) {
  const { data, error, isLoading, mutate } = useSWR(
    courseId ? `/api/settings/canvas/data/courses/${courseId}/assignments` : null,
    fetcher,
    swrConfig
  );

  return {
    assignments: (data?.assignments || []) as Assignment[],
    isLoading,
    error,
    refresh: mutate,
  };
}

// Hook to fetch submissions
export function useSubmissions(courseId: number | null, assignmentId: number | null) {
  const { data, error, isLoading, mutate } = useSWR(
    courseId && assignmentId
      ? `/api/settings/canvas/data/courses/${courseId}/assignments/${assignmentId}/submissions`
      : null,
    fetcher,
    {
      ...swrConfig,
      dedupingInterval: 15000, // Shorter cache for submissions
    }
  );

  return {
    submissions: data?.submissions || [],
    isLoading,
    error,
    refresh: mutate,
  };
}

// Hook to fetch students with performance data
export function useStudents(courseId: number | null, includePerformance: boolean = true) {
  const { data, error, isLoading, mutate } = useSWR(
    courseId
      ? `/api/settings/canvas/data/courses/${courseId}/students?include_performance=${includePerformance}`
      : null,
    fetcher,
    swrConfig
  );

  return {
    students: data?.students || [],
    isLoading,
    error,
    refresh: mutate,
  };
}

// Enhanced fetcher with localStorage persistence
const rubricsFetcher = async (url: string) => {
  const response = await apiClient.get(url, { timeout: 15000 });
  const data = response.data;
  
  // Backend returns a list directly, normalize it
  const rubricsList = Array.isArray(data) ? data : (data?.rubrics || []);
  
  // Persist to localStorage for instant loading on return
  try {
    localStorage.setItem('scorepal_rubrics_cache', JSON.stringify(rubricsList));
    localStorage.setItem('scorepal_rubrics_timestamp', Date.now().toString());
  } catch (error) {
    // Storage might be full, silently fail
  }
  
  return rubricsList;
};

// Get initial data from localStorage for instant rendering
const getInitialRubrics = () => {
  try {
    const cached = localStorage.getItem('scorepal_rubrics_cache');
    const timestamp = localStorage.getItem('scorepal_rubrics_timestamp');
    
    if (cached && timestamp) {
      const age = Date.now() - parseInt(timestamp, 10);
      // Use cached data if less than 5 minutes old
      if (age < 300000) {
        const parsed = JSON.parse(cached);
        // Ensure it's an array
        return Array.isArray(parsed) ? parsed : [];
      }
    }
  } catch (error) {
    // Ignore errors
  }
  return undefined;
};

// Hook to fetch rubrics with optimistic UI
export function useRubrics() {
  const { data, error, isLoading, mutate } = useSWR(
    '/rubrics',
    rubricsFetcher,
    {
      ...swrConfig,
      dedupingInterval: 120000, // Cache rubrics for 2 minutes
      fallbackData: getInitialRubrics(), // Use cached data immediately
      revalidateIfStale: true, // Refresh in background if stale
    }
  );

  // Backend returns a list directly, not wrapped in {rubrics: [...]}
  // Handle both formats for compatibility
  const rubricsArray = Array.isArray(data) 
    ? data 
    : (data?.rubrics || []);

  return {
    rubrics: rubricsArray,
    isLoading,
    error,
    refresh: mutate,
  };
}

// Hook to fetch recent gradings
export function useRecentGradings(limit: number = 10) {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/results/recent?limit=${limit}`,
    fetcher,
    {
      ...swrConfig,
      dedupingInterval: 10000, // Shorter cache for recent gradings
    }
  );

  return {
    gradings: data?.results || [],
    isLoading,
    error,
    refresh: mutate,
  };
}

// Prefetch helper - call this to warm up cache
export async function prefetchCanvasData() {
  try {
    // Prefetch config first
    const configResponse = await apiClient.get('/api/settings/canvas', { timeout: 8000 });
    const isConfigured = configResponse.data?.canvas_key_valid || configResponse.data?.canvas_key_configured;
    
    if (isConfigured) {
      // Prefetch courses in parallel
      await Promise.all([
        apiClient.get('/api/settings/canvas/data/courses', { timeout: 15000 }),
        apiClient.get('/api/rubrics', { timeout: 10000 }),
      ]);
    }
  } catch (error) {
    // Silently fail - this is just prefetching
  }
}

// Export SWR mutate for manual cache updates
export { mutate } from 'swr';
