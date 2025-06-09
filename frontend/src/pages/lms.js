import { useState, useEffect } from 'react';
import { 
  Box, Button, Card, CardContent, Container, Typography, TextField, 
  FormControl, InputLabel, Select, MenuItem, CircularProgress,
  Alert, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Link, InputAdornment, IconButton,
  Chip, Divider, Checkbox, TablePagination, Grid, Accordion,
  AccordionSummary, AccordionDetails, Stepper, Step, StepLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, Slider,
  List, ListItem, ListItemText, ListItemIcon, FormHelperText,
  Tab, Tabs
} from '@mui/material';
import TabPanel from '@mui/lab/TabPanel';
import TabContext from '@mui/lab/TabContext';
import TabList from '@mui/lab/TabList';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import SyncIcon from '@mui/icons-material/Sync';
import GradeIcon from '@mui/icons-material/Grade';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import SchoolIcon from '@mui/icons-material/School';
import { useRouter } from 'next/router';
import axios from 'axios';
import { normalizeCanvasUrl } from '../utils/canvas';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Tooltip from '@mui/material/Tooltip';
import DownloadIcon from '@mui/icons-material/Download';
import GetAppIcon from '@mui/icons-material/GetApp';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

const LMSPage = () => {
  const router = useRouter();
  
  // Platform selection
  const [selectedPlatform, setSelectedPlatform] = useState('canvas');
  
  // Common states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  
  // Canvas-specific states
  const [canvasApiKey, setCanvasApiKey] = useState('');
  const [canvasUrl, setCanvasUrl] = useState('');
  
  // Moodle-specific states
  const [moodleUrl, setMoodleUrl] = useState('');
  const [moodleToken, setMoodleToken] = useState('');
  
  // Course and assignment selection (shared)
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [selectedCourseName, setSelectedCourseName] = useState('');
  const [selectedAssignmentName, setSelectedAssignmentName] = useState('');
  
  // Workflow states (shared)
  const [currentStep, setCurrentStep] = useState(0); // 0: connect, 1: select-course, 2: sync, 3: select, 4: grade, 5: results
  const [activeView, setActiveView] = useState('connect');
  const [showApiKey, setShowApiKey] = useState(false);
  
  // Sync-related states (shared)
  const [syncJobId, setSyncJobId] = useState('');
  const [syncedSubmissions, setSyncedSubmissions] = useState([]);
  const [syncSummary, setSyncSummary] = useState(null);
  
  // Selection states (shared)
  const [selectedSubmissions, setSelectedSubmissions] = useState(new Set());
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Grading states (shared)
  const [rubrics, setRubrics] = useState([]);
  const [selectedRubric, setSelectedRubric] = useState('');
  const [strictness, setStrictness] = useState(0.5);
  const [gradingInProgress, setGradingInProgress] = useState(false);
  const [gradingJobId, setGradingJobId] = useState('');
  
  // Results states (shared)
  const [gradingResults, setGradingResults] = useState([]);
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Fetch rubrics on mount
  useEffect(() => {
    fetchRubrics();
  }, []);

  const fetchRubrics = async () => {
    try {
      const response = await axios.get('/rubrics');
      if (response.data && response.data.rubrics) {
        setRubrics(response.data.rubrics);
      }
    } catch (err) {
      console.error('Error fetching rubrics:', err);
    }
  };

  // Reset connection when platform changes
  useEffect(() => {
    setConnected(false);
    setCurrentStep(0);
    setActiveView('connect');
    setError(null);
    setCourses([]);
    setAssignments([]);
    setSelectedCourseId('');
    setSelectedAssignmentId('');
  }, [selectedPlatform]);

  // Helper function to process the API key/token
  const processApiKey = (key) => {
    const cleanKey = key.replace(/^Bearer\s+/i, '').trim();
    return cleanKey;
  };

  // Platform-specific connection handlers
  const handleCanvasConnect = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const processedApiKey = processApiKey(canvasApiKey);
      
      const response = await axios.post('/api/canvas/connect', {
        api_key: processedApiKey
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.status === 'success') {
        setConnected(true);
        
        // Fetch TA courses
        await fetchCanvasCourses(processedApiKey);
        
        setCurrentStep(1);
        setActiveView('select-course');
      } else {
        setError(response.data.message || 'Failed to connect to Canvas');
      }
    } catch (err) {
      console.error('Canvas connection error:', err);
      setError(err.response?.data?.detail || err.response?.data?.message || err.message || 'An error occurred connecting to Canvas');
    } finally {
      setLoading(false);
    }
  };

  const handleMoodleConnect = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('/api/moodle/connect', {
        moodle_url: moodleUrl,
        token: moodleToken
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.status === 'success') {
        setConnected(true);
        
        // Fetch Moodle courses
        await fetchMoodleCourses();
        
        setCurrentStep(1);
        setActiveView('select-course');
      } else {
        setError(response.data.message || 'Failed to connect to Moodle');
      }
    } catch (err) {
      console.error('Moodle connection error:', err);
      setError(err.response?.data?.detail || err.response?.data?.message || err.message || 'An error occurred connecting to Moodle');
    } finally {
      setLoading(false);
    }
  };

  // Platform-specific course fetchers
  const fetchCanvasCourses = async (processedApiKey) => {
    try {
      const response = await axios.post('/api/canvas/get-ta-courses', {
        api_key: processedApiKey
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.status === 'success' && response.data.courses) {
        // Filter only active courses
        const activeCourses = response.data.courses.filter(course => 
          course.workflow_state === 'available' && 
          course.enrollments?.some(enrollment => enrollment.type === 'ta' && enrollment.enrollment_state === 'active')
        );
        setCourses(activeCourses);
        
        if (activeCourses.length > 0) {
          setSelectedCourseId(activeCourses[0].id.toString());
          setSelectedCourseName(activeCourses[0].name);
        }
      } else {
        setError(response.data.message || 'Failed to fetch TA courses');
      }
    } catch (err) {
      console.error('Error fetching Canvas courses:', err);
      setError('Failed to fetch your TA courses. Please check your API key permissions.');
    }
  };

  const fetchMoodleCourses = async () => {
    try {
      const response = await axios.post('/api/moodle/get-courses', {
        moodle_url: moodleUrl,
        token: moodleToken
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.status === 'success' && response.data.courses) {
        setCourses(response.data.courses);
        
        if (response.data.courses.length > 0) {
          setSelectedCourseId(response.data.courses[0].id.toString());
          setSelectedCourseName(response.data.courses[0].fullname);
        }
      } else {
        setError(response.data.message || 'Failed to fetch Moodle courses');
      }
    } catch (err) {
      console.error('Error fetching Moodle courses:', err);
      setError('Failed to fetch your Moodle courses. Please check your credentials.');
    }
  };

  // Platform-specific assignment fetchers
  const fetchAssignments = async () => {
    if (!selectedCourseId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let response;
      
      if (selectedPlatform === 'canvas') {
        const processedApiKey = processApiKey(canvasApiKey);
        
        console.log('Fetching assignments for course:', selectedCourseId);
        
        response = await axios.post('/api/canvas/get-assignments', {
          api_key: processedApiKey,
          course_id: parseInt(selectedCourseId)
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Assignment fetch response:', response.data);
        
        if (response.data.status === 'success' && response.data.assignments) {
          const allAssignments = response.data.assignments;
          console.log('All assignments received:', allAssignments.map(a => ({ id: a.id, name: a.name, workflow_state: a.workflow_state })));
          
          // Filter only published assignments for Canvas
          const publishedAssignments = allAssignments.filter(assignment => {
            const isPublished = assignment.published === true;
            const workflowPublished = assignment.workflow_state === 'published';
            const notUnpublished = assignment.workflow_state !== 'unpublished';
            const notDeleted = assignment.workflow_state !== 'deleted';
            
            return (isPublished && workflowPublished) || (workflowPublished && notUnpublished && notDeleted);
          });
          
          console.log('Published assignments after filtering:', publishedAssignments.map(a => ({ id: a.id, name: a.name })));
          console.log('Pagination info:', response.data.pagination_info);
          
          setAssignments(publishedAssignments);
          
          if (publishedAssignments.length > 0) {
            const firstAssignment = publishedAssignments[0];
            setSelectedAssignmentId(firstAssignment.id.toString());
            setSelectedAssignmentName(firstAssignment.name);
            console.log('Auto-selected first assignment:', { id: firstAssignment.id, name: firstAssignment.name });
          } else {
            console.warn('No published assignments found');
            setError('No published assignments found in this course');
          }
        }
      } else if (selectedPlatform === 'moodle') {
        response = await axios.post('/api/moodle/get-assignments', {
          moodle_url: moodleUrl,
          token: moodleToken,
          course_id: parseInt(selectedCourseId)
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.data.status === 'success' && response.data.assignments) {
          setAssignments(response.data.assignments);
          
          if (response.data.assignments.length > 0) {
            setSelectedAssignmentId(response.data.assignments[0].id.toString());
            setSelectedAssignmentName(response.data.assignments[0].name);
          }
        }
      }
      
      if (response.data.status !== 'success') {
        console.error('Assignment fetch failed:', response.data.message);
        setError(response.data.message || 'Failed to fetch assignments');
      }
    } catch (err) {
      console.error('Error fetching assignments:', err);
      setError('Failed to fetch assignments for this course.');
    } finally {
      setLoading(false);
    }
  };

  const handleCourseChange = (courseId) => {
    setSelectedCourseId(courseId);
    const course = courses.find(c => c.id.toString() === courseId);
    if (course) {
      setSelectedCourseName(selectedPlatform === 'canvas' ? course.name : course.fullname);
    }
    setAssignments([]);
    setSelectedAssignmentId('');
  };

  const handleAssignmentChange = (assignmentId) => {
    console.log('Assignment selection changed:', {
      selectedAssignmentId: assignmentId,
      allAssignments: assignments.map(a => ({ id: a.id, name: a.name }))
    });
    
    setSelectedAssignmentId(assignmentId);
    const assignment = assignments.find(a => a.id.toString() === assignmentId);
    if (assignment) {
      setSelectedAssignmentName(assignment.name);
      console.log('Assignment selected successfully:', {
        id: assignment.id,
        name: assignment.name
      });
    } else {
      console.error('Assignment not found in list:', {
        searchedId: assignmentId,
        availableAssignments: assignments.map(a => ({ id: a.id, name: a.name }))
      });
      setError(`Assignment with ID ${assignmentId} not found in the assignments list.`);
    }
  };

  // Platform-specific sync handlers
  const handleSyncSubmissions = async (forceSync = false) => {
    // Validation: Ensure we have the correct assignment selected
    if (!selectedAssignmentId || !selectedAssignmentName) {
      setError('Please select an assignment before syncing submissions.');
      return;
    }
    
    console.log('Starting sync for assignment:', {
      id: selectedAssignmentId,
      name: selectedAssignmentName,
      courseId: selectedCourseId,
      platform: selectedPlatform
    });
    
    // Double-check that the assignment exists in our list
    const assignment = assignments.find(a => a.id.toString() === selectedAssignmentId);
    if (!assignment) {
      setError(`Assignment with ID ${selectedAssignmentId} not found. Please refresh assignments and try again.`);
      return;
    }
    
    console.log('Assignment validation passed:', assignment);
    
    setLoading(true);
    setError(null);
    
    try {
      let response;
      
      if (selectedPlatform === 'canvas') {
        const processedApiKey = processApiKey(canvasApiKey);
        
        console.log('Sending sync request with:', {
          course_id: parseInt(selectedCourseId),
          assignment_id: parseInt(selectedAssignmentId),
          assignment_name: selectedAssignmentName
        });
        
        response = await axios.post('/api/canvas/sync-submissions', {
          api_key: processedApiKey,
          course_id: parseInt(selectedCourseId),
          assignment_id: parseInt(selectedAssignmentId),
          force_sync: forceSync
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
      } else if (selectedPlatform === 'moodle') {
        response = await axios.post('/api/moodle/sync-submissions', {
          moodle_url: moodleUrl,
          token: moodleToken,
          course_id: parseInt(selectedCourseId),
          assignment_id: parseInt(selectedAssignmentId),
          force_sync: forceSync
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
      
      console.log('Sync response:', response.data);
      
      if (response.data.status === 'success') {
        setSyncJobId(response.data.sync_job_id);
        setSyncSummary(response.data.summary);
        setSyncedSubmissions(response.data.summary.submissions);
        setCurrentStep(3);
        setActiveView('select');
      } else {
        setError(response.data.message || 'Failed to sync submissions');
      }
    } catch (err) {
      console.error('Error syncing submissions:', err);
      setError(err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to sync submissions');
    } finally {
      setLoading(false);
    }
  };

  // Platform-specific grading handlers
  const handleGradeSubmissions = async () => {
    if (selectedSubmissions.size === 0) {
      setError('Please select at least one submission to grade');
      return;
    }
    
    setGradingInProgress(true);
    setError(null);
    
    try {
      let response;
      
      if (selectedPlatform === 'canvas') {
        response = await axios.post('/api/canvas/grade-selected-submissions', {
          sync_job_id: syncJobId,
          selected_user_ids: Array.from(selectedSubmissions),
          rubric_id: selectedRubric || undefined,
          strictness: strictness
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
      } else if (selectedPlatform === 'moodle') {
        response = await axios.post('/api/moodle/grade-selected-submissions', {
          sync_job_id: syncJobId,
          selected_user_ids: Array.from(selectedSubmissions),
          rubric_id: selectedRubric || undefined,
          strictness: strictness
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
      
      if (response.data.status === 'success') {
        setGradingJobId(response.data.grading_job_id);
        setGradingResults(response.data.results);
        setCurrentStep(5);
        setActiveView('results');
      } else {
        setError(response.data.message || 'Failed to grade submissions');
      }
    } catch (err) {
      console.error('Error grading submissions:', err);
      setError(err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to grade submissions');
    } finally {
      setGradingInProgress(false);
    }
  };

  const handleSelectSubmission = (userId) => {
    const newSelected = new Set(selectedSubmissions);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedSubmissions(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedSubmissions.size === syncedSubmissions.length) {
      setSelectedSubmissions(new Set());
    } else {
      setSelectedSubmissions(new Set(syncedSubmissions.map(s => s.user_id)));
    }
  };

  // Add function to fetch grading results
  const fetchGradingResults = async () => {
    if (!selectedCourseId || !selectedAssignmentId) {
      setError('Please select a course and assignment first');
      return;
    }
    
    setResultsLoading(true);
    setError(null);
    
    try {
      const processedApiKey = processApiKey(canvasApiKey);
      
      console.log('Fetching grading results for:', {
        course_id: selectedCourseId,
        assignment_id: selectedAssignmentId,
        assignment_name: selectedAssignmentName
      });
      
      const response = await axios.post('/api/canvas/get-grading-results', {
        api_key: processedApiKey,
        course_id: parseInt(selectedCourseId),
        assignment_id: parseInt(selectedAssignmentId)
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Grading results response:', response.data);
      
      if (response.data.success && response.data.data) {
        setGradingResults(response.data.data.results || []);
        setShowResults(true);
        setCurrentStep(4); // New step for results
        setActiveView('results');
      } else {
        setError(response.data.message || 'Failed to fetch grading results');
      }
    } catch (err) {
      console.error('Error fetching grading results:', err);
      setError(err.response?.data?.message || 'Failed to fetch grading results');
    } finally {
      setResultsLoading(false);
    }
  };

  // Add function to grade selected students
  const gradeSelectedStudents = async () => {
    if (!selectedCourseId || !selectedAssignmentId) {
      setError('Please select a course and assignment first');
      return;
    }
    
    setResultsLoading(true);
    setError(null);
    
    try {
      const processedApiKey = processApiKey(canvasApiKey);
      
      console.log('Starting grading for selected students:', {
        course_id: selectedCourseId,
        assignment_id: selectedAssignmentId,
        assignment_name: selectedAssignmentName
      });
      
      const response = await axios.post('/api/canvas/grade-selected-students', {
        api_key: processedApiKey,
        course_id: parseInt(selectedCourseId),
        assignment_id: parseInt(selectedAssignmentId)
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Grading response:', response.data);
      
      if (response.data.success) {
        setAlert({
          type: 'success',
          message: response.data.message || 'Grading completed successfully!'
        });
        
        // Automatically refresh results after grading
        setTimeout(() => {
          fetchGradingResults();
        }, 2000);
      } else {
        setError(response.data.message || 'Failed to grade selected students');
      }
    } catch (err) {
      console.error('Error grading selected students:', err);
      setError(err.response?.data?.message || 'Failed to grade selected students');
    } finally {
      setResultsLoading(false);
    }
  };

  // Render platform selection
  const renderPlatformSelection = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Select LMS Platform
        </Typography>
        <TabContext value={selectedPlatform}>
          <TabList onChange={(e, newValue) => setSelectedPlatform(newValue)} centered>
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SchoolIcon />
                  Canvas
                </Box>
              } 
              value="canvas" 
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SchoolIcon />
                  Moodle
                </Box>
              } 
              value="moodle" 
            />
          </TabList>
        </TabContext>
      </CardContent>
    </Card>
  );

  // Render connection screen
  const renderConnectScreen = () => (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Connect to {selectedPlatform === 'canvas' ? 'Canvas' : 'Moodle'}
        </Typography>
        
        {selectedPlatform === 'canvas' ? (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              Enter your Canvas API key to connect. You can find this in your Canvas account settings under "Approved Integrations".
            </Alert>
            
            <TextField
              label="Canvas API Key"
              type={showApiKey ? 'text' : 'password'}
              value={canvasApiKey}
              onChange={(e) => setCanvasApiKey(e.target.value)}
              fullWidth
              margin="normal"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowApiKey(!showApiKey)}
                      edge="end"
                    >
                      {showApiKey ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </>
        ) : (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              Enter your Moodle URL and token to connect. You can generate a token in your Moodle site under "Web services".
            </Alert>
            
            <TextField
              label="Moodle URL"
              value={moodleUrl}
              onChange={(e) => setMoodleUrl(e.target.value)}
              fullWidth
              margin="normal"
              placeholder="https://your-moodle-site.com"
            />
            
            <TextField
              label="Moodle Token"
              type={showApiKey ? 'text' : 'password'}
              value={moodleToken}
              onChange={(e) => setMoodleToken(e.target.value)}
              fullWidth
              margin="normal"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowApiKey(!showApiKey)}
                      edge="end"
                    >
                      {showApiKey ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        
        <Button
          variant="contained"
          onClick={selectedPlatform === 'canvas' ? handleCanvasConnect : handleMoodleConnect}
          disabled={loading || (selectedPlatform === 'canvas' ? !canvasApiKey : (!moodleUrl || !moodleToken))}
          sx={{ mt: 2 }}
          fullWidth
        >
          {loading ? <CircularProgress size={24} /> : `Connect to ${selectedPlatform === 'canvas' ? 'Canvas' : 'Moodle'}`}
        </Button>
      </CardContent>
    </Card>
  );

  // Course selection screen
  const renderCourseSelectionScreen = () => (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Select Course and Assignment
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Course</InputLabel>
              <Select
                value={selectedCourseId}
                onChange={(e) => handleCourseChange(e.target.value)}
                label="Course"
              >
                {courses.map((course) => (
                  <MenuItem key={course.id} value={course.id.toString()}>
                    {selectedPlatform === 'canvas' ? course.name : course.fullname}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {courses.length} course(s) found (loaded with pagination)
              </FormHelperText>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Assignment</InputLabel>
              <Select
                value={selectedAssignmentId}
                onChange={(e) => handleAssignmentChange(e.target.value)}
                label="Assignment"
                disabled={!selectedCourseId}
              >
                {assignments.map((assignment) => (
                  <MenuItem key={assignment.id} value={assignment.id.toString()}>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="body1">{assignment.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        ID: {assignment.id} | State: {assignment.workflow_state}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {selectedCourseId ? `${assignments.length} published assignment(s) in course (loaded with per_page=50&page=1)` : 'Select a course first'}
                {selectedAssignmentId && (
                  <Box component="span" sx={{ display: 'block', mt: 0.5, color: 'primary.main' }}>
                    Selected: {selectedAssignmentName} (ID: {selectedAssignmentId})
                  </Box>
                )}
              </FormHelperText>
            </FormControl>
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            onClick={fetchAssignments}
            disabled={!selectedCourseId || loading}
            startIcon={loading ? <CircularProgress size={20} /> : <SyncIcon />}
          >
            {loading ? 'Loading...' : 'Load Assignments'}
          </Button>
          
          {/* Debug button for testing assignment fetching */}
          <Button
            variant="outlined"
            color="secondary"
            onClick={async () => {
              if (!selectedCourseId) return;
              
              try {
                const processedApiKey = processApiKey(canvasApiKey);
                const response = await axios.post('/api/canvas/debug-assignments', {
                  api_key: processedApiKey,
                  course_id: parseInt(selectedCourseId)
                });
                console.log('Debug response:', response.data);
                alert(`Debug results: ${JSON.stringify(response.data, null, 2)}`);
              } catch (error) {
                console.error('Debug error:', error);
                alert(`Debug error: ${error.message}`);
              }
            }}
            disabled={!selectedCourseId}
          >
            Debug Assignments
          </Button>
          
          {/* Button to fetch grading results */}
          {selectedAssignmentId && (
            <Button
              variant="contained"
              color="primary"
              onClick={fetchGradingResults}
              disabled={resultsLoading}
              startIcon={resultsLoading ? <CircularProgress size={20} /> : <VisibilityIcon />}
            >
              {resultsLoading ? 'Loading Results...' : 'View Grading Results'}
            </Button>
          )}
          
          {/* Button to grade selected students */}
          {selectedAssignmentId && (
            <Button
              variant="contained"
              color="success"
              onClick={gradeSelectedStudents}
              disabled={resultsLoading}
              startIcon={resultsLoading ? <CircularProgress size={20} /> : <PlayArrowIcon />}
            >
              {resultsLoading ? 'Grading...' : 'Grade Selected Students (PDF Only)'}
            </Button>
          )}
          
          <Button
            variant="contained"
            onClick={() => {
              setCurrentStep(2);
              setActiveView('sync');
            }}
            disabled={!selectedAssignmentId}
            startIcon={<AssignmentIcon />}
          >
            Continue to Sync
          </Button>
        </Box>
        
        {/* Selection Summary */}
        {selectedCourseId && selectedAssignmentId && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Current Selection:</strong><br/>
              Course: {selectedCourseName} (ID: {selectedCourseId})<br/>
              Assignment: {selectedAssignmentName} (ID: {selectedAssignmentId})
            </Typography>
          </Alert>
        )}
        
        {/* PDF Grading Info */}
        {selectedAssignmentId && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Grading Information:</strong><br/>
              • Only <strong>PDF files</strong> are currently supported for AI grading<br/>
              • Non-PDF files (code, images, etc.) will show "Coming Soon" status<br/>
              • Only <strong>selected students</strong> will be graded (not all students)<br/>
              • Files are downloaded directly from Canvas using submission URLs
            </Typography>
          </Alert>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  // Sync screen
  const renderSyncScreen = () => (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Sync Submissions
        </Typography>
        
        <Alert severity="info" sx={{ mb: 2 }}>
          Ready to sync submissions from <strong>{selectedPlatform === 'canvas' ? 'Canvas' : 'Moodle'}</strong> assignment: <strong>{selectedAssignmentName}</strong>
        </Alert>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            onClick={() => handleSyncSubmissions(false)}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <SyncIcon />}
          >
            {loading ? 'Syncing...' : 'Sync Submissions'}
          </Button>
          
          <Button
            variant="outlined"
            onClick={() => handleSyncSubmissions(true)}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <SyncIcon />}
          >
            Force Re-sync
          </Button>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  // Selection screen with submission table
  const renderSelectionScreen = () => {
    const displayedSubmissions = syncedSubmissions.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );

    const getStatusInfo = (submission) => {
      const syncStatus = submission.sync_status;
      const submissionStatus = submission.status;
      
      if (syncStatus === 'synced') {
        return { label: 'Ready for AI Grading', color: 'success', description: 'Files downloaded and ready' };
      } else if (syncStatus === 'no_files') {
        return { label: 'No Files - Status Grade', color: 'info', description: 'No file attachments' };
      } else if (submissionStatus === 'draft' || submissionStatus === 'unsubmitted') {
        return { label: 'Not Submitted', color: 'warning', description: 'Not submitted by student' };
      } else if (syncStatus === 'failed') {
        return { label: 'Download Failed', color: 'error', description: 'Failed to download files' };
      } else {
        return { label: 'Available for Grading', color: 'default', description: 'Can be processed' };
      }
    };

    return (
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Select Submissions to Grade
          </Typography>
          
          {syncSummary && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Found {syncSummary.total_submissions} submission(s) from {selectedPlatform === 'canvas' ? 'Canvas' : 'Moodle'}. 
              Ready to grade {syncSummary.successful_syncs} with files, plus {syncSummary.no_files} without files (will receive appropriate feedback).
            </Alert>
          )}
          
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Comprehensive Grading Approach:</strong><br/>
              • <strong>AI Grading:</strong> Submissions with readable files will be graded by AI<br/>
              • <strong>Status-Based Grading:</strong> Submissions without files will receive contextual feedback<br/>
              • <strong>100% Coverage:</strong> All selected submissions will be processed appropriately
            </Typography>
          </Alert>
          
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              variant={selectedSubmissions.size === syncedSubmissions.length ? 'contained' : 'outlined'}
              onClick={handleSelectAll}
              size="small"
            >
              {selectedSubmissions.size === syncedSubmissions.length ? 'Deselect All' : 'Select All'}
            </Button>
            
            <Typography variant="body2">
              {selectedSubmissions.size} of {syncedSubmissions.length} selected
            </Typography>
          </Box>
          
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedSubmissions.size === syncedSubmissions.length && syncedSubmissions.length > 0}
                      indeterminate={selectedSubmissions.size > 0 && selectedSubmissions.size < syncedSubmissions.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell>Student</TableCell>
                  <TableCell>Grading Status</TableCell>
                  <TableCell>Files</TableCell>
                  <TableCell>Submitted</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayedSubmissions.map((submission) => {
                  const statusInfo = getStatusInfo(submission);
                  const isSelected = selectedSubmissions.has(submission.user_id);
                  
                  return (
                    <TableRow 
                      key={submission.user_id}
                      selected={isSelected}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleSelectSubmission(submission.user_id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {submission.user_name || `User ${submission.user_id}`}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={statusInfo.label}
                          color={statusInfo.color}
                          size="small"
                          title={statusInfo.description}
                        />
                      </TableCell>
                      <TableCell>
                        {submission.downloaded_files?.length || 0} files
                      </TableCell>
                      <TableCell>
                        {submission.submitted_at 
                          ? new Date(submission.submitted_at * 1000).toLocaleDateString()
                          : 'Not submitted'
                        }
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            component="div"
            count={syncedSubmissions.length}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
          
          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              onClick={() => {
                setCurrentStep(4);
                setActiveView('grade');
              }}
              disabled={selectedSubmissions.size === 0}
              startIcon={<GradeIcon />}
            >
              Grade Selected ({selectedSubmissions.size})
            </Button>
          </Box>
          
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  // Grading configuration screen
  const renderGradingScreen = () => (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Configure Grading
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Rubric (Optional)</InputLabel>
              <Select
                value={selectedRubric}
                onChange={(e) => setSelectedRubric(e.target.value)}
                label="Rubric (Optional)"
              >
                <MenuItem value="">
                  <em>Use Default Rubric</em>
                </MenuItem>
                {rubrics.map((rubric) => (
                  <MenuItem key={rubric.id} value={rubric.id}>
                    {rubric.name} ({rubric.criteria?.length || 0} criteria)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography gutterBottom>
              Grading Strictness: {strictness}
            </Typography>
            <Slider
              value={strictness}
              onChange={(e, newValue) => setStrictness(newValue)}
              min={0}
              max={1}
              step={0.1}
              marks={[
                { value: 0, label: 'Lenient' },
                { value: 0.5, label: 'Balanced' },
                { value: 1, label: 'Strict' }
              ]}
            />
          </Grid>
        </Grid>
        
        <Alert severity="info" sx={{ my: 2 }}>
          {selectedSubmissions.size} submission(s) will be graded using {selectedPlatform === 'canvas' ? 'Canvas' : 'Moodle'} data.
          {selectedRubric ? ` Using custom rubric.` : ` Using default rubric.`}
        </Alert>
        
        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            onClick={handleGradeSubmissions}
            disabled={gradingInProgress}
            startIcon={gradingInProgress ? <CircularProgress size={20} /> : <GradeIcon />}
          >
            {gradingInProgress ? 'Grading...' : 'Start Grading'}
          </Button>
          
          <Button
            variant="outlined"
            onClick={() => {
              setCurrentStep(3);
              setActiveView('select');
            }}
            disabled={gradingInProgress}
          >
            Back to Selection
          </Button>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  // Render results screen
  const renderResultsScreen = () => {
    if (gradingResults.length === 0) {
      return (
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Grading Results
            </Typography>
            <Alert severity="info">
              No grading results found. Make sure you have graded some submissions first.
            </Alert>
            <Box sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                onClick={() => {
                  setCurrentStep(3);
                  setActiveView('select');
                }}
                startIcon={<ArrowBackIcon />}
              >
                Back to Selection
              </Button>
            </Box>
          </CardContent>
        </Card>
      );
    }

    // Calculate summary statistics
    const totalStudents = gradingResults.length;
    const gradedStudents = gradingResults.filter(r => r.status === 'graded').length;
    const failedStudents = gradingResults.filter(r => r.status === 'failed').length;
    const comingSoonStudents = gradingResults.filter(r => r.status === 'updating_coming_soon').length;
    const averageScore = gradedStudents > 0 
      ? (gradingResults.filter(r => r.status === 'graded').reduce((sum, r) => sum + r.percentage, 0) / gradedStudents).toFixed(1)
      : 0;

    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" gutterBottom>
              Grading Results - {selectedAssignmentName}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={fetchGradingResults}
                startIcon={<SyncIcon />}
                disabled={resultsLoading}
              >
                {resultsLoading ? 'Refreshing...' : 'Refresh Results'}
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setCurrentStep(3);
                  setActiveView('select');
                }}
                startIcon={<ArrowBackIcon />}
              >
                Back to Selection
              </Button>
            </Box>
          </Box>

          {/* Summary Statistics */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={2.4}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.50' }}>
                <Typography variant="h4" color="primary.main">
                  {totalStudents}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Students
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={2.4}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.50' }}>
                <Typography variant="h4" color="success.main">
                  {gradedStudents}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Graded (PDF)
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={2.4}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.50' }}>
                <Typography variant="h4" color="warning.main">
                  {comingSoonStudents}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Coming Soon
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={2.4}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.50' }}>
                <Typography variant="h4" color="error.main">
                  {failedStudents}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Failed
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={2.4}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.50' }}>
                <Typography variant="h4" color="info.main">
                  {averageScore}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Average Score
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Results Table */}
          <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Student</TableCell>
                  <TableCell>Score</TableCell>
                  <TableCell>Percentage</TableCell>
                  <TableCell>Letter Grade</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Files</TableCell>
                  <TableCell>Feedback Preview</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {gradingResults.map((result) => (
                  <TableRow key={result.student_id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {result.student_name}
                        </Typography>
                        {result.student_email && (
                          <Typography variant="caption" color="text.secondary">
                            {result.student_email}
                          </Typography>
                        )}
                        {result.late && (
                          <Chip label="Late" color="warning" size="small" sx={{ mt: 0.5 }} />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {result.score}/{result.total_points}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${result.percentage}%`}
                        color={
                          result.percentage >= 90 ? 'success' :
                          result.percentage >= 80 ? 'info' :
                          result.percentage >= 70 ? 'warning' : 'error'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={result.letter_grade}
                        color={
                          result.letter_grade === 'A' ? 'success' :
                          result.letter_grade === 'B' ? 'info' :
                          result.letter_grade === 'C' ? 'warning' : 'error'
                        }
                        variant="outlined"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          result.status === 'graded' ? 'Graded' :
                          result.status === 'failed' ? 'Failed' :
                          result.status === 'ready' ? 'Ready' :
                          result.status === 'updating_coming_soon' ? 'Coming Soon' :
                          'Pending'
                        }
                        color={
                          result.status === 'graded' ? 'success' :
                          result.status === 'failed' ? 'error' :
                          result.status === 'ready' ? 'info' :
                          result.status === 'updating_coming_soon' ? 'warning' :
                          'default'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {result.files_count} file{result.files_count !== 1 ? 's' : ''}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 250 }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap' 
                        }}
                      >
                        {result.feedback_preview || 'No feedback available'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="View Full Feedback">
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => {
                              setSelectedResult(result);
                              setResultsDialogOpen(true);
                            }}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                        {result.files_count > 0 && (
                          <Tooltip title="Download Files">
                            <IconButton size="small" color="secondary">
                              <DownloadIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Action Buttons */}
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button variant="outlined" startIcon={<GetAppIcon />}>
              Export Results
            </Button>
            <Button variant="contained" color="success" startIcon={<CloudUploadIcon />}>
              Post Grades to Canvas
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  };

  // Add results dialog for viewing detailed feedback
  const renderResultsDialog = () => (
    <Dialog
      open={resultsDialogOpen}
      onClose={() => setResultsDialogOpen(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Detailed Feedback - {selectedResult?.student_name}
      </DialogTitle>
      <DialogContent>
        {selectedResult && (
          <Box sx={{ pt: 1 }}>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Score</Typography>
                <Typography variant="h6">
                  {selectedResult.score}/{selectedResult.total_points} ({selectedResult.percentage}%)
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Letter Grade</Typography>
                <Typography variant="h6">{selectedResult.letter_grade}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                <Chip 
                  label={selectedResult.status} 
                  color={selectedResult.status === 'graded' ? 'success' : 'error'}
                  size="small"
                />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Files Submitted</Typography>
                <Typography variant="body1">{selectedResult.files_count}</Typography>
              </Grid>
            </Grid>
            
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              AI Feedback
            </Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {selectedResult.feedback}
              </Typography>
            </Paper>
            
            {selectedResult.criteria_scores && selectedResult.criteria_scores.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Criteria Breakdown
                </Typography>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Criterion</TableCell>
                        <TableCell>Points</TableCell>
                        <TableCell>Feedback</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedResult.criteria_scores.map((criterion, index) => (
                        <TableRow key={index}>
                          <TableCell>{criterion.name}</TableCell>
                          <TableCell>{criterion.points}/{criterion.max_points}</TableCell>
                          <TableCell>{criterion.feedback}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setResultsDialogOpen(false)}>Close</Button>
      </DialogActions>
    </Dialog>
  );

  // Workflow stepper
  const steps = ['Connect', 'Select Course', 'Sync', 'Select Students', 'Grade', 'Results'];

  const renderContent = () => {
    if (!selectedPlatform) {
      return renderPlatformSelection();
    }

    if (activeView === 'platform') {
      return renderPlatformSelection();
    }

    if (activeView === 'courses') {
      return renderCoursesScreen();
    }

    if (activeView === 'assignments') {
      return renderAssignmentsScreen();
    }

    if (activeView === 'submissions') {
      return renderSubmissionsScreen();
    }

    if (activeView === 'select') {
      return renderSelectionScreen();
    }

    if (activeView === 'progress') {
      return renderProgressScreen();
    }

    if (activeView === 'results') {
      return renderResultsScreen();
    }

    // Default view based on current step
    switch (currentStep) {
      case 1:
        return renderCoursesScreen();
      case 2:
        return renderAssignmentsScreen();
      case 3:
        return renderSubmissionsScreen();
      case 4:
        return renderResultsScreen();
      default:
        return renderPlatformSelection();
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        LMS Integration - Canvas & Moodle
      </Typography>
      
      {/* Platform Selection */}
      {renderPlatformSelection()}
      
      {/* Workflow Stepper */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stepper activeStep={currentStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>
      
      {/* Main Content */}
      {renderContent()}
      
      {/* Results Detail Dialog */}
      {renderResultsDialog()}
    </Container>
  );
};

export default LMSPage; 