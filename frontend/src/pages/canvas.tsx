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
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  TextField,
  MenuItem,
  CardActionArea,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  Avatar,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  School as CanvasIcon,
  Assignment as AssignmentIcon,
  Class as CourseIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  PlayArrow as StartIcon,
  ArrowForward,
  Article as ArticleIcon,
  ArrowBack as BackIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Grade as GradeIcon,
  AutoFixHigh as AutoIcon,
} from '@mui/icons-material';

interface Course {
  id: string;
  name: string;
  course_code: string;
  enrollment_term_id: string;
  workflow_state: string;
}

interface Assignment {
  id: string;
  name: string;
  description: string;
  course_id: string;
  due_at: string | null;
  points_possible: number;
  submission_types: string[];
  workflow_state: string;
}

interface Student {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  avatar_url?: string;
  submission_state: 'submitted' | 'pending' | 'graded' | 'missing' | 'late';
  submitted_at?: string;
  score?: number;
  grade?: string;
  submission_type?: string;
  late?: boolean;
  missing?: boolean;
  has_attachments?: boolean;
  selected?: boolean;
}

interface GradingProgress {
  total: number;
  completed: number;
  failed: number;
  current_student?: string;
  phase: 'downloading' | 'processing' | 'grading' | 'finalizing';
  phase_progress: number;
}

interface GradingResult {
  student_id: string;
  student_name: string;
  score: number;
  percentage: number;
  feedback: string;
  criteria_scores?: any;
  status: 'success' | 'failed' | 'pending';
  error_message?: string;
}

interface Rubric {
  id: string;
  name: string;
  description: string;
  criteria: any[];
  created_at: string;
  updated_at: string;
}

interface JobStatus {
  job_id: string;
  status: string;
  completed: boolean;
  results: any;
}

type AlertType = {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
} | null;

type WorkflowStep = 'setup' | 'student_list' | 'grading_progress' | 'results';

const workflowSteps = [
  { key: 'setup', label: 'Setup & Selection' },
  { key: 'student_list', label: 'Student Details' },
  { key: 'grading_progress', label: 'Grading Progress' },
  { key: 'results', label: 'Results & Review' }
];

