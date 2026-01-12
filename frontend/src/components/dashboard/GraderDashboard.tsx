/**
 * GraderDashboard - Comprehensive grader view with course stats and student toggle
 * Refactored to use modular components
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { Box, CircularProgress, Card, CardContent, Typography } from '@mui/material';
import { StudentComparison } from './StudentComparison';
import apiClient from '@/utils/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { Course, CourseStats, GraderStats } from './grader/types';
import { GraderDashboardHeader } from './grader/GraderDashboardHeader';
import { GraderStatsCards } from './grader/GraderStatsCards';
import { GraderCharts } from './grader/GraderCharts';
import { CourseStatisticsTable } from './grader/CourseStatisticsTable';
import { AssignmentComparisonsTable } from './grader/AssignmentComparisonsTable';
import { RecentGradingsTable } from './grader/RecentGradingsTable';
import { calculateGraderStats, groupGradingsByAssignment } from './grader/utils';

interface GraderDashboardProps {
  recentGradings: any[];
  students?: any[];
  loading?: boolean;
}

export const GraderDashboard: React.FC<GraderDashboardProps> = ({
  recentGradings,
  students = [],
  loading = false,
}) => {
  const router = useRouter();
  const { user } = useAuth();
  const [showStudentView, setShowStudentView] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseStats, setCourseStats] = useState<CourseStats[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (showStudentView) {
      router.push('/student');
    }
  }, [showStudentView, router]);

  useEffect(() => {
    if (!showStudentView) {
      fetchGraderCourses();
    }
  }, []);

  useEffect(() => {
    if (courses.length > 0) {
      fetchAllCourseStats();
    }
  }, [courses]);

  const fetchGraderCourses = async () => {
    try {
      setLoadingCourses(true);
      setError(null);
      const response = await apiClient.get('/api/settings/canvas/data/courses');
      if (response.data?.status === 'success' && response.data?.courses) {
        setCourses(response.data.courses);
        if (response.data.courses.length > 0 && !selectedCourseId) {
          setSelectedCourseId(response.data.courses[0].id);
        }
      }
    } catch (err: any) {
      console.error('Error fetching courses:', err);
      setError('Failed to load courses. Please check your Canvas configuration.');
    } finally {
      setLoadingCourses(false);
    }
  };

  const fetchAllCourseStats = async () => {
    try {
      setLoadingStats(true);
      const statsPromises = courses.map(course => 
        fetchCourseStats(course.id, false).catch(err => {
          console.warn(`Course ${course.id} (${course.name}) is not accessible or failed to load:`, err);
          return null;
        })
      );
      await Promise.all(statsPromises);
    } catch (err) {
      console.error('Error fetching all course stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchCourseStats = async (courseId: number, setLoading = true) => {
    try {
      if (setLoading) setLoadingStats(true);
      const response = await apiClient.get(
        `/api/settings/canvas/data/courses/${courseId}/details?include_submissions=true`
      );
      
      if (response.data?.status === 'success' || response.data?.status === 'partial') {
        const course = courses.find(c => c.id === courseId);
        const assignments = response.data.assignments || [];
        const totalAssignments = assignments.length;
        const totalSubmissions = response.data.total_submissions || 0;
        const totalGraded = response.data.total_graded || 0;
        const avgScore = response.data.average_score;
        const pendingGrading = totalSubmissions - totalGraded;
        
        const stats: CourseStats = {
          course_id: courseId,
          course_name: course?.name || 'Unknown Course',
          course_code: course?.course_code || '',
          total_assignments: totalAssignments,
          total_submissions: totalSubmissions,
          total_graded: totalGraded,
          average_score: avgScore,
          pending_grading: pendingGrading,
          students_count: course?.total_students || 0,
        };

        setCourseStats(prev => {
          const filtered = prev.filter(s => s.course_id !== courseId);
          return [...filtered, stats];
        });
      }
    } catch (err: any) {
      console.error(`Error fetching stats for course ${courseId}:`, err);
    } finally {
      if (setLoading) setLoadingStats(false);
    }
  };

  const graderStats = useMemo(() => 
    calculateGraderStats(courseStats, recentGradings),
    [courseStats, recentGradings]
  );

  const assignmentGroups = useMemo(() => 
    groupGradingsByAssignment(recentGradings),
    [recentGradings]
  );

  if (loading || loadingCourses) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <GraderDashboardHeader
        courses={courses}
        selectedCourseId={selectedCourseId}
        showStudentView={showStudentView}
        error={error}
        onCourseChange={setSelectedCourseId}
        onRefresh={fetchGraderCourses}
        onStudentViewToggle={setShowStudentView}
        onErrorDismiss={() => setError(null)}
      />

      <GraderStatsCards stats={graderStats} coursesCount={courses.length} />

      <GraderCharts stats={graderStats} courseStats={courseStats} />

      <CourseStatisticsTable
        courseStats={courseStats}
        selectedCourseId={selectedCourseId}
        loadingStats={loadingStats}
      />

      <AssignmentComparisonsTable assignmentGroups={assignmentGroups} />

      <RecentGradingsTable recentGradings={recentGradings} />

      {students.length > 0 && (
        <Card>
          <CardContent>
            <StudentComparison students={students} loading={false} />
          </CardContent>
        </Card>
      )}

      {recentGradings.length === 0 && courseStats.length === 0 && !loadingStats && (
        <Card>
          <CardContent>
            <Box textAlign="center" py={4}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No grading data yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Start grading assignments or configure Canvas to see your dashboard
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};
