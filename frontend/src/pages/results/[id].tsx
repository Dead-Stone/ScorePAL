/**
 * ScorePAL - Results Detail Page
 * Refactored to use modular components
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { GetStaticProps, GetStaticPaths } from 'next';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Card,
  CardContent,
  Tabs,
  Tab,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Download as DownloadIcon,
  FormatListBulleted as FormatListBulletedIcon,
  Person as PersonIcon,
  CompareArrows as CompareArrowsIcon,
  BarChart as BarChartIcon,
  Folder as FolderIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import dynamic from 'next/dynamic';

import { TopNavBar } from '@/components/layout/TopNavBar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/utils/apiClient';
import { GradingResults } from '@/components/results/types';
import { transformResultsData } from '@/components/results/utils';
import { ResultsHeader } from '@/components/results/ResultsHeader';
import { TabPanel } from '@/components/results/TabPanel';
import { ResultsOverviewTab } from '@/components/results/ResultsOverviewTab';
import { StudentDetailsTab } from '@/components/results/StudentDetailsTab';
import { CanvasComparisonTab } from '@/components/results/CanvasComparisonTab';

const FileBrowser = dynamic(() => import('../../components/FileBrowser'), { ssr: false });

// Static generation for dynamic routes
export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: [],
    fallback: 'blocking',
  };
};

export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {},
    revalidate: 3600,
  };
};

export default function ResultsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { id } = router.query;
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [results, setResults] = useState<GradingResults | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Redirect students
  useEffect(() => {
  if (user?.role === 'student') {
      router.replace('/dashboard/student');
    }
  }, [user, router]);

  // Fetch results
  useEffect(() => {
    if (!id) return;
    
    const fetchResults = async () => {
      try {
        setIsLoading(true);
        let response;
        try {
          response = await apiClient.get(`/api/results/${id}?include_canvas_comparison=true`);
          const transformedData = transformResultsData(response.data);
          setResults(transformedData);
          if (response.data.student_name) {
            setSelectedStudent(response.data.student_name);
          }
        } catch (newApiError) {
          response = await apiClient.get(`/grading-results/${id}`);
          setResults(response.data);
          
          if (response.data?.student_results) {
            const studentNames = Object.keys(response.data.student_results);
            if (studentNames.length > 0) {
              setSelectedStudent(studentNames[0]);
            }
          } else if (response.data?.student_name) {
            setSelectedStudent(response.data.student_name);
          }
        }
      } catch (err) {
        setError('Failed to load results. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchResults();
  }, [id]);
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const handleStudentSelect = (studentName: string) => {
    setSelectedStudent(studentName);
    setTabValue(1);
  };
  
  const handleDownloadResults = async () => {
    try {
      const response = await apiClient.get(`/grading-results/${id}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `grading_results_${id}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Failed to download results');
    }
  };
  
  // Show loading while redirecting students
  if (user?.role === 'student') {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
          <TopNavBar />
          <Container maxWidth="lg" sx={{ py: 6, pt: { xs: 12, sm: 12 } }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
              <CircularProgress size={60} thickness={4} />
            </Box>
          </Container>
        </div>
      </ProtectedRoute>
    );
  }
  
  // Render loading state
  if (isLoading) {
    return (
      <ProtectedRoute allowedRoles={['teacher', 'admin', 'grader']}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <TopNavBar />
        <Container maxWidth="lg" sx={{ py: 6, pt: { xs: 12, sm: 12 } }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
            <CircularProgress size={60} thickness={4} />
            <Typography variant="h6" sx={{ mt: 3 }}>
              Loading grading results...
            </Typography>
          </Box>
        </Container>
      </div>
      </ProtectedRoute>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <ProtectedRoute allowedRoles={['teacher', 'admin', 'grader']}>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <TopNavBar />
        <Container maxWidth="lg" sx={{ py: 6, pt: { xs: 12, sm: 12 } }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
          <Button
            variant="contained"
            startIcon={<ArrowBackIcon />}
            component={Link}
            href="/results"
          >
            Back to Results
          </Button>
        </Container>
      </div>
      </ProtectedRoute>
    );
  }
  
  // Render empty state
  if (!results) {
    return (
      <ProtectedRoute allowedRoles={['teacher', 'admin', 'grader']}>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <TopNavBar />
        <Container maxWidth="lg" sx={{ py: 6, pt: { xs: 12, sm: 12 } }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            No results found for this assignment.
          </Alert>
          <Button
            variant="contained"
            startIcon={<ArrowBackIcon />}
            component={Link}
            href="/results"
          >
            Back to Results
          </Button>
        </Container>
      </div>
      </ProtectedRoute>
    );
  }

  // Calculate tab count
  const hasCanvasComparison = !!results.canvas_comparison;
  const analyticsTabIndex = hasCanvasComparison ? 3 : 2;
  const filesTabIndex = hasCanvasComparison ? 4 : 3;
  
  return (
    <ProtectedRoute allowedRoles={['teacher', 'admin', 'grader']}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <TopNavBar />
        <Container maxWidth="lg" sx={{ py: 6, pt: { xs: 12, sm: 12 } }}>
          <ResultsHeader results={results} />
          
          {/* Action Buttons */}
          <Box display="flex" gap={2} mb={3}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          component={Link}
          href="/results"
        >
          Back to Results
        </Button>
          <Button
            variant="outlined"
          startIcon={<DownloadIcon />}
            onClick={handleDownloadResults}
        >
            Download Results
        </Button>
      </Box>
      
      {/* Tabs */}
          <Card>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="results tabs">
                <Tab icon={<FormatListBulletedIcon />} label="Overview" iconPosition="start" />
          <Tab icon={<PersonIcon />} label="Student Details" iconPosition="start" />
                {hasCanvasComparison && (
                  <Tab icon={<CompareArrowsIcon />} label="Canvas Comparison" iconPosition="start" />
          )}
          <Tab icon={<BarChartIcon />} label="Analytics" iconPosition="start" />
                <Tab icon={<FolderIcon />} label="Files" iconPosition="start" />
        </Tabs>
      </Box>
      
        <CardContent>
              {/* Overview Tab */}
              <TabPanel value={tabValue} index={0}>
                <ResultsOverviewTab
                  results={results}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onStudentSelect={handleStudentSelect}
                  onTabChange={setTabValue}
                />
      </TabPanel>
      
      {/* Student Details Tab */}
      <TabPanel value={tabValue} index={1}>
                <StudentDetailsTab
                  results={results}
                  selectedStudent={selectedStudent}
                      assignmentId={id as string}
                />
      </TabPanel>
      
              {/* Canvas Comparison Tab */}
              {hasCanvasComparison && (
        <TabPanel value={tabValue} index={2}>
                  <CanvasComparisonTab results={results} />
        </TabPanel>
      )}
      
      {/* Analytics Tab */}
              <TabPanel value={tabValue} index={analyticsTabIndex}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Score Distribution
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Visualization of student performance across various score ranges.
          </Typography>
            <Box height={300} display="flex" alignItems="center" justifyContent="center">
              <Typography variant="body1" color="text.secondary">
                Analytics visualization will be displayed here
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </TabPanel>
      
      {/* Files Tab */}
              <TabPanel value={tabValue} index={filesTabIndex}>
        <FileBrowser 
          assignmentId={id as string}
          title="Assignment Files"
          showCategories={true}
        />
      </TabPanel>
            </CardContent>
          </Card>
      </Container>
    </div>
    </ProtectedRoute>
  );
} 