const CanvasIntegration: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<AlertType>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [selectedRubric, setSelectedRubric] = useState<string>('default');
  const [apiKey, setApiKey] = useState<string>('');
  const [showSetup, setShowSetup] = useState(false);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [statusCheckInterval, setStatusCheckInterval] = useState<NodeJS.Timeout | null>(null);

  const [currentStep, setCurrentStep] = useState<WorkflowStep>('setup');
  const [students, setStudents] = useState<Student[]>([]);
  const [gradingProgress, setGradingProgress] = useState<GradingProgress | null>(null);
  const [gradingResults, setGradingResults] = useState<GradingResult[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectAllStudents, setSelectAllStudents] = useState(false);

  useEffect(() => {
    initializeEverything();
  }, []);

  const initializeEverything = async () => {
    setLoading(true);
    try {
      await checkCanvasStatus();
      await loadRubrics();
    } catch (error) {
      console.error('Initialization error:', error);
      setAlert({ type: 'error', message: 'Failed to initialize Canvas page' });
    } finally {
      setLoading(false);
    }
  };

  const checkCanvasStatus = async () => {
    try {
      console.log('Checking Canvas status...');
      const response = await fetch('/api/canvas/status');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const responseText = await response.text();
      console.log('Raw Canvas status response:', responseText);
      
      if (!responseText.trim()) {
        throw new Error('Empty response from Canvas status endpoint');
      }
      
      const data = JSON.parse(responseText);
      console.log('Parsed Canvas status response:', data);
      
      if (data.status === 'success' && data.connected) {
        console.log('Canvas is connected, loading courses...');
        setIsConnected(true);
        setShowSetup(false);
        await loadCoursesDirectly();
      } else {
        console.log('Canvas not connected, checking for stored credentials...');
        await tryStoredCredentials();
      }
    } catch (error) {
      console.error('Error checking Canvas status:', error);
      setIsConnected(false);
      setShowSetup(true);
      setAlert({ type: 'info', message: 'Please enter your Canvas API key to get started.' });
    }
  };

  const tryStoredCredentials = async () => {
    try {
      const savedSettings = localStorage.getItem('scorepal_settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        if (settings.canvas?.apiKey) {
          console.log('Found stored API key, attempting to connect...');
          await connectWithApiKey(settings.canvas.apiKey);
          return;
        }
      }
    } catch (error) {
      console.error('Error with stored credentials:', error);
    }
    
    setIsConnected(false);
    setShowSetup(true);
    setAlert({ type: 'info', message: 'Please enter your Canvas API key to get started.' });
  };

  const loadCoursesDirectly = async () => {
    try {
      console.log('Loading courses directly...');
      const response = await fetch('/api/canvas/courses');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const responseText = await response.text();
      console.log('Raw courses response:', responseText);
      
      if (!responseText.trim()) {
        throw new Error('Empty response from courses endpoint');
      }
      
      const data = JSON.parse(responseText);
      console.log('Parsed courses API response:', data);
      
      if (data.status === 'success' && data.courses) {
        console.log(`Successfully loaded ${data.courses.length} courses`);
        setCourses(data.courses);
        setAlert({ type: 'success', message: `Loaded ${data.courses.length} courses from Canvas` });
      } else {
        console.error('Failed to load courses:', data);
        setAlert({ type: 'error', message: data.message || 'Failed to load courses' });
      }
    } catch (error) {
      console.error('Error loading courses:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Unexpected token') || errorMessage.includes('JSON')) {
        setAlert({ type: 'error', message: 'Server returned invalid response. Please check if the backend is running.' });
      } else {
        setAlert({ type: 'error', message: 'Network error loading courses' });
      }
    }
  };

  const connectWithApiKey = async (apiKeyToUse: string) => {
    try {
      console.log('Connecting to Canvas with API key...');
      const response = await fetch('/api/canvas/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKeyToUse }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const responseText = await response.text();
      console.log('Raw Canvas initialization response:', responseText);
      
      if (!responseText.trim()) {
        throw new Error('Empty response from Canvas initialization endpoint');
      }
      
      const result = JSON.parse(responseText);
      console.log('Parsed Canvas initialization result:', result);
      
      if (result.status === 'success') {
        const settings = { 
          canvas: { 
            apiKey: apiKeyToUse, 
            url: 'https://sjsu.instructure.com', 
            enabled: true 
          } 
        };
        localStorage.setItem('scorepal_settings', JSON.stringify(settings));

        setIsConnected(true);
        setShowSetup(false);
        setAlert({ type: 'success', message: 'Canvas connected successfully!' });
        
        await loadCoursesDirectly();
      } else {
        setAlert({ type: 'error', message: result.message || 'Failed to connect to Canvas' });
      }
    } catch (error) {
      console.error('Error connecting to Canvas:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Unexpected token') || errorMessage.includes('JSON')) {
        setAlert({ type: 'error', message: 'Server returned invalid response. Please check if the backend is running.' });
      } else {
        setAlert({ type: 'error', message: 'Network error. Please try again.' });
      }
    }
  };

  const handleQuickConnect = async () => {
    if (!apiKey.trim()) {
      setAlert({ type: 'error', message: 'Please enter your Canvas API key' });
      return;
    }

    setLoading(true);
    try {
      await connectWithApiKey(apiKey.trim());
    } finally {
      setLoading(false);
    }
  };

  const loadAssignments = async (courseId: string) => {
    setLoading(true);
    try {
      console.log(`Loading assignments for course ${courseId}...`);
      const response = await fetch(`/api/canvas/courses/${courseId}/assignments`);
      const data = await response.json();
      
      if (data.status === 'success') {
        setAssignments(data.assignments);
        setAlert({ type: 'success', message: `Loaded ${data.assignments.length} assignments` });
      } else {
        setAlert({ type: 'error', message: 'Failed to load assignments' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Network error loading assignments' });
    } finally {
      setLoading(false);
    }
  };

  const handleCourseSelect = (course: Course) => {
    setSelectedCourse(course);
    setSelectedAssignment(null);
    setAssignments([]);
    setStudents([]);
    setCurrentStep('setup');
    loadAssignments(course.id);
  };

  const handleAssignmentSelect = async (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setLoading(true);
    try {
      await loadStudentsForAssignment(selectedCourse!.id, assignment.id);
      setCurrentStep('student_list');
    } catch (error) {
      console.error('Error loading students:', error);
      setAlert({ type: 'error', message: 'Failed to load student data' });
    } finally {
      setLoading(false);
    }
  };

  const loadStudentsForAssignment = async (courseId: string, assignmentId: string) => {
    try {
      const response = await fetch(`/api/canvas/courses/${courseId}/assignments/${assignmentId}/submissions?include=user`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.submissions) {
        const studentList: Student[] = data.submissions.map((submission: any) => ({
          id: submission.id,
          user_id: submission.user_id,
          name: submission.user?.name || `Student ${submission.user_id}`,
          email: submission.user?.email,
          avatar_url: submission.user?.avatar_url,
          submission_state: submission.workflow_state || 'pending',
          submitted_at: submission.submitted_at,
          score: submission.score,
          grade: submission.grade,
          submission_type: submission.submission_type,
          late: submission.late || false,
          missing: submission.missing || false,
          has_attachments: (submission.attachments && submission.attachments.length > 0),
          selected: true // Default to selected
        }));
        
        setStudents(studentList);
        setSelectedStudents(studentList.map(s => s.user_id));
        setSelectAllStudents(true);
        setAlert({ type: 'success', message: `Loaded ${studentList.length} student submissions` });
      } else {
        throw new Error(data.message || 'Failed to load submissions');
      }
    } catch (error) {
      console.error('Error loading students:', error);
      throw error;
    }
  };

  const handleStudentSelection = (studentId: string, selected: boolean) => {
    if (selected) {
      setSelectedStudents(prev => [...prev, studentId]);
    } else {
      setSelectedStudents(prev => prev.filter(id => id !== studentId));
    }
    
    // Update select all state
    const totalStudents = students.length;
    const selectedCount = selected 
      ? selectedStudents.length + 1 
      : selectedStudents.length - 1;
    setSelectAllStudents(selectedCount === totalStudents);
  };

  const handleSelectAllStudents = (selectAll: boolean) => {
    setSelectAllStudents(selectAll);
    if (selectAll) {
      setSelectedStudents(students.map(s => s.user_id));
    } else {
      setSelectedStudents([]);
    }
  };

  const startGradingWorkflow = async () => {
    if (selectedStudents.length === 0) {
      setAlert({ type: 'error', message: 'Please select at least one student to grade' });
      return;
    }

    setCurrentStep('grading_progress');
    setGradingProgress({
      total: selectedStudents.length,
      completed: 0,
      failed: 0,
      current_student: undefined,
      phase: 'downloading',
      phase_progress: 0
    });

    try {
      // Start the grading job
      const response = await fetch(`/api/canvas/courses/${selectedCourse?.id}/assignments/${selectedAssignment?.id}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          rubric_id: selectedRubric,
          selected_students: selectedStudents
        }),
      });

      const data = await response.json();
      if (data.status === 'success') {
        const jobId = data.job_id;
        startGradingProgressCheck(jobId);
      } else {
        setAlert({ type: 'error', message: data.message || 'Failed to start grading' });
        setCurrentStep('student_list');
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Network error starting grading' });
      setCurrentStep('student_list');
    }
  };

  const startGradingProgressCheck = (jobId: string) => {
    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`/api/canvas/jobs/${jobId}`);
        const data = await response.json();
        
        if (data.status === 'success') {
          // Update progress based on job status
          if (data.job_status === 'processing') {
            setGradingProgress(prev => prev ? {
              ...prev,
              phase: 'grading',
              phase_progress: Math.min(90, (prev.completed / prev.total) * 100)
            } : null);
          }
          
          if (data.job_status === 'completed') {
            clearInterval(intervalId);
            
            // Fetch results
            const resultsResponse = await fetch(`/api/canvas/jobs/${jobId}/results`);
            const resultsData = await resultsResponse.json();
            
            if (resultsData.status === 'success' && resultsData.results) {
              const results: GradingResult[] = Object.entries(resultsData.results.submissions || {}).map(([userId, submission]: [string, any]) => ({
                student_id: userId,
                student_name: submission.user_name || `Student ${userId}`,
                score: submission.grading_result?.score || 0,
                percentage: Math.round(submission.grading_result?.score || 0),
                feedback: submission.grading_result?.feedback || 'No feedback available',
                status: submission.grading_result ? 'success' : 'failed',
                error_message: submission.error_message
              }));
              
              setGradingResults(results);
              setGradingProgress({
                total: results.length,
                completed: results.filter(r => r.status === 'success').length,
                failed: results.filter(r => r.status === 'failed').length,
                phase: 'finalizing',
                phase_progress: 100
              });
              
              setTimeout(() => {
                setCurrentStep('results');
              }, 1000);
            }
          }
          
          if (data.job_status === 'failed') {
            clearInterval(intervalId);
            setAlert({ type: 'error', message: `Grading failed: ${data.error || 'Unknown error'}` });
            setCurrentStep('student_list');
          }
        }
      } catch (error) {
        console.error('Error checking grading progress:', error);
      }
    }, 2000);
    
    setStatusCheckInterval(intervalId);
  };

  const resetWorkflow = () => {
    setCurrentStep('setup');
    setSelectedAssignment(null);
    setStudents([]);
    setGradingProgress(null);
    setGradingResults([]);
    setSelectedStudents([]);
    setSelectAllStudents(false);
    stopStatusCheck();
  };

  const loadRubrics = async () => {
    try {
      const response = await fetch('/api/rubrics');
      const data = await response.json();
      
      if (data.status === 'success') {
        setRubrics(data.rubrics || []);
      }
    } catch (error) {
      console.error('Error loading rubrics:', error);
    }
  };

  const handleRubricChange = (event: SelectChangeEvent<string>) => {
    setSelectedRubric(event.target.value);
  };

  const startGrading = async (assignment: Assignment) => {
    try {
      setJobStatus(null);
      stopStatusCheck();
      
      const response = await fetch(`/api/canvas/courses/${selectedCourse?.id}/assignments/${assignment.id}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          rubric_id: selectedRubric
        }),
      });

      const data = await response.json();
      if (data.status === 'success') {
        setAlert({ type: 'success', message: `Grading started! Job ID: ${data.job_id}` });
        const jobId = data.job_id;
        setJobStatus({
          job_id: jobId,
          status: 'queued',
          completed: false,
          results: null
        });
        
        startStatusCheck(jobId);
      } else {
        setAlert({ type: 'error', message: data.message || 'Failed to start grading' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Network error starting grading' });
    }
  };

  const checkJobStatus = async (jobId: string) => {
    try {
      const response = await fetch(`/api/canvas/jobs/${jobId}`);
      const data = await response.json();
      
      if (data.status === 'success') {
        setJobStatus({
          job_id: jobId,
          status: data.job_status,
          completed: data.job_status === 'completed',
          results: null
        });
        
        if (data.job_status === 'completed' && data.results_available) {
          const resultsResponse = await fetch(`/api/canvas/jobs/${jobId}/results`);
          const resultsData = await resultsResponse.json();
          
          if (resultsData.status === 'success') {
            setJobStatus(prev => ({
              ...prev!,
              results: resultsData.results
            }));
            setShowResults(true);
            stopStatusCheck();
          }
        } else if (data.job_status === 'completed' && !data.results_available) {
          setJobStatus(prev => ({
            ...prev!,
            status: 'completed',
            completed: true,
            results: {
              no_submissions: true,
              assignment: data.assignment || {},
              course: data.course || {}
            }
          }));
          setShowResults(true);
          stopStatusCheck();
        }
        
        if (data.job_status === 'failed') {
          setAlert({ 
            type: 'error', 
            message: `Grading job failed: ${data.error || 'Unknown error'}`
          });
          stopStatusCheck();
        }
      }
    } catch (error) {
      console.error('Error checking job status:', error);
    }
  };
  
  const startStatusCheck = (jobId: string) => {
    checkJobStatus(jobId);
    
    const intervalId = setInterval(() => {
      checkJobStatus(jobId);
    }, 3000);
    
    setStatusCheckInterval(intervalId);
  };
  
  const stopStatusCheck = () => {
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
      setStatusCheckInterval(null);
    }
  };

  const refreshAll = async () => {
    setLoading(true);
    try {
      await loadRubrics();
      if (isConnected) {
        await loadCoursesDirectly();
        if (selectedCourse) {
          await loadAssignments(selectedCourse.id);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [statusCheckInterval]);

  // Render different components based on current step
  const renderStepContent = () => {
    switch (currentStep) {
      case 'setup':
        return renderSetupStep();
      case 'student_list':
        return renderStudentListStep();
      case 'grading_progress':
        return renderGradingProgressStep();
      case 'results':
        return renderResultsStep();
      default:
        return renderSetupStep();
    }
  };

  const renderSetupStep = () => (
    <>
      {isConnected && (
        <>
          <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 600, mb: 2 }}>
              Grading Configuration
            </Typography>
            <FormControl fullWidth sx={{ maxWidth: 500 }}>
              <InputLabel sx={{ fontSize: '0.9rem' }}>Grading Rubric</InputLabel>
              <Select
                value={selectedRubric}
                onChange={handleRubricChange}
                label="Grading Rubric"
                sx={{ 
                  fontSize: '0.9rem',
                  '& .MuiSelect-select': {
                    py: 1.5
                  }
                }}
              >
                <MenuItem value="default">
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.9rem' }}>
                      Default Assignment Rubric
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      Content, Analysis, Organization, Evidence, Communication
                    </Typography>
                  </Box>
                </MenuItem>
                {rubrics.map((rubric) => (
                  <MenuItem key={rubric.id} value={rubric.id}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.9rem' }}>
                        {rubric.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        {rubric.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Paper>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: 'fit-content' }}>
                <CardContent sx={{ pb: 2 }}>
                  <Typography variant="h6" gutterBottom sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    mb: 2
                  }}>
                    <CourseIcon sx={{ fontSize: '1.3rem' }} />
                    My Courses ({courses.length})
                  </Typography>
                  
                  {courses.length === 0 ? (
                    <Box sx={{ py: 3, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        {loading ? 'Loading courses...' : 'No courses found'}
                      </Typography>
                      {loading && <CircularProgress size={20} sx={{ mt: 1 }} />}
                    </Box>
                  ) : (
                    <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                      {courses.map((course) => (
                        <Card
                          key={course.id}
                          sx={{ 
                            mb: 1.5, 
                            cursor: 'pointer',
                            bgcolor: selectedCourse?.id === course.id ? 'primary.50' : 'background.paper',
                            borderLeft: selectedCourse?.id === course.id ? 4 : 0,
                            borderColor: 'primary.main',
                            '&:hover': {
                              bgcolor: 'action.hover'
                            }
                          }}
                          onClick={() => handleCourseSelect(course)}
                        >
                          <CardActionArea>
                            <CardContent sx={{ py: 1.5 }}>
                              <Typography variant="body1" sx={{ fontWeight: 500, fontSize: '0.9rem' }}>
                                {course.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                {course.course_code}
                              </Typography>
                            </CardContent>
                          </CardActionArea>
                        </Card>
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ height: 'fit-content' }}>
                <CardContent sx={{ pb: 2 }}>
                  <Typography variant="h6" gutterBottom sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    mb: 2
                  }}>
                    <AssignmentIcon sx={{ fontSize: '1.3rem' }} />
                    Assignments ({assignments.length})
                  </Typography>

                  {!selectedCourse ? (
                    <Box sx={{ py: 3, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        Select a course to view assignments
                      </Typography>
                    </Box>
                  ) : assignments.length === 0 ? (
                    <Box sx={{ py: 3, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        {loading ? 'Loading assignments...' : 'No assignments found'}
                      </Typography>
                      {loading && <CircularProgress size={20} sx={{ mt: 1 }} />}
                    </Box>
                  ) : (
                    <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                      {assignments.map((assignment) => (
                        <Card
                          key={assignment.id}
                          sx={{
                            mb: 1.5,
                            cursor: 'pointer',
                            '&:hover': {
                              bgcolor: 'action.hover'
                            }
                          }}
                          onClick={() => handleAssignmentSelect(assignment)}
                        >
                          <CardContent sx={{ 
                            pb: '12px !important', 
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center' 
                          }}>
                            <Box>
                              <Typography variant="body1" sx={{ fontWeight: 500, fontSize: '0.9rem' }}>
                                {assignment.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', display: 'block' }}>
                                {assignment.due_at ? `Due: ${new Date(assignment.due_at).toLocaleDateString()}` : 'No due date'} 
                                {assignment.points_possible ? ` • ${assignment.points_possible} pts` : ''}
                              </Typography>
                            </Box>
                            <IconButton
                              color="primary"
                              size="small"
                            >
                              <ArrowForward />
                            </IconButton>
                          </CardContent>
                        </Card>
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </>
  );

  const renderStudentListStep = () => (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h5" gutterBottom>
              Student Submissions
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedAssignment?.name} • {selectedCourse?.name}
            </Typography>
          </Box>
          <Button 
            startIcon={<BackIcon />} 
            onClick={resetWorkflow}
            variant="outlined"
            size="small"
          >
            Back to Selection
          </Button>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Checkbox
              checked={selectAllStudents}
              onChange={(e) => handleSelectAllStudents(e.target.checked)}
              indeterminate={selectedStudents.length > 0 && selectedStudents.length < students.length}
            />
            <Typography variant="body1">
              Select All ({selectedStudents.length}/{students.length} selected)
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<AutoIcon />}
            onClick={startGradingWorkflow}
            disabled={selectedStudents.length === 0}
          >
            Grade Selected Students
          </Button>
        </Box>

        <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">Select</TableCell>
                <TableCell>Student</TableCell>
                <TableCell>Submission Status</TableCell>
                <TableCell>Submitted</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Current Score</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.user_id} hover>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedStudents.includes(student.user_id)}
                      onChange={(e) => handleStudentSelection(student.user_id, e.target.checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar 
                        src={student.avatar_url} 
                        sx={{ width: 32, height: 32 }}
                      >
                        <PersonIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {student.name}
                        </Typography>
                        {student.email && (
                          <Typography variant="caption" color="text.secondary">
                            {student.email}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={student.submission_state}
                      size="small"
                      color={
                        student.submission_state === 'submitted' ? 'success' :
                        student.submission_state === 'graded' ? 'info' :
                        student.submission_state === 'missing' ? 'error' :
                        student.late ? 'warning' : 'default'
                      }
                      icon={
                        student.late ? <ScheduleIcon /> :
                        student.has_attachments ? <ArticleIcon /> : undefined
                      }
                    />
                  </TableCell>
                  <TableCell>
                    {student.submitted_at ? (
                      <Typography variant="body2">
                        {new Date(student.submitted_at).toLocaleDateString()}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Not submitted
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {student.submission_type || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {student.score !== null && student.score !== undefined ? (
                      <Chip
                        label={`${student.score}%`}
                        size="small"
                        color={student.score >= 80 ? 'success' : student.score >= 60 ? 'warning' : 'error'}
                        icon={<GradeIcon />}
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Not graded
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );

  const renderGradingProgressStep = () => (
    <Box>
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
          Grading in Progress
        </Typography>
        
        {gradingProgress && (
          <>
            <Box sx={{ mb: 4 }}>
              <CircularProgress 
                size={80} 
                thickness={4} 
                value={gradingProgress.phase_progress} 
                variant="determinate"
                sx={{ mb: 2 }}
              />
              <Typography variant="h6" gutterBottom>
                {gradingProgress.phase === 'downloading' && 'Downloading Submissions...'}
                {gradingProgress.phase === 'processing' && 'Processing Files...'}
                {gradingProgress.phase === 'grading' && 'AI Grading in Progress...'}
                {gradingProgress.phase === 'finalizing' && 'Finalizing Results...'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {gradingProgress.current_student && `Currently processing: ${gradingProgress.current_student}`}
              </Typography>
            </Box>

            <Grid container spacing={4} sx={{ mb: 4 }}>
              <Grid item xs={4}>
                <Paper sx={{ p: 2, bgcolor: 'primary.50' }}>
                  <Typography variant="h4" color="primary.main">
                    {gradingProgress.total}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Students
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={4}>
                <Paper sx={{ p: 2, bgcolor: 'success.50' }}>
                  <Typography variant="h4" color="success.main">
                    {gradingProgress.completed}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Completed
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={4}>
                <Paper sx={{ p: 2, bgcolor: 'error.50' }}>
                  <Typography variant="h4" color="error.main">
                    {gradingProgress.failed}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Failed
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            <LinearProgress 
              variant="determinate" 
              value={(gradingProgress.completed + gradingProgress.failed) / gradingProgress.total * 100}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </>
        )}
      </Paper>
    </Box>
  );

  const renderResultsStep = () => (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h5" gutterBottom>
              Grading Results
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedAssignment?.name} • {selectedCourse?.name}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              startIcon={<BackIcon />} 
              onClick={() => setCurrentStep('student_list')}
              variant="outlined"
              size="small"
            >
              Back to Students
            </Button>
            <Button 
              onClick={resetWorkflow}
              variant="outlined"
              size="small"
            >
              Start New
            </Button>
          </Box>
        </Box>

        {gradingResults.length > 0 && (
          <>
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={3}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.50' }}>
                  <Typography variant="h5" color="primary.main">
                    {gradingResults.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Graded
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={3}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.50' }}>
                  <Typography variant="h5" color="success.main">
                    {gradingResults.filter(r => r.status === 'success').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Successful
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={3}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.50' }}>
                  <Typography variant="h5" color="info.main">
                    {Math.round(gradingResults.reduce((sum, r) => sum + r.percentage, 0) / gradingResults.length)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Average Score
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={3}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.50' }}>
                  <Typography variant="h5" color="warning.main">
                    {Math.min(...gradingResults.map(r => r.percentage))}% - {Math.max(...gradingResults.map(r => r.percentage))}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Score Range
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Student</TableCell>
                    <TableCell>Score</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Feedback Preview</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {gradingResults.map((result) => (
                    <TableRow key={result.student_id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {result.student_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${result.percentage}%`}
                          color={
                            result.percentage >= 80 ? 'success' :
                            result.percentage >= 60 ? 'warning' : 'error'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={result.status}
                          color={result.status === 'success' ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 300 }}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap' 
                          }}
                        >
                          {result.feedback}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View detailed feedback">
                          <IconButton size="small" color="primary">
                            <ArticleIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button variant="outlined" color="primary">
                Export Results
              </Button>
              <Button variant="contained" color="success" startIcon={<CheckIcon />}>
                Post Grades to Canvas
              </Button>
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Canvas Integration
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Grade assignments directly from Canvas with AI-powered rubrics
        </Typography>
      </Box>

      {alert && (
        <Alert 
          severity={alert.type} 
          sx={{ mb: 3 }}
          onClose={() => setAlert(null)}
        >
          {alert.message}
        </Alert>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        {loading && (
          <>
            <CircularProgress size={20} />
            <Typography>Loading...</Typography>
          </>
        )}
        {!loading && isConnected && (
          <>
            <Chip icon={<CheckIcon />} label="Connected to Canvas" color="success" />
            <Button startIcon={<RefreshIcon />} onClick={refreshAll} size="small">
              Refresh All
            </Button>
          </>
        )}
        {!loading && !isConnected && (
          <Chip icon={<ErrorIcon />} label="Not Connected" color="error" />
        )}
      </Box>

      {/* Workflow Stepper */}
      {isConnected && currentStep !== 'setup' && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Stepper activeStep={workflowSteps.findIndex(step => step.key === currentStep)} sx={{ mb: 2 }}>
            {workflowSteps.map((step) => (
              <Step key={step.key}>
                <StepLabel>{step.label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>
      )}

      {showSetup && !isConnected && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Canvas Setup
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Get your API key from Canvas → Account → Settings → Approved Integrations → New Access Token
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                label="Canvas API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Canvas API key"
                type="password"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleQuickConnect}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Connect'}
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Render current step content */}
      {renderStepContent()}
    </Container>
  );
};

export default CanvasIntegration; 