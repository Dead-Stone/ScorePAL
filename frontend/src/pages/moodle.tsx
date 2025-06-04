import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Alert,
  List,
  ListItem,
  ListItemText,
  Chip,
  Paper,
  LinearProgress,
  IconButton,
  Menu,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import {
  IntegrationInstructions as MoodleIcon,
  Assignment as AssignmentIcon,
  Class as CourseIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  MoreVert as MoreIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';

interface Course {
  id: string;
  fullname: string;
  shortname: string;
  categoryid: string;
  visible: number;
}

interface Assignment {
  id: string;
  name: string;
  intro: string;
  course: string;
  duedate: number;
  grade: number;
  timemodified: number;
}

const MoodleIntegration: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(false);
  const [backgroundSync, setBackgroundSync] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [integrationStep, setIntegrationStep] = useState<'connect' | 'courses' | 'assignments' | 'ready'>('connect');

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async (maintainState: boolean = false) => {
    setConnectionStatus('checking');
    try {
      const response = await fetch('/api/moodle/status');
      const data = await response.json();
      
      if (data.status === 'connected') {
        setConnectionStatus('connected');
        // Only reload courses if we're not maintaining state or if courses are empty
        if (!maintainState || courses.length === 0) {
          loadCourses();
        }
      } else {
        setConnectionStatus('error');
        setAlert({ type: 'error', message: 'Moodle connection not configured. Please check your settings.' });
      }
    } catch (error) {
      setConnectionStatus('error');
      setAlert({ type: 'error', message: 'Failed to check Moodle connection' });
    }
  };

  const loadCourses = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/moodle/courses');
      const data = await response.json();
      
      if (data.status === 'success') {
        setCourses(data.courses);
        setAlert({ type: 'success', message: `Loaded ${data.courses.length} courses from Moodle` });
      } else {
        setAlert({ type: 'error', message: 'Failed to load courses from Moodle' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Network error loading courses' });
    } finally {
      setLoading(false);
    }
  };

  const refreshConnection = async () => {
    setBackgroundSync(true);
    setAlert({ type: 'info', message: 'Syncing with Moodle in background...' });
    
    try {
      await checkConnection(true); // Maintain state when refreshing
      
      // If a course is selected, reload its assignments
      if (selectedCourse) {
        await loadAssignments(selectedCourse.id);
      }
      
      // Show success notification
      setTimeout(() => {
        setAlert({ type: 'success', message: '✅ Moodle sync completed successfully!' });
        // Auto-dismiss success message after 3 seconds
        setTimeout(() => {
          setAlert(null);
        }, 3000);
      }, 500);
      
    } catch (error) {
      setAlert({ type: 'error', message: 'Sync failed. Please try again.' });
    } finally {
      setBackgroundSync(false);
    }
  };

  const loadAssignments = async (courseId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/moodle/courses/${courseId}/assignments`);
      const data = await response.json();
      
      if (data.status === 'success') {
        setAssignments(data.assignments);
      } else {
        setAlert({ type: 'error', message: 'Failed to load assignments from Moodle' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Network error loading assignments' });
    } finally {
      setLoading(false);
    }
  };

  const handleCourseSelect = (course: Course) => {
    setSelectedCourse(course);
    loadAssignments(course.id);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, assignment: Assignment) => {
    setAnchorEl(event.currentTarget);
    setSelectedAssignment(assignment);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedAssignment(null);
  };

  const startGradingJob = async (assignmentId: string) => {
    try {
      const response = await fetch('/api/moodle/grade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assignment_id: assignmentId }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        setAlert({ type: 'success', message: 'Grading job started successfully' });
      } else {
        setAlert({ type: 'error', message: data.message || 'Failed to start grading job' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Network error starting grading job' });
    }
    handleMenuClose();
  };

  const exportSubmissions = async (assignmentId: string) => {
    try {
      const response = await fetch(`/api/moodle/assignments/${assignmentId}/submissions/export`);
      const data = await response.blob();
      
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `moodle_submissions_${assignmentId}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setAlert({ type: 'success', message: 'Submissions exported successfully' });
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to export submissions' });
    }
    handleMenuClose();
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        {/* Header content removed */}
        
        {/* Connection Status */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {connectionStatus === 'checking' && (
            <>
              <LinearProgress sx={{ flexGrow: 1, height: 8, borderRadius: 4 }} />
              <Typography variant="body2" color="text.secondary">
                Checking connection...
              </Typography>
            </>
          )}
          {connectionStatus === 'connected' && (
            <>
              <Chip 
                icon={<CheckIcon />} 
                label="Connected to Moodle" 
                color="success" 
                variant="outlined"
              />
              <Button
                startIcon={backgroundSync ? <CircularProgress size={16} /> : <RefreshIcon />}
                onClick={refreshConnection}
                size="small"
                disabled={backgroundSync}
              >
                {backgroundSync ? 'Syncing...' : 'Sync'}
              </Button>
            </>
          )}
          {connectionStatus === 'error' && (
            <Chip 
              icon={<ErrorIcon />} 
              label="Connection Error" 
              color="error" 
              variant="outlined"
            />
          )}
        </Box>
      </Box>

      {/* Alert */}
      {alert && (
        <Alert 
          severity={alert.type} 
          sx={{ mb: 3 }}
          onClose={() => setAlert(null)}
        >
          {alert.message}
        </Alert>
      )}

      {connectionStatus === 'connected' && (
        <Grid container spacing={4}>
          {/* Courses List */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CourseIcon />
                  My Courses
                </Typography>
                {loading && courses.length === 0 ? (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <LinearProgress sx={{ mb: 2 }} />
                    <Typography variant="body2" color="text.secondary">
                      Loading courses...
                    </Typography>
                  </Box>
                ) : (
                  <List>
                    {courses.map((course) => (
                      <ListItem
                        key={course.id}
                        button
                        selected={selectedCourse?.id === course.id}
                        onClick={() => handleCourseSelect(course)}
                        sx={{
                          borderRadius: 1,
                          mb: 1,
                          '&.Mui-selected': {
                            backgroundColor: 'primary.light',
                            color: 'primary.contrastText',
                          },
                        }}
                      >
                        <ListItemText
                          primary={course.fullname}
                          secondary={course.shortname}
                          primaryTypographyProps={{ fontWeight: 500 }}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Assignments List */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AssignmentIcon />
                  {selectedCourse ? `Assignments - ${selectedCourse.fullname}` : 'Select a Course'}
                </Typography>

                {selectedCourse ? (
                  loading ? (
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                      <LinearProgress sx={{ mb: 2 }} />
                      <Typography variant="body2" color="text.secondary">
                        Loading assignments...
                      </Typography>
                    </Box>
                  ) : assignments.length === 0 ? (
                    <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
                      <AssignmentIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                      <Typography variant="h6" gutterBottom>
                        No assignments found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        This course doesn't have any assignments yet.
                      </Typography>
                    </Paper>
                  ) : (
                    <List>
                      {assignments.map((assignment) => (
                        <ListItem
                          key={assignment.id}
                          sx={{
                            border: '1px solid',
                            borderColor: 'grey.200',
                            borderRadius: 2,
                            mb: 2,
                            flexDirection: 'column',
                            alignItems: 'stretch',
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', p: 1 }}>
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography variant="subtitle1" fontWeight={600}>
                                {assignment.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                {assignment.intro ? assignment.intro.substring(0, 100) + '...' : 'No description'}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Chip
                                  size="small"
                                  label={`${assignment.grade} points`}
                                  color="primary"
                                  variant="outlined"
                                />
                                {assignment.duedate > 0 && (
                                  <Chip
                                    size="small"
                                    label={`Due: ${new Date(assignment.duedate * 1000).toLocaleDateString()}`}
                                    color="secondary"
                                    variant="outlined"
                                  />
                                )}
                                <Chip
                                  size="small"
                                  label="Active"
                                  color="success"
                                  variant="outlined"
                                />
                              </Box>
                            </Box>
                            <IconButton
                              size="small"
                              onClick={(e) => handleMenuOpen(e, assignment)}
                            >
                              <MoreIcon />
                            </IconButton>
                          </Box>
                        </ListItem>
                      ))}
                    </List>
                  )
                ) : (
                  <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
                    <CourseIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Select a Course
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Choose a course from the left to view its assignments.
                    </Typography>
                  </Paper>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {connectionStatus === 'error' && (
        <Paper sx={{ p: 6, textAlign: 'center', bgcolor: 'grey.50' }}>
          <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Moodle Integration Not Available
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Please configure your Moodle API key in the settings to use this feature.
          </Typography>
          <Button variant="contained" href="/settings">
            Go to Settings
          </Button>
        </Paper>
      )}

      {/* Assignment Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => selectedAssignment && startGradingJob(selectedAssignment.id)}>
          <AssignmentIcon sx={{ mr: 1 }} />
          Start Auto-Grading
        </MenuItem>
        <MenuItem onClick={() => selectedAssignment && exportSubmissions(selectedAssignment.id)}>
          <DownloadIcon sx={{ mr: 1 }} />
          Export Submissions
        </MenuItem>
      </Menu>
    </Container>
  );
};

export default MoodleIntegration; 