import { useState, useEffect } from 'react';
import { 
  Box, Button, Card, CardContent, Container, Typography, TextField, 
  FormControl, InputLabel, Select, MenuItem, CircularProgress,
  Alert, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Link, InputAdornment, IconButton,
  Chip, Divider, Checkbox, TablePagination, Grid, Accordion,
  AccordionSummary, AccordionDetails, Stepper, Step, StepLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, Slider,
  List, ListItem, ListItemText, ListItemIcon, FormHelperText
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import SyncIcon from '@mui/icons-material/Sync';
import GradeIcon from '@mui/icons-material/Grade';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { useRouter } from 'next/router';
import axios from 'axios';
import { normalizeCanvasUrl } from '../utils/canvas';

const CanvasPage = () => {
  const router = useRouter();
  const [apiKey, setApiKey] = useState('');
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Course and assignment selection
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [selectedCourseName, setSelectedCourseName] = useState('');
  const [selectedAssignmentName, setSelectedAssignmentName] = useState('');
  
  // Workflow states
  const [currentStep, setCurrentStep] = useState(0); // 0: connect, 1: select-course, 2: sync, 3: select, 4: grade, 5: results
  const [activeView, setActiveView] = useState('connect');
  const [showApiKey, setShowApiKey] = useState(false);
  
  // Sync-related states
  const [syncJobId, setSyncJobId] = useState('');
  const [syncedSubmissions, setSyncedSubmissions] = useState([]);
  const [syncSummary, setSyncSummary] = useState(null);
  
  // Selection states
  const [selectedSubmissions, setSelectedSubmissions] = useState(new Set());
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Grading states
  const [rubrics, setRubrics] = useState([]);
  const [selectedRubric, setSelectedRubric] = useState('');
  const [strictness, setStrictness] = useState(0.5);
  const [gradingInProgress, setGradingInProgress] = useState(false);
  const [gradingJobId, setGradingJobId] = useState('');
  
  // Results states
  const [gradingResults, setGradingResults] = useState([]);
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);

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

  // Helper function to process the API key/token
  const processApiKey = (key) => {
    const cleanKey = key.replace(/^Bearer\s+/i, '').trim();
    return cleanKey;
  };

  // Connect to Canvas and fetch TA courses
  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const processedApiKey = processApiKey(apiKey);
      
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
        await fetchTACourses(processedApiKey);
        
        setCurrentStep(1);
        setActiveView('select-course');
      } else {
        setError(response.data.message || 'Failed to connect to Canvas');
      }
    } catch (err) {
      console.error('Canvas connection error:', err);
      setError(err.response?.data?.message || err.message || 'An error occurred connecting to Canvas');
    } finally {
      setLoading(false);
    }
  };

  // Fetch TA courses from Canvas through backend
  const fetchTACourses = async (processedApiKey) => {
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
      console.error('Error fetching TA courses:', err);
      setError('Failed to fetch your TA courses. Please check your API key permissions.');
    }
  };

  // Fetch assignments for selected course
  const fetchAssignments = async () => {
    if (!selectedCourseId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const processedApiKey = processApiKey(apiKey);
      
      const response = await axios.post('/api/canvas/get-assignments', {
        api_key: processedApiKey,
        course_id: parseInt(selectedCourseId)
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.status === 'success' && response.data.assignments) {
        // Filter only published assignments
        const publishedAssignments = response.data.assignments.filter(assignment => 
          assignment.published === true && assignment.workflow_state === 'published'
        );
        setAssignments(publishedAssignments);
        
        if (publishedAssignments.length > 0) {
          setSelectedAssignmentId(publishedAssignments[0].id.toString());
          setSelectedAssignmentName(publishedAssignments[0].name);
        }
      } else {
        setError(response.data.message || 'Failed to fetch assignments');
      }
    } catch (err) {
      console.error('Error fetching assignments:', err);
      setError('Failed to fetch assignments for this course.');
    } finally {
      setLoading(false);
    }
  };

  // Handle course selection
  const handleCourseChange = (courseId) => {
    setSelectedCourseId(courseId);
    const course = courses.find(c => c.id.toString() === courseId);
    if (course) {
      setSelectedCourseName(course.name);
    }
    setAssignments([]);
    setSelectedAssignmentId('');
    setSelectedAssignmentName('');
  };

  // Handle assignment selection
  const handleAssignmentChange = (assignmentId) => {
    setSelectedAssignmentId(assignmentId);
    const assignment = assignments.find(a => a.id.toString() === assignmentId);
    if (assignment) {
      setSelectedAssignmentName(assignment.name);
    }
  };

  // Sync submissions from Canvas
  const handleSyncSubmissions = async (forceSync = false) => {
    if (!selectedCourseId || !selectedAssignmentId) {
      setError('Please select a course and assignment first');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const processedApiKey = processApiKey(apiKey);
      
      const response = await axios.post('/api/canvas/sync-submissions', {
        api_key: processedApiKey,
        course_id: parseInt(selectedCourseId),
        assignment_id: parseInt(selectedAssignmentId),
        force_sync: forceSync
      });
      
      if (response.data.status === 'success') {
        setSyncJobId(response.data.sync_job_id);
        setSyncSummary(response.data.summary);
        setSyncedSubmissions(response.data.summary.submissions || []);
        setCurrentStep(3);
        setActiveView('select');
        
        // Show different message based on whether it was existing data or fresh sync
        if (response.data.is_existing_data) {
          console.log('Using existing sync data');
        } else if (response.data.was_forced) {
          console.log('Force synced - overwrote existing data');
        } else {
          console.log('Fresh sync completed');
        }
      } else {
        setError(response.data.message || 'Failed to sync submissions');
      }
    } catch (err) {
      console.error('Sync error:', err);
      setError(err.response?.data?.message || err.message || 'An error occurred syncing submissions');
    } finally {
      setLoading(false);
    }
  };
  
  // Grade selected submissions
  const handleGradeSubmissions = async () => {
    if (selectedSubmissions.size === 0) {
      setError('Please select at least one submission to grade');
      return;
    }

    setGradingInProgress(true);
    setLoading(true);
    setError(null);
    
    try {
      const selectedUserIds = Array.from(selectedSubmissions);
      
      const response = await axios.post('/api/canvas/grade-selected-submissions', {
        sync_job_id: syncJobId,
        selected_user_ids: selectedUserIds,
        rubric_id: selectedRubric || null,
        strictness: strictness
      });
      
      if (response.data.status === 'success') {
        setGradingJobId(response.data.grading_job_id);
        setGradingResults(response.data.results || []);
        setCurrentStep(5);
        setActiveView('results');
      } else {
        setError(response.data.message || 'Failed to grade submissions');
      }
    } catch (err) {
      console.error('Grading error:', err);
      setError(err.response?.data?.message || err.message || 'An error occurred grading submissions');
    } finally {
      setLoading(false);
      setGradingInProgress(false);
    }
  };

  // Handle submission selection
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
    const validSubmissions = syncedSubmissions.filter(s => s.sync_status === 'synced');
    if (selectedSubmissions.size === validSubmissions.length) {
      setSelectedSubmissions(new Set());
      } else {
      setSelectedSubmissions(new Set(validSubmissions.map(s => s.user_id)));
    }
  };

  // Render course and assignment selection screen
  const renderCourseSelectionScreen = () => (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Select Course and Assignment
        </Typography>
        
        <Typography variant="body1" paragraph>
          Choose the course and assignment you want to grade.
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="course-select-label">Select Course</InputLabel>
              <Select
                labelId="course-select-label"
                value={selectedCourseId}
                label="Select Course"
                onChange={(e) => handleCourseChange(e.target.value)}
                disabled={loading}
              >
                {courses.map((course) => (
                  <MenuItem key={course.id} value={course.id.toString()}>
                    {course.name}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {courses.length} TA course(s) found
              </FormHelperText>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="assignment-select-label">Select Assignment</InputLabel>
              <Select
                labelId="assignment-select-label"
                value={selectedAssignmentId}
                label="Select Assignment"
                onChange={(e) => handleAssignmentChange(e.target.value)}
                disabled={loading || !selectedCourseId}
              >
                {assignments.map((assignment) => (
                  <MenuItem key={assignment.id} value={assignment.id.toString()}>
                    {assignment.name}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {selectedCourseId ? `${assignments.length} assignment(s) in course` : 'Select a course first'}
              </FormHelperText>
            </FormControl>
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 3 }}>
          <Button 
            variant="outlined" 
            onClick={fetchAssignments}
            disabled={loading || !selectedCourseId}
            startIcon={loading ? <CircularProgress size={20} /> : <SyncIcon />}
            sx={{ mr: 2 }}
          >
            {loading ? 'Loading...' : 'Load Assignments'}
          </Button>
          
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => {
              setCurrentStep(2);
              setActiveView('sync');
            }}
            disabled={!selectedCourseId || !selectedAssignmentId}
            size="large"
          >
            Continue to Sync
          </Button>
        </Box>
        
        {selectedCourseId && selectedAssignmentId && (
          <Paper sx={{ mt: 3, p: 2, bgcolor: 'primary.50' }}>
            <Typography variant="subtitle2" gutterBottom>
              Selected:
            </Typography>
            <Typography variant="body2">
              <strong>Course:</strong> {selectedCourseName}
            </Typography>
            <Typography variant="body2">
              <strong>Assignment:</strong> {selectedAssignmentName}
            </Typography>
          </Paper>
        )}
      </CardContent>
    </Card>
  );

  // Render connection screen
  const renderConnectScreen = () => (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Connect to Canvas LMS
        </Typography>
        
        <Typography variant="body1" paragraph>
          Enter your Canvas API token to get started with assignment grading.
        </Typography>
        
          <TextField
            fullWidth
          label="Canvas API Token"
          type={showApiKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          variant="outlined"
          margin="normal"
          required
          disabled={loading}
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
          helperText="Your Canvas API token from Settings > Approved Integrations"
          />
        
        <Box sx={{ mt: 3 }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleConnect} 
            disabled={loading || !apiKey.trim()}
            size="large"
            startIcon={loading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
          >
            {loading ? 'Connecting...' : 'Connect to Canvas'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );

  // Render sync screen
  const renderSyncScreen = () => (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Sync Assignment Submissions
        </Typography>
        
        <Box sx={{ mt: 3, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            <strong>Course:</strong> {selectedCourseName}
          </Typography>
          <Typography variant="subtitle1" gutterBottom>
            <strong>Assignment:</strong> {selectedAssignmentName}
          </Typography>
        </Box>
        
        <Typography variant="body1" paragraph>
          Click "Sync Submissions" to download all submission files from Canvas. This will prepare them for grading and allow you to select which students to grade.
        </Typography>
        
        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button 
          variant="outlined" 
            onClick={() => {
              setCurrentStep(1);
              setActiveView('select-course');
            }}
        >
          Back
        </Button>
        <Button 
          variant="contained" 
          color="primary" 
            onClick={() => handleSyncSubmissions(false)} 
          disabled={loading}
            size="large"
            startIcon={loading ? <CircularProgress size={20} /> : <SyncIcon />}
        >
            {loading ? 'Syncing...' : 'Smart Sync'}
        </Button>
        <Button 
          variant="outlined" 
          color="secondary" 
            onClick={() => handleSyncSubmissions(true)} 
          disabled={loading}
            size="large"
            startIcon={loading ? <CircularProgress size={20} /> : <SyncIcon />}
        >
            Force Resync
        </Button>
        </Box>
      </CardContent>
    </Card>
  );
  
  // Render submission selection screen
  const renderSelectionScreen = () => {
    const validSubmissions = syncedSubmissions.filter(s => s.sync_status === 'synced');
    const paginatedSubmissions = validSubmissions.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    
    return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
            Select Submissions to Grade
          </Typography>
          
          {syncSummary && (
            <Box sx={{ mb: 3 }}>
              <Alert severity="success" sx={{ mb: 2 }}>
                Successfully synced {syncSummary.successful_syncs} of {syncSummary.total_submissions} submissions
              </Alert>
              
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                    <Typography variant="h4">{syncSummary.total_submissions}</Typography>
                    <Typography variant="body2">Total</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.main', color: 'success.contrastText' }}>
                    <Typography variant="h4">{syncSummary.successful_syncs}</Typography>
                    <Typography variant="body2">Synced</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.main', color: 'error.contrastText' }}>
                    <Typography variant="h4">{syncSummary.failed_syncs}</Typography>
                    <Typography variant="body2">Failed</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.main', color: 'warning.contrastText' }}>
                    <Typography variant="h4">{syncSummary.no_files}</Typography>
                    <Typography variant="body2">No Files</Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Select submissions to grade ({selectedSubmissions.size} selected)
          </Typography>
            <Button
              variant="outlined"
              onClick={handleSelectAll}
              disabled={validSubmissions.length === 0}
            >
              {selectedSubmissions.size === validSubmissions.length ? 'Deselect All' : 'Select All'}
            </Button>
        </Box>
        
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedSubmissions.size > 0 && selectedSubmissions.size < validSubmissions.length}
                      checked={validSubmissions.length > 0 && selectedSubmissions.size === validSubmissions.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell>Student</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Submitted</TableCell>
                  <TableCell>Files</TableCell>
                  <TableCell>Sync Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedSubmissions.map((submission) => (
                  <TableRow key={submission.user_id}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedSubmissions.has(submission.user_id)}
                        onChange={() => handleSelectSubmission(submission.user_id)}
                        disabled={submission.sync_status !== 'synced'}
                      />
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {submission.user_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {submission.user_id}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={submission.workflow_state || 'Unknown'} 
                        color={submission.workflow_state === 'submitted' ? 'success' : 'default'}
                        size="small"
                      />
                      {submission.late && (
                        <Chip label="Late" color="warning" size="small" sx={{ ml: 1 }} />
                      )}
                    </TableCell>
                    <TableCell>
                      {submission.submitted_at ? 
                        new Date(submission.submitted_at).toLocaleString() : 
                        'Not submitted'
                      }
                    </TableCell>
                    <TableCell>
                      {submission.attachments ? submission.attachments.length : 0} files
                    </TableCell>
                    <TableCell>
                      <Chip 
                        icon={
                          submission.sync_status === 'synced' ? <CheckCircleIcon /> :
                          submission.sync_status === 'failed' ? <ErrorIcon /> :
                          submission.sync_status === 'no_files' ? <WarningIcon /> :
                          <ErrorIcon />
                        }
                        label={submission.sync_status}
                        color={
                          submission.sync_status === 'synced' ? 'success' :
                          submission.sync_status === 'failed' ? 'error' :
                          submission.sync_status === 'no_files' ? 'warning' :
                          'default'
                        }
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={validSubmissions.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(event, newPage) => setPage(newPage)}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
          />
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
            <Button 
              variant="outlined" 
              onClick={() => {
                setCurrentStep(2);
                setActiveView('sync');
              }}
            >
              Back to Sync
            </Button>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => {
                setCurrentStep(3);
                setActiveView('grade');
              }}
              disabled={selectedSubmissions.size === 0}
            >
              Continue to Grading ({selectedSubmissions.size} selected)
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  };

  // Render grading configuration screen
  const renderGradingScreen = () => (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Grade Selected Submissions
        </Typography>
        
        <Box sx={{ mb: 3 }}>
          <Alert severity="info">
            You have selected {selectedSubmissions.size} submissions for grading.
          </Alert>
        </Box>
        
        {/* Grading Scale Display */}
        <Paper sx={{ p: 3, mb: 3, bgcolor: 'grey.50' }}>
          <Typography variant="h6" gutterBottom>
            Grading Scale
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={2}>
              <Box textAlign="center">
                <Typography variant="h6" color="success.main">A</Typography>
                <Typography variant="body2">90-100%</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={2}>
              <Box textAlign="center">
                <Typography variant="h6" color="info.main">B</Typography>
                <Typography variant="body2">80-89%</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={2}>
              <Box textAlign="center">
                <Typography variant="h6" color="warning.main">C</Typography>
                <Typography variant="body2">70-79%</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={2}>
              <Box textAlign="center">
                <Typography variant="h6" color="orange">D</Typography>
                <Typography variant="body2">60-69%</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={2}>
              <Box textAlign="center">
                <Typography variant="h6" color="error.main">F</Typography>
                <Typography variant="body2">0-59%</Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Rubric</InputLabel>
              <Select
                value={selectedRubric}
                label="Rubric"
                onChange={(e) => setSelectedRubric(e.target.value)}
              >
                <MenuItem value="">
                  <em>Default Rubric (Technical Accuracy + Analysis)</em>
                </MenuItem>
                {rubrics.map((rubric) => (
                  <MenuItem key={rubric.id} value={rubric.id}>
                    {rubric.name} ({rubric.total_points} points)
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                Select a custom rubric or use the default
                <Button
                  component={Link}
                  href="/rubric"
                  size="small"
                  sx={{ ml: 1 }}
                >
                  Create New
                </Button>
              </FormHelperText>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography gutterBottom>Grading Strictness</Typography>
            <Slider
              value={strictness}
              onChange={(e, value) => setStrictness(value)}
              min={0}
              max={1}
              step={0.1}
              marks={[
                { value: 0, label: 'Lenient' },
                { value: 0.5, label: 'Balanced' },
                { value: 1, label: 'Strict' }
              ]}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
            />
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
          <Button 
            variant="outlined" 
            onClick={() => {
              setCurrentStep(3);
              setActiveView('select');
            }}
          >
            Back to Selection
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleGradeSubmissions}
            disabled={gradingInProgress || selectedSubmissions.size === 0}
            size="large"
            startIcon={gradingInProgress ? <CircularProgress size={20} /> : <GradeIcon />}
          >
            {gradingInProgress ? 'Grading...' : `Grade ${selectedSubmissions.size} Submissions`}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );

  // Render results screen
  const renderResultsScreen = () => {
    const successfulGrades = gradingResults.filter(r => r.status === 'graded');
    const averageGrade = successfulGrades.length > 0 ? 
      successfulGrades.reduce((sum, r) => sum + (r.percentage || 0), 0) / successfulGrades.length : 0;
    
    return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
            Grading Results
        </Typography>
          
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                <Typography variant="h4">{gradingResults.length}</Typography>
                <Typography variant="body2">Total Processed</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.main', color: 'success.contrastText' }}>
                <Typography variant="h4">{successfulGrades.length}</Typography>
                <Typography variant="body2">Successfully Graded</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.main', color: 'info.contrastText' }}>
                <Typography variant="h4">{averageGrade.toFixed(1)}%</Typography>
                <Typography variant="body2">Average Score</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.main', color: 'warning.contrastText' }}>
                <Typography variant="h4">{gradingResults.filter(r => r.status !== 'graded').length}</Typography>
                <Typography variant="body2">Failed/Errors</Typography>
              </Paper>
            </Grid>
          </Grid>
          
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Student</TableCell>
                  <TableCell>Grade</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Files</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {gradingResults.map((result) => (
                  <TableRow key={result.user_id}>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {result.user_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {result.user_id}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h6" 
                          color={result.percentage >= 80 ? 'success.main' : 
                                 result.percentage >= 60 ? 'warning.main' : 'error.main'}>
                          {result.percentage_display || `${result.percentage}%`}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          ({result.score_display || `${result.raw_score}/${result.total_points}`})
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={
                          result.status === 'graded' ? <CheckCircleIcon /> :
                          result.status === 'error' ? <ErrorIcon /> :
                          <WarningIcon />
                        }
                        label={result.status}
                        color={
                          result.status === 'graded' ? 'success' :
                          result.status === 'error' ? 'error' : 'warning'
                        }
                            size="small" 
                      />
                    </TableCell>
                    <TableCell>
                      {result.files_processed || 0} files processed
                    </TableCell>
                    <TableCell>
                          <Button 
                            size="small" 
                        onClick={() => {
                          setSelectedResult(result);
                          setResultsDialogOpen(true);
                        }}
                          >
                        View Details
                          </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
            <Button 
              variant="outlined" 
              onClick={() => {
                setCurrentStep(3);
                setActiveView('select');
              }}
            >
              Grade More Submissions
            </Button>
            <Box sx={{ display: 'flex', gap: 2 }}>
        <Button 
          variant="outlined" 
                color="secondary"
                startIcon={<FileDownloadIcon />}
                onClick={() => {
                  const resultsJson = JSON.stringify(gradingResults, null, 2);
                  const blob = new Blob([resultsJson], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `grading_results_${selectedAssignmentId}_${new Date().toISOString().split('T')[0]}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Export Results
        </Button>
        <Button 
          variant="contained" 
                color="primary"
                onClick={() => {
                  alert('Post grades to Canvas functionality can be implemented here');
                }}
              >
                Post Grades to Canvas
        </Button>
            </Box>
          </Box>
      </CardContent>
    </Card>
  );
  };

  // Step labels
  const steps = ['Connect', 'Select Course', 'Sync', 'Select', 'Grade', 'Results'];

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
          Canvas Grading System
      </Typography>
      
        {/* Progress Stepper */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Stepper activeStep={currentStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>
        
        {/* Error Display */}
      {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
        {/* Main Content */}
        {activeView === 'connect' && renderConnectScreen()}
        {activeView === 'select-course' && renderCourseSelectionScreen()}
        {activeView === 'sync' && renderSyncScreen()}
        {activeView === 'select' && renderSelectionScreen()}
        {activeView === 'grade' && renderGradingScreen()}
        {activeView === 'results' && renderResultsScreen()}
        
        {/* Results Detail Dialog */}
        <Dialog
          open={resultsDialogOpen}
          onClose={() => setResultsDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Grading Details - {selectedResult?.user_name}
          </DialogTitle>
          <DialogContent>
            {selectedResult && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Grade: {selectedResult.grade}% ({selectedResult.grade}/100)
                </Typography>
                
                <Typography variant="subtitle1" gutterBottom>
                  Status: {selectedResult.status}
                </Typography>
                
                <Typography variant="subtitle1" gutterBottom>
                  Files Processed: {selectedResult.files_processed || 0}
                </Typography>
                
                {selectedResult.rubric_used && (
                  <Typography variant="subtitle1" gutterBottom>
                    Rubric Used: {selectedResult.rubric_used}
                  </Typography>
                )}
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="h6" gutterBottom>
                  Feedback:
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                    {selectedResult.feedback || 'No feedback available'}
                  </Typography>
                </Paper>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setResultsDialogOpen(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Back to Canvas Button */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Button 
            variant="outlined" 
            component={Link} 
            href="/canvas"
            size="large"
          >
            Back to Canvas Grading
          </Button>
        </Box>

        {/* Navigation Links */}
        <Box sx={{ mt: 4, textAlign: 'center', display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button 
            variant="outlined" 
            component={Link} 
            href="/"
          >
            Home
          </Button>
          <Button 
            variant="outlined" 
            component={Link} 
            href="/canvas-results"
          >
            View Past Results
          </Button>
          <Button 
            variant="outlined" 
            component={Link} 
            href="/rubric"
          >
            Manage Rubrics
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default CanvasPage; 