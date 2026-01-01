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
  Paper,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
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
import { StudentRubricBreakdown } from '@/components/student/StudentRubricBreakdown';
import { StudentCoursesView } from '@/components/dashboard/StudentCoursesView';
import { calculateStudentStats, generateStudentInsights } from '@/utils/studentUtils';
import { TabPanel } from '@/components/common/TabPanel';

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
  const [currentTab, setCurrentTab] = useState(0);

  useEffect(() => {
    if (user?.id) {
      fetchStudentResults();
    }
  }, [user]);

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
                mb: 1
              }}
            >
              My Grades & Progress
            </Typography>
          <Typography variant="body2" color="text.secondary">
            Track your academic performance and get personalized insights
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

        {/* Courses Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 2 }}>
            My Courses
          </Typography>
          <StudentCoursesView userId={user?.id ? String(user.id) : ''} />
        </Box>

        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)}>
            <Tab label="All Grades" />
            <Tab label="Progress Chart" />
            <Tab label="Rubric Breakdown" />
          </Tabs>
        </Paper>

        {/* All Grades Tab */}
        <TabPanel value={currentTab} index={0}>
          <StudentGradesTableEnhanced results={results} />
        </TabPanel>

        {/* Progress Chart Tab */}
        <TabPanel value={currentTab} index={1}>
          <StudentProgressChart results={results} />
        </TabPanel>

        {/* Rubric Breakdown Tab */}
        <TabPanel value={currentTab} index={2}>
          <StudentRubricBreakdown results={results} />
        </TabPanel>
        </Container>
      </div>
    </ProtectedRoute>
  );
}
