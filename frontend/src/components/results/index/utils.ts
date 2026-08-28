/**
 * Utilities for Results Index Page
 */

import { Result, CachedResults, AssignmentGroup, ResultsStats } from './types';

export const RESULTS_CACHE_KEY = 'scorepal_results_cache';
export const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

export const getResultsCache = (): CachedResults | null => {
  try {
    const cached = localStorage.getItem(RESULTS_CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached) as CachedResults;
      if (Date.now() - data.timestamp < CACHE_DURATION) {
        return data;
      }
    }
  } catch (err) {
    // Cache read error - silently fail
  }
  return null;
};

export const setResultsCache = (results: Result[]) => {
  try {
    const data: CachedResults = { results, timestamp: Date.now() };
    localStorage.setItem(RESULTS_CACHE_KEY, JSON.stringify(data));
  } catch (err) {
    // Cache write error - silently fail
  }
};

export const clearResultsCache = () => {
  try {
    localStorage.removeItem(RESULTS_CACHE_KEY);
  } catch (err) {
    // Cache clear error - silently fail
  }
};

export const groupResultsByAssignment = (results: Result[]): AssignmentGroup[] => {
  const groups = new Map<string, Result[]>();
  
  results.forEach(result => {
    const key = result.assignment_id;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(result);
  });
  
  return Array.from(groups.entries()).map(([assignment_id, assignmentResults]) => {
    const scores = assignmentResults.map(r => r.percentage);
    const average_score = scores.reduce((a, b) => a + b, 0) / scores.length;
    const passing_count = scores.filter(s => s >= 70).length;
    
    return {
      assignment_id,
      assignment_name: assignmentResults[0]?.assignment_name,
      results: assignmentResults,
      count: assignmentResults.length,
      average_score,
      highest_score: Math.max(...scores),
      lowest_score: Math.min(...scores),
      passing_count,
      latest_graded: assignmentResults.sort((a, b) => 
        new Date(b.graded_at).getTime() - new Date(a.graded_at).getTime()
      )[0]?.graded_at || '',
    };
  }).sort((a, b) => 
    new Date(b.latest_graded).getTime() - new Date(a.latest_graded).getTime()
  );
};

export const calculateStats = (results: Result[]): ResultsStats => {
  if (results.length === 0) {
    return {
      totalAssignments: 0,
      totalSubmissions: 0,
      averageScore: 0,
      passRate: 0,
    };
  }
  
  const uniqueAssignments = new Set(results.map(r => r.assignment_id)).size;
  const averageScore = results.reduce((sum, r) => sum + r.percentage, 0) / results.length;
  const passRate = (results.filter(r => r.percentage >= 70).length / results.length) * 100;
  
  return {
    totalAssignments: uniqueAssignments,
    totalSubmissions: results.length,
    averageScore,
    passRate,
  };
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatLastRefreshed = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
};
