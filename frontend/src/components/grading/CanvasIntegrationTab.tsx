/**
 * CanvasIntegrationTab - Enhanced Canvas integration tab with quick actions and status
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
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
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import { useRouter } from 'next/router';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SchoolIcon from '@mui/icons-material/School';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PeopleIcon from '@mui/icons-material/People';
import GradeIcon from '@mui/icons-material/Grade';
import SettingsIcon from '@mui/icons-material/Settings';
import RefreshIcon from '@mui/icons-material/Refresh';
import apiClient from '@/utils/apiClient';
import { CanvasGradingInterface } from './CanvasGradingInterface';
import { CanvasGradingSteps } from './CanvasGradingSteps';

interface CanvasIntegrationTabProps {}

export const CanvasIntegrationTab: React.FC<CanvasIntegrationTabProps> = () => {
  const router = useRouter();
  const [canvasConfigured, setCanvasConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [showGradingInterface, setShowGradingInterface] = useState(false);

  useEffect(() => {
    checkCanvasStatus();
  }, []);

  const checkCanvasStatus = async () => {
    try {
      setLoading(true);
      // Use the same endpoint as dashboard to check Canvas configuration
      const response = await apiClient.get('/api/settings/canvas');
      // Check if Canvas is configured (either valid or just configured)
      const isValid = response.data.canvas_key_valid || false;
      const isConfigured = response.data.canvas_key_configured || false;
      setCanvasConfigured(isValid || isConfigured);
      
      if (isValid || isConfigured) {
        // Try to fetch courses using settings-configured API
        try {
          const coursesResponse = await apiClient.get('/api/settings/canvas/data/courses');
          setCourses(coursesResponse.data.courses || []);
          
          // Calculate quick stats
          if (coursesResponse.data.courses?.length > 0) {
            const totalAssignments = coursesResponse.data.courses.reduce(
              (sum: number, course: any) => sum + (course.assignments_count || 0),
              0
            );
            const totalStudents = coursesResponse.data.courses.reduce(
              (sum: number, course: any) => sum + (course.students_count || 0),
              0
            );
            setStats({
              courses: coursesResponse.data.courses.length,
              assignments: totalAssignments,
              students: totalStudents,
            });
          }
        } catch (err) {
          console.error('Error fetching courses:', err);
        }
      }
    } catch (err) {
      console.error('Error checking Canvas status:', err);
      setCanvasConfigured(false);
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <Box textAlign="center" py={4}>
        <LinearProgress sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          Checking Canvas configuration...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Canvas LMS Integration
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Connect to Canvas and grade assignments directly from your courses.
      </Typography>

      {/* Status Card */}
      <Card sx={{ mb: 3 }}>
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
                }}
              />
              <Box>
                <Typography variant="h6">Canvas LMS</Typography>
                <Chip
                  label={canvasConfigured ? 'Connected' : 'Not Configured'}
                  color={canvasConfigured ? 'success' : 'default'}
                  size="small"
                  icon={canvasConfigured ? <CheckCircleIcon /> : undefined}
                />
              </Box>
            </Box>
            {canvasConfigured && (
              <Tooltip title="Refresh Status">
                <IconButton onClick={checkCanvasStatus} size="small">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          {!canvasConfigured ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              Canvas is not configured. Please configure your Canvas API credentials in{' '}
              <Button
                size="small"
                onClick={() => router.replace('/settings')}
                startIcon={<SettingsIcon />}
              >
                Settings
              </Button>
            </Alert>
          ) : (
            <>
              {stats && (
                <Grid container spacing={2} sx={{ mt: 2 }}>
                  <Grid item xs={4}>
                    <Box textAlign="center">
                      <Typography variant="h5" fontWeight="bold" color="primary">
                        {stats.courses}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Courses
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box textAlign="center">
                      <Typography variant="h5" fontWeight="bold" color="primary">
                        {stats.assignments}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Assignments
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box textAlign="center">
                      <Typography variant="h5" fontWeight="bold" color="primary">
                        {stats.students}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Students
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Canvas Grading Interface */}
      {canvasConfigured && showGradingInterface ? (
        <Box>
          <Button
            variant="outlined"
            onClick={() => setShowGradingInterface(false)}
            sx={{ mb: 2 }}
          >
            ← Back to Overview
          </Button>
          <CanvasGradingSteps
            onComplete={async (data) => {
              // Handle grading completion
              // This will be integrated with CanvasGradingInterface logic
              setShowGradingInterface(false);
              checkCanvasStatus();
            }}
            isLoading={false}
          />
        </Box>
      ) : canvasConfigured ? (
        <Card>
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
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <ListItemIcon>
                  <GradeIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Grade Assignments"
                  secondary="Select courses and grade submissions"
                />
              </ListItem>
              <Divider />
              <ListItem
                button
                onClick={() => router.replace('/dashboard?tab=1')}
                sx={{
                  borderRadius: 1,
                  '&:hover': { bgcolor: 'action.hover' },
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

