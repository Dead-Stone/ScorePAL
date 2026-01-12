/**
 * Types for Results Index Page
 */

export interface RubricScore {
  criterion: string;
  score: number;
  max_score: number;
  feedback: string;
}

export interface Result {
  id: string;
  assignment_id: string;
  assignment_name?: string;
  student_id?: string;
  student_name: string;
  score: number;
  total_points: number;
  percentage: number;
  grade_letter: string;
  graded_at: string;
  overall_feedback?: string;
  rubric_scores?: RubricScore[];
}

export interface AssignmentGroup {
  assignment_id: string;
  assignment_name?: string;
  results: Result[];
  count: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
  passing_count: number;
  latest_graded: string;
}

export interface CachedResults {
  results: Result[];
  timestamp: number;
}

export type SortField = 'student_name' | 'percentage' | 'grade_letter' | 'graded_at';
export type SortOrder = 'asc' | 'desc';
export type ViewMode = 'cards' | 'table';

export interface ResultsStats {
  totalAssignments: number;
  totalSubmissions: number;
  averageScore: number;
  passRate: number;
}
