/**
 * Filter utilities for Results Index Page
 */

import { Result, SortField, SortOrder } from './types';

export interface FilterOptions {
  searchTerm: string;
  selectedAssignment: string;
  gradeFilter: string;
  dateRange: 'all' | '7days' | '30days' | '90days';
  scoreRange: string;
  resultType: 'all' | 'single' | 'batch' | 'canvas';
}

export const filterResults = (
  results: Result[],
  filters: FilterOptions,
  sortField: SortField,
  sortOrder: SortOrder
): Result[] => {
  let filtered = [...results];
  
  // Search
  if (filters.searchTerm) {
    const search = filters.searchTerm.toLowerCase();
    filtered = filtered.filter(r =>
      r.student_name.toLowerCase().includes(search) ||
      r.assignment_id.toLowerCase().includes(search) ||
      r.assignment_name?.toLowerCase().includes(search)
    );
  }
  
  // Assignment filter
  if (filters.selectedAssignment !== 'all') {
    filtered = filtered.filter(r => r.assignment_id === filters.selectedAssignment);
  }
  
  // Grade filter
  if (filters.gradeFilter !== 'all') {
    filtered = filtered.filter(r => r.grade_letter === filters.gradeFilter);
  }
  
  // Date filter
  if (filters.dateRange !== 'all') {
    const now = new Date();
    const days = filters.dateRange === '7days' ? 7 : filters.dateRange === '30days' ? 30 : 90;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    filtered = filtered.filter(r => new Date(r.graded_at) >= cutoff);
  }
  
  // Sort
  filtered.sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'student_name':
        comparison = a.student_name.localeCompare(b.student_name);
        break;
      case 'percentage':
        comparison = a.percentage - b.percentage;
        break;
      case 'grade_letter':
        comparison = a.grade_letter.localeCompare(b.grade_letter);
        break;
      case 'graded_at':
        comparison = new Date(a.graded_at).getTime() - new Date(b.graded_at).getTime();
        break;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });
  
  return filtered;
};

export const downloadResults = (results: Result[], format: 'json' | 'csv' = 'json') => {
  try {
    if (format === 'csv') {
      const headers = ['Student', 'Assignment', 'Score', 'Total', 'Percentage', 'Grade', 'Graded At'];
      const rows = results.map(r => [
        r.student_name,
        r.assignment_name || r.assignment_id,
        r.score,
        r.total_points,
        r.percentage.toFixed(1),
        r.grade_letter,
        r.graded_at,
      ]);
      
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `scorepal_results_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } else {
      const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `scorepal_results_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      window.URL.revokeObjectURL(url);
    }
  } catch (err) {
    throw new Error('Failed to download results');
  }
};
