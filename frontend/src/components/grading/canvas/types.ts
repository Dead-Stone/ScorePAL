/**
 * Types for Canvas Grading Interface
 */

export interface Course {
  id: number;
  name: string;
  course_code: string;
}

export interface Assignment {
  id: number;
  name: string;
  points_possible: number;
  due_at: string | null;
  published: boolean;
}

export interface Submission {
  user_id: number;
  user_name: string;
  submission_id: number;
  submitted_at: string | null;
  workflow_state: string;
  score: number | null;
}

export interface GradingResult {
  user_id: number;
  user_name: string;
  raw_score?: number;
  total_points?: number;
  percentage?: number;
  status?: string;
}
