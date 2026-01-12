/**
 * Dashboard Utilities
 */

import axios from 'axios';
import { Course, CourseDetails, DashboardStats } from './types';

export const checkCanvasConfig = async (): Promise<boolean> => {
  const response = await axios.get('/api/settings/canvas');
  return response.data.canvas_key_valid || false;
};

export const fetchCourses = async (): Promise<Course[]> => {
  const response = await axios.get('/api/settings/canvas/data/courses');
  if (response.data.status === 'success') {
    return response.data.courses || [];
  }
  return [];
};

export const fetchCourseDetails = async (courseId: number): Promise<CourseDetails | null> => {
  const response = await axios.get(
    `/api/settings/canvas/data/courses/${courseId}/details?include_submissions=true`
  );
  if (response.data.status === 'success' || response.data.status === 'partial') {
    return response.data;
  }
  return null;
};

export const fetchStudents = async (courseId: number): Promise<any[]> => {
  const response = await axios.get(
    `/api/settings/canvas/data/courses/${courseId}/students?include_performance=true`
  );
  return response.data?.students || [];
};

export const calculateStats = (recentGradings: any[]): DashboardStats | null => {
  if (!recentGradings.length) return null;
  const totalGradings = recentGradings.length;
  const avgScore = recentGradings.reduce((sum, g) => sum + (g.percentage || 0), 0) / totalGradings;
  const uniqueAssignments = new Set(recentGradings.map(g => g.assignment_id || g.assignment_name)).size;
  const uniqueStudents = new Set(recentGradings.map(g => g.student_name || g.student_id)).size;
  const highPerformers = recentGradings.filter(g => (g.percentage || 0) >= 90).length;
  return { totalGradings, avgScore, uniqueAssignments, uniqueStudents, highPerformers };
};
