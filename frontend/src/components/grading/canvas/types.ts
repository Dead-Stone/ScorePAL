/**
 * Types for Canvas Grading Interface
 */

export interface Course {
  id: number;
  name: string;
  course_code: string;
}

export interface CourseWithAccess extends Course {
  accessible: boolean;
  accessChecked: boolean;
  accessError?: string;
  partialAccess?: boolean;
}

export interface Assignment {
  id: number;
  name: string;
  points_possible: number;
  due_at: string | null;
  published: boolean;
}

export interface AssignmentWithAccess extends Assignment {
  accessible: boolean;
  accessChecked: boolean;
  accessError?: string;
  submissionsAccessible?: boolean;
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

export interface AccessTestResult {
  can_access_course: boolean;
  can_access_assignments: boolean;
  can_access_students: boolean;
  can_access_submissions: boolean;
  errors: string[];
  recommendations: string[];
  course_name?: string;
  course_code?: string;
}

export interface ApiError {
  type: 'access_denied' | 'not_found' | 'network' | 'timeout' | 'unknown';
  message: string;
  details?: string;
}
