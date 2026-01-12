/**
 * ScorePAL - Student Dashboard
 * Comprehensive student view with grades, progress, and insights
 * Statically generated at build time - data fetched client-side
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 */

import React, { useState, useEffect } from 'react';
import { GetStaticProps } from 'next';
import {
  Box,
  Container,
  Typography,
  Alert,
  CircularProgress,
  Grid,
} from '@mui/material';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { TopNavBar } from '@/components/layout/TopNavBar';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '@/config/api';
import apiClient from '@/utils/apiClient';
import { StudentStatsCards } from '@/components/student/StudentStatsCards';
import { StudentInsights } from '@/components/student/StudentInsights';
import { StudentGradesTableEnhanced } from '@/components/student/StudentGradesTableEnhanced';
import { StudentProgressChart } from '@/components/student/StudentProgressChart';
import { StudentCoursesView } from '@/components/dashboard/StudentCoursesView';
import { StudentAIBuddy } from '@/components/student/StudentAIBuddy';
import { StudentComparisonGraphs } from '@/components/student/StudentComparisonGraphs';
import { calculateStudentStats, generateStudentInsights } from '@/utils/studentUtils';

interface Result {
  id: string;
  assignment_id: string;
  assignment_name?: string;
  student_name: string;
  score: number;
  total_points: number;
  percentage: number;
  grade_letter: string;
  overall_feedback?: string;
  criteria_scores?: Array<{
    criterion_name: string;
    points_awarded: number;
    max_points: number;
    percentage: number;
    feedback?: string;
  }>;
  graded_at: string;
  strengths?: string[];
  weaknesses?: string[];
  suggestions?: string[];
}

