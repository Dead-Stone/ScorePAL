/**
 * Types for Grader Dashboard
 */

export interface Course {
  id: number;
  name: string;
  course_code: string;
  total_students?: number;
}

export interface CourseStats {
  course_id: number;
  course_name: string;
  course_code: string;
  total_assignments: number;
  total_submissions: number;
  total_graded: number;
  average_score: number | null;
  pending_grading: number;
  students_count: number;
}

export interface GraderStats {
  totalGraded: number;
  avgScore: number;
  assignments: number;
  totalCourses: number;
  totalPendingGrading: number;
  totalStudents: number;
  overallAvgScore: number;
}
