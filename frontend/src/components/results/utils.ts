/**
 * Utility functions for Results pages
 */

import { GradingResults, StudentResult } from './types';

export const getScoreColor = (percentage: number): 'success' | 'info' | 'warning' | 'error' => {
  if (percentage >= 90) return 'success';
  if (percentage >= 80) return 'info';
  if (percentage >= 70) return 'warning';
  return 'error';
};

export const getGradeColor = (grade: string): string => {
  switch (grade) {
    case 'A': return 'success.main';
    case 'B': return 'info.main';
    case 'C': return 'warning.light';
    case 'D': return 'warning.main';
    default: return 'error.main';
  }
};

export const getStudentResult = (
  results: GradingResults,
  selectedStudent: string | null
): StudentResult | null => {
  if (selectedStudent && results.student_results?.[selectedStudent]) {
    return results.student_results[selectedStudent];
  }
  if (results.student_name && results.score !== undefined) {
    return {
      student_name: results.student_name,
      score: results.score,
      total: results.total || 100,
      percentage: results.percentage || 0,
      grade_letter: results.grade_letter || 'N/A',
      grading_feedback: results.grading_feedback || '',
      criteria_scores: results.criteria_scores || [],
      mistakes: results.mistakes || {},
    };
  }
  return null;
};

export const transformResultsData = (data: any): GradingResults => {
  // Transform MongoDB result to expected format
  return {
    id: data.id || data._id || '',
    assignment_id: data.assignment_id,
    timestamp: data.timestamp || data.created_at || new Date().toISOString(),
    assignment_name: data.assignment_name || 'Unknown Assignment',
    student_name: data.student_name,
    score: data.score,
    total: data.total,
    percentage: data.percentage,
    grade_letter: data.grade_letter,
    grading_feedback: data.grading_feedback,
    criteria_scores: data.criteria_scores || [],
    mistakes: data.mistakes || {},
    summary_stats: data.summary_stats,
    student_results: data.student_results,
    question_text: data.question_text,
    answer_key: data.answer_key,
    submission_text: data.submission_text,
    files: data.files,
    canvas_comparison: data.canvas_comparison,
    ai_model_used: data.ai_model_used,
    rubric: data.rubric,
  };
};