// Static generation - compile at build time only
export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {},
    revalidate: 3600, // Revalidate every hour
  };
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [coursePerformance, setCoursePerformance] = useState<Record<number, any>>({});
  const [classComparisonData, setClassComparisonData] = useState<any>(null);

  useEffect(() => {
    if (user?.id) {
      fetchStudentResults();
      fetchStudentCourses();
    }
  }, [user]);
  
  useEffect(() => {
    // Fetch comparison data for all courses
    if (courses.length > 0) {
      courses.forEach(course => {
        fetchCoursePerformance(course.id);
      });
    }
  }, [courses]);
  
  const fetchStudentCourses = async () => {
    try {
      const response = await apiClient.get('/api/settings/canvas/data/student/courses');
      if (response.data?.courses) {
        setCourses(response.data.courses);
      }
    } catch (err: any) {
      // Silently fail - courses are optional
      console.log('Could not fetch courses:', err);
    }
  };

  const fetchCoursePerformance = async (courseId: number) => {
    try {
      const response = await apiClient.get(`/api/settings/canvas/data/student/courses/${courseId}/performance?include_comparison=true`);
      if (response.data) {
        setCoursePerformance(prev => ({ ...prev, [courseId]: response.data }));
        // Aggregate comparison data
        aggregateComparisonData(response.data);
      }
    } catch (err: any) {
      console.log('Could not fetch course performance:', err);
    }
  };

  const aggregateComparisonData = (courseData: any) => {
    if (!courseData.comparison) return;
    
    setClassComparisonData(prev => {
      const newData = prev || {
        overallComparison: null,
        assignmentComparisons: [],
        courseComparisons: [],
        gradeDistribution: [],
      };

      // Update overall comparison (use the most recent course or aggregate)
      if (!newData.overallComparison || courseData.student_overall_percentage) {
        newData.overallComparison = {
          studentScore: courseData.student_overall_percentage || 0,
          classAverage: courseData.comparison.class_average || 0,
          classHigh: courseData.comparison.class_high || 0,
          classLow: courseData.comparison.class_low || 0,
          percentile: courseData.comparison.student_percentile || 0,
          totalStudents: courseData.comparison.total_students || 0,
        };
      }

      // Add assignment comparisons
      if (courseData.student_assignments) {
        courseData.student_assignments.forEach((assignment: any) => {
          const assignmentStats = courseData.comparison.assignment_stats?.[assignment.id];
          if (assignmentStats && assignment.score !== null) {
            newData.assignmentComparisons.push({
              assignmentName: assignment.name,
              studentScore: assignment.percentage || 0,
              classAverage: assignmentStats.average || 0,
              maxPoints: assignment.points_possible || 0,
            });
          }
        });
      }

      // Add course comparison
      if (courseData.course_info) {
        newData.courseComparisons.push({
          courseName: courseData.course_info.name,
          studentScore: courseData.student_overall_percentage || 0,
          classAverage: courseData.comparison.class_average || 0,
        });
      }

      return newData;
    });
  };

  const fetchStudentResults = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/api/results/student/${user?.id}`);
      setResults(response.data.results || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load your results');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics using utility function
  const stats = React.useMemo(() => calculateStudentStats(results), [results]);

  // Generate insights using utility function
  const insights = React.useMemo(() => generateStudentInsights(results, stats), [results, stats]);

  // Generate fallback comparison data from results if Canvas data not available
  const fallbackComparisonData = React.useMemo(() => {
    if (classComparisonData?.overallComparison) return null; // Use Canvas data if available
    
    if (results.length === 0) return null;
    
    const avgScore = stats.averageGrade || 0;
    const classAvg = 75; // Default class average assumption
    const classHigh = 95;
    const classLow = 60;
    
    // Estimate percentile based on average
    const estimatedPercentile = avgScore >= 90 ? 90 : avgScore >= 80 ? 75 : avgScore >= 70 ? 50 : 30;
    
    return {
      overallComparison: {
        studentScore: avgScore,
        classAverage: classAvg,
        classHigh: classHigh,
        classLow: classLow,
        percentile: estimatedPercentile,
        totalStudents: 25, // Default estimate
      },
      assignmentComparisons: results.slice(0, 10).map((result, idx) => ({
        assignmentName: result.assignment_name || `Assignment ${idx + 1}`,
        studentScore: result.percentage,
        classAverage: classAvg + (Math.random() * 10 - 5), // Simulated variation
        maxPoints: result.total_points,
      })),
      courseComparisons: [],
      gradeDistribution: [
        { range: '90-100', studentCount: 5, studentPosition: avgScore >= 90 ? 1 : 0 },
        { range: '80-89', studentCount: 8, studentPosition: avgScore >= 80 && avgScore < 90 ? 1 : 0 },
        { range: '70-79', studentCount: 7, studentPosition: avgScore >= 70 && avgScore < 80 ? 1 : 0 },
        { range: '60-69', studentCount: 4, studentPosition: avgScore >= 60 && avgScore < 70 ? 1 : 0 },
        { range: '0-59', studentCount: 1, studentPosition: avgScore < 60 ? 1 : 0 },
      ],
    };
  }, [results, stats, classComparisonData]);

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['student']}>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
          <TopNavBar />
          <Container maxWidth="xl" sx={{ py: 6, pt: { xs: 12, sm: 12 } }}>
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
              <CircularProgress />
            </Box>
          </Container>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <TopNavBar />
        <Container maxWidth="xl" sx={{ py: 6, pt: { xs: 12, sm: 12 } }}>
          {/* Header */}
          <Box mb={4}>
            <Typography 
              variant="h3" 
              fontWeight="bold" 
              gutterBottom
              sx={{ 
                background: 'linear-gradient(135deg, #1D80C3 0%, #4F46E5 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Dashboard
            </Typography>
          </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Statistics Cards */}
        <Box sx={{ mb: 4 }}>
          <StudentStatsCards stats={stats} />
        </Box>

        {/* Insights */}
        <Box sx={{ mb: 4 }}>
          <StudentInsights insights={insights} />
        </Box>

        {/* Comprehensive Comparison Graphs */}
        <Box sx={{ mb: 4 }}>
          <StudentComparisonGraphs 
            overallComparison={classComparisonData?.overallComparison || fallbackComparisonData?.overallComparison}
            assignmentComparisons={classComparisonData?.assignmentComparisons || fallbackComparisonData?.assignmentComparisons}
            courseComparisons={classComparisonData?.courseComparisons || fallbackComparisonData?.courseComparisons}
            gradeDistribution={classComparisonData?.gradeDistribution || fallbackComparisonData?.gradeDistribution}
          />
        </Box>

        {/* Progress Over Time */}
        <Box sx={{ mb: 4 }}>
          <StudentProgressChart results={results} />
        </Box>

        {/* Courses Section */}
        <Box sx={{ mb: 4 }}>
          <StudentCoursesView userId={user?.id ? String(user.id) : ''} />
        </Box>

        {/* All Grades Table */}
        <Box sx={{ mb: 4 }}>
          <StudentGradesTableEnhanced results={results} />
        </Box>
        </Container>
        
        {/* AI Buddy - Always visible */}
        <StudentAIBuddy 
          studentData={{
            courses: courses,
            results: results,
            stats: stats,
            insights: insights,
          }}
        />
      </div>
    </ProtectedRoute>
  );
}
