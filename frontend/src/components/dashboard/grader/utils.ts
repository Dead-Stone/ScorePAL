/**
 * Grader Dashboard Utilities
 */

import { CourseStats, GraderStats } from './types';

export const calculateGraderStats = (
  courseStats: CourseStats[],
  recentGradings: any[]
): GraderStats => {
  const accessibleCourseStats = courseStats.filter(s => 
    s.total_submissions >= 0 && s.total_graded >= 0
  );

  const totalGraded = accessibleCourseStats.reduce((sum, s) => sum + s.total_graded, 0);
  const totalPendingGrading = accessibleCourseStats.reduce((sum, s) => sum + s.pending_grading, 0);
  const totalAssignments = accessibleCourseStats.reduce((sum, s) => sum + s.total_assignments, 0);
  const totalStudents = accessibleCourseStats.reduce((sum, s) => sum + s.students_count, 0);

  const scores = recentGradings
    .map(g => g.percentage)
    .filter((s): s is number => typeof s === 'number' && !isNaN(s));
  
  const avgScore = scores.length > 0 
    ? scores.reduce((a, b) => a + b, 0) / scores.length 
    : 0;

  const overallAvgScore = accessibleCourseStats.length > 0
    ? accessibleCourseStats.reduce((sum, s) => sum + (s.average_score || 0), 0) / accessibleCourseStats.length
    : 0;

  return {
    totalGraded,
    avgScore,
    assignments: totalAssignments,
    totalCourses: accessibleCourseStats.length,
    totalPendingGrading,
    totalStudents,
    overallAvgScore,
  };
};

export const groupGradingsByAssignment = (recentGradings: any[]): [string, any[]][] => {
  const grouped = recentGradings.reduce((acc, grading) => {
    const assignment = grading.assignment_name || grading.assignment_id || 'Unknown';
    if (!acc[assignment]) {
      acc[assignment] = [];
    }
    acc[assignment].push(grading);
    return acc;
  }, {} as Record<string, any[]>);

  return Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);
};
