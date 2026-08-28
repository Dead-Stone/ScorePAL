/**
 * Types for Results pages
 */

export interface CriterionScore {
  name: string;
  points: number;
  max_points: number;
  feedback: string;
}

export interface Mistake {
  description?: string;
  deductions: number;
  reasons: string;
}

export interface StudentResult {
  student_name?: string;
  score: number;
  total: number;
  percentage: number;
  grade_letter: string;
  grading_feedback: string;
  criteria_scores: CriterionScore[];
  mistakes: Record<string, Mistake>;
  timestamp?: string;
  canvas_comparison?: {
    canvas_posted_grade?: string;
    canvas_posted_score?: number;
    canvas_posted_percentage?: number;
    ai_score: number;
    ai_total: number;
    ai_percentage: number;
    score_difference?: number;
    percentage_difference?: number;
    comparison_status: string;
    canvas_submission_url?: string;
    last_updated?: string;
  } | null;
  ai_model_used?: string;
}

export interface FileInfo {
  filename: string;
  path: string;
  size: number;
  last_modified: string;
  content_type: string;
}

export interface FilesList {
  question_papers: FileInfo[];
  submissions: FileInfo[];
  answer_keys: FileInfo[];
  original_files?: FileInfo[];
}

export interface GradingResults {
  id: string;
  assignment_id?: string;
  timestamp: string;
  assignment_name: string;
  student_name?: string;
  score?: number;
  total?: number;
  percentage?: number;
  grade_letter?: string;
  grading_feedback?: string;
  criteria_scores?: CriterionScore[];
  mistakes?: Record<string, Mistake>;
  summary_stats?: {
    submission_count: number;
    average_score: number;
    highest_score: number;
    lowest_score: number;
    passing_count: number;
    failing_count: number;
    score_distribution: Record<string, number>;
  };
  student_results?: Record<string, StudentResult>;
  question_text?: string;
  answer_key?: string;
  submission_text?: string;
  files?: FilesList;
  canvas_comparison?: {
    canvas_posted_grade?: string;
    canvas_posted_score?: number;
    canvas_posted_percentage?: number;
    ai_score: number;
    ai_total: number;
    ai_percentage: number;
    score_difference?: number;
    percentage_difference?: number;
    comparison_status: string;
    canvas_submission_url?: string;
    last_updated?: string;
  } | null;
  ai_model_used?: string;
  rubric?: any;
}
