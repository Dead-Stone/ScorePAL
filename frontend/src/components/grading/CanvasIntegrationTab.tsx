/**
 * CanvasIntegrationTab - Enhanced Canvas integration with instant data loading via SWR
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Alert,
  AlertTitle,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Tooltip,
  Skeleton,
  Fade,
} from '@mui/material';
import { useRouter } from 'next/router';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SchoolIcon from '@mui/icons-material/School';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PeopleIcon from '@mui/icons-material/People';
import GradeIcon from '@mui/icons-material/Grade';
import SettingsIcon from '@mui/icons-material/Settings';
import RefreshIcon from '@mui/icons-material/Refresh';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import SpeedIcon from '@mui/icons-material/Speed';
import { useCanvasConfig, useCourses, prefetchCanvasData } from '@/hooks/useCanvasData';
import { CanvasGradingSteps } from './CanvasGradingSteps';

interface CanvasStats {
  courses: number;
  assignments: number;
  students: number;
}

export const CanvasIntegrationTab: React.FC = () => {
  const router = useRouter();
  const [showGradingInterface, setShowGradingInterface] = useState(false);
  const [stats, setStats] = useState<CanvasStats | null>(null);
  
  // SWR hooks for instant data loading
  const { isConfigured, isLoading: configLoading, error: configError, refresh: refreshConfig } = useCanvasConfig();
  const { courses, isLoading: coursesLoading, error: coursesError, refresh: refreshCourses } = useCourses();

  // Calculate stats when courses load
  useEffect(() => {
    if (courses.length > 0) {
      const totalAssignments = courses.reduce(
        (sum: number, course: any) => sum + (course.assignments_count || 0),
        0
      );
      const totalStudents = courses.reduce(
        (sum: number, course: any) => sum + (course.students_count || 0),
        0
      );
      setStats({
        courses: courses.length,
        assignments: totalAssignments,
        students: totalStudents,
      });
    }
  }, [courses]);

  // Prefetch data on mount for even faster subsequent loads
  useEffect(() => {
    prefetchCanvasData();
  }, []);

  const handleRefresh = () => {
    refreshConfig();
    refreshCourses();
  };

  const isLoading = configLoading || (isConfigured && coursesLoading);
  const hasError = configError || coursesError;

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Box>
          <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
            Canvas LMS Integration
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Connect to Canvas and grade assignments directly from your courses.
          </Typography>
        </Box>
        {/* Data loaded indicator */}
        {!isLoading && isConfigured && courses.length > 0 && (
          <Fade in>
            <Chip
              icon={<SpeedIcon />}
              label="Data loaded"
              size="small"
              color="success"
              variant="outlined"
            />
          </Fade>
        )}
      </Box>

      {/* Loading Progress - Shows during any loading */}
      {isLoading && (
        <LinearProgress 
          sx={{ 
            mb: 2, 
            borderRadius: 1,
            height: 3,
            '& .MuiLinearProgress-bar': {
              transition: 'transform 0.1s ease'
            }
          }} 
        />
      )}

      {/* Error Alert */}
      {hasError && !isLoading && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          icon={<CloudOffIcon />}
          action={
            <Button size="small" onClick={handleRefresh}>
              Retry
            </Button>
          }
        >
          <AlertTitle>Connection Error</AlertTitle>
          {configError?.message || coursesError?.message || 'Failed to connect to Canvas.'}
        </Alert>
      )}

      {/* Status Card */}
      <Card sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Box display="flex" alignItems="center" gap={2}>
              <Box
                component="img"
                src="/canvas-logo.jpg"
                alt="Canvas"
                sx={{
                  width: 40,
                  height: 40,
                  objectFit: 'contain',
                  borderRadius: 1,
                }}
                onError={(e: any) => {
                  e.target.style.display = 'none';
                }}
              />
              <Box>
                <Typography variant="h6">Canvas LMS</Typography>
                {configLoading ? (
                  <Skeleton width={100} height={24} />
                ) : (
                  <Chip
                    label={isConfigured ? 'Connected' : 'Not Configured'}
                    color={isConfigured ? 'success' : 'default'}
                    size="small"
                    icon={isConfigured ? <CheckCircleIcon /> : <ErrorOutlineIcon />}
                  />
                )}
              </Box>
            </Box>
            {isConfigured && (
              <Tooltip title="Refresh Data">
                <IconButton 
                  onClick={handleRefresh} 
                  size="small"
                  disabled={isLoading}
                  sx={{
                    transition: 'transform 0.3s ease',
                    '&:hover': { transform: 'rotate(180deg)' }
                  }}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          {!isConfigured && !configLoading ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              <AlertTitle>Canvas Not Configured</AlertTitle>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Configure your Canvas API credentials to start grading assignments.
              </Typography>
              <Button
                variant="contained"
                size="small"
                onClick={() => router.replace('/settings')}
                startIcon={<SettingsIcon />}
              >
                Go to Settings
              </Button>
            </Alert>
          ) : (
            <>
              {/* Stats - Show skeleton while loading, then instant display */}
              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={4}>
                  <Box 
                    textAlign="center" 
                    sx={{ 
                      p: 2, 
                      borderRadius: 2, 
                      bgcolor: 'primary.50',
                      border: '1px solid',
                      borderColor: 'primary.100',
                      transition: 'all 0.3s ease',
                      '&:hover': { transform: 'translateY(-2px)', boxShadow: 2 }
                    }}
                  >
                    <SchoolIcon color="primary" sx={{ mb: 0.5 }} />
                    {coursesLoading ? (
                      <Skeleton width={40} height={32} sx={{ mx: 'auto' }} />
                    ) : (
                      <Typography variant="h5" fontWeight="bold" color="primary.main">
                        {stats?.courses || courses.length || 0}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      Courses
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box 
                    textAlign="center" 
                    sx={{ 
                      p: 2, 
                      borderRadius: 2, 
                      bgcolor: 'success.50',
                      border: '1px solid',
                      borderColor: 'success.100',
                      transition: 'all 0.3s ease',
                      '&:hover': { transform: 'translateY(-2px)', boxShadow: 2 }
                    }}
                  >
                    <AssignmentIcon color="success" sx={{ mb: 0.5 }} />
                    {coursesLoading ? (
                      <Skeleton width={40} height={32} sx={{ mx: 'auto' }} />
                    ) : (
                      <Typography variant="h5" fontWeight="bold" color="success.main">
                        {stats?.assignments || 0}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      Assignments
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box 
                    textAlign="center" 
                    sx={{ 
                      p: 2, 
                      borderRadius: 2, 
                      bgcolor: 'info.50',
                      border: '1px solid',
                      borderColor: 'info.100',
                      transition: 'all 0.3s ease',
                      '&:hover': { transform: 'translateY(-2px)', boxShadow: 2 }
                    }}
                  >
                    <PeopleIcon color="info" sx={{ mb: 0.5 }} />
                    {coursesLoading ? (
                      <Skeleton width={40} height={32} sx={{ mx: 'auto' }} />
                    ) : (
                      <Typography variant="h5" fontWeight="bold" color="info.main">
                        {stats?.students || 0}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      Students
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              {/* No Courses State */}
              {!coursesLoading && courses.length === 0 && isConfigured && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <AlertTitle>No Courses Found</AlertTitle>
                  <Typography variant="body2">
                    You don't have access to any courses yet. This may be because:
                  </Typography>
                  <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
                    <li>Your API key doesn't have course access permissions</li>
                    <li>You are not enrolled in any courses as a Teacher, TA, or Designer</li>
                    <li>All courses are hidden or unpublished</li>
                  </ul>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Canvas Grading Interface */}
      {isConfigured && showGradingInterface ? (
        <Box>
          <Button
            variant="outlined"
            onClick={() => setShowGradingInterface(false)}
            sx={{ mb: 2 }}
          >
            ← Back to Overview
          </Button>
          <CanvasGradingSteps
            onComplete={async () => {
              setShowGradingInterface(false);
              refreshCourses();
            }}
            isLoading={false}
          />
        </Box>
      ) : isConfigured && !hasError ? (
        <Card sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Quick Actions
            </Typography>
            <List>
              <ListItem
                button
                onClick={() => setShowGradingInterface(true)}
                sx={{
                  borderRadius: 1,
                  transition: 'all 0.2s ease',
                  '&:hover': { bgcolor: 'action.hover', transform: 'translateX(4px)' },
                }}
                disabled={courses.length === 0 || coursesLoading}
              >
                <ListItemIcon>
                  <GradeIcon color={courses.length > 0 ? 'primary' : 'disabled'} />
                </ListItemIcon>
                <ListItemText
                  primary="Grade Assignments"
                  secondary={
                    coursesLoading
                      ? "Loading courses..."
                      : courses.length > 0 
                        ? "Select courses and grade submissions"
                        : "No courses available"
                  }
                />
                {courses.length > 0 && !coursesLoading && (
                  <Chip 
                    label={`${courses.length} courses`} 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                  />
                )}
              </ListItem>
              <Divider />
              <ListItem
                button
                onClick={() => router.replace('/dashboard?tab=1')}
                sx={{
                  borderRadius: 1,
                  transition: 'all 0.2s ease',
                  '&:hover': { bgcolor: 'action.hover', transform: 'translateX(4px)' },
                }}
              >
                <ListItemIcon>
                  <SchoolIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="View Analytics"
                  secondary="See course performance and statistics"
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      ) : null}
    </Box>
  );
};
