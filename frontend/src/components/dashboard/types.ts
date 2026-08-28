/**
 * Types for Dashboard Page
 */

export interface Course {
  id: number;
  name: string;
  course_code: string;
  total_students?: number;
  term?: { name: string };
}

export interface Assignment {
  id: number;
  name: string;
  points_possible: number;
  due_at: string | null;
  published: boolean;
  submission_types: string[];
  statistics?: {
    submissions_count: number;
    graded_count: number;
    average_score: number | null;
    high_score: number | null;
    low_score: number | null;
  };
}

export interface CourseDetails {
  course_info: Course;
  assignments: Assignment[];
  total_submissions: number;
  total_graded: number;
  average_score: number | null;
  all_scores: number[];
}

export interface DashboardStats {
  totalGradings: number;
  avgScore: number;
  uniqueAssignments: number;
  uniqueStudents: number;
  highPerformers: number;
}
