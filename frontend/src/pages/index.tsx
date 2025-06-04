import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  TextField,
  Card,
  CardContent,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  LinearProgress,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Assignment as AssignmentIcon,
  Assessment as RubricIcon,
  PlayArrow as StartIcon,
  Login as LoginIcon,
  ExpandMore as ExpandMoreIcon,
  School as GradeIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import { useFreeTrial } from '../hooks/useFreeTrial';

interface Rubric {
  id: string;
  name: string;
  description: string;
  criteria: any[];
  created_at: string;
  updated_at: string;
}

interface GradingState {
  step: number;
  assignment: File | null;
  rubric: any;
  result: any;
  loading: boolean;
}

const HomePage: React.FC = () => {
  const router = useRouter();
  const { attemptsUsed, maxAttempts, canUseFreeTrial, isLoggedIn, useAttempt } = useFreeTrial();
  const [localUser, setLocalUser] = useState<any>(null);
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [rubricsLoading, setRubricsLoading] = useState(false);
  
  // Check for user authentication from localStorage
  useEffect(() => {
    const userData = localStorage.getItem('scorepal_user');
    if (userData) {
      try {
        setLocalUser(JSON.parse(userData));
      } catch (error) {
        localStorage.removeItem('scorepal_user');
      }
    }
  }, []);

  // Load rubrics when component mounts
  useEffect(() => {
    loadRubrics();
  }, []);
  
  const [gradingState, setGradingState] = useState<GradingState>({
    step: 0,
    assignment: null,
    rubric: null,
    result: null,
    loading: false,
  });

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null);

  const steps = ['Upload Assignment', 'Select Rubric', 'Review & Grade'];

  // Check if user can proceed with grading - prioritize localUser over hook state
  const isAuthenticated = localUser || isLoggedIn;
  const canGrade = isAuthenticated || canUseFreeTrial;

  const loadRubrics = async () => {
    setRubricsLoading(true);
    try {
      const response = await fetch('/api/rubrics');
      const data = await response.json();
      
      if (data.status === 'success') {
        setRubrics(data.rubrics || []);
      } else {
        console.error('Failed to load rubrics:', data);
        setAlert({
          type: 'warning',
          message: 'Failed to load custom rubrics. Using default rubric only.',
        });
      }
    } catch (error) {
      console.error('Error loading rubrics:', error);
      setAlert({
        type: 'warning',
        message: 'Could not load rubrics. Using default rubric only.',
      });
    } finally {
      setRubricsLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        setAlert({
          type: 'error',
          message: 'Please upload a PDF, DOC, DOCX, or TXT file.',
        });
        return;
      }
      
      setGradingState(prev => ({
        ...prev,
        assignment: file,
        step: 1,
      }));

      setAlert({
        type: 'success',
        message: `File "${file.name}" uploaded successfully!`,
      });
    }
  };

  const handleRubricSelect = (rubric: any) => {
    setGradingState(prev => ({
      ...prev,
      rubric,
      step: 2,
    }));
  };

  const pollForResults = async (taskId: string) => {
    const maxAttempts = 60; // Poll for up to 60 seconds (1 second intervals)
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`/api/grade-assignment/${taskId}/simple`);
        const result = await response.json();

        if (result.status === 'completed') {
          // Transform the result to match what the frontend expects
          const transformedResult = {
            score: result.score,
            feedback: result.feedback,
            criteria_scores: result.criteria_scores,
            percentage: result.percentage,
            grade_letter: result.grade_letter,
            student_name: result.student_name,
            completed_at: result.completed_at
          };

          setGradingState(prev => ({
            ...prev,
            result: transformedResult,
            loading: false,
          }));
          
          setAlert({
            type: 'success',
            message: 'Assignment graded successfully!',
          });
          return;
        } else if (result.status === 'failed') {
          throw new Error(result.feedback || 'Grading failed');
        } else if (result.status === 'processing') {
          // Continue polling
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          attempts++;
        } else {
          throw new Error('Unknown status: ' + result.status);
        }
      } catch (error) {
        console.error('Error polling for results:', error);
        throw error;
      }
    }

    // If we get here, polling timed out
    throw new Error('Grading is taking longer than expected. Please try again later.');
  };

  const handleStartGrading = async () => {
    if (!canGrade) {
      setShowLoginModal(true);
        return;
      }
      
    // Use a free trial attempt if not authenticated
    if (!isAuthenticated && !useAttempt()) {
      setShowLoginModal(true);
        return;
      }
      
    setGradingState(prev => ({ ...prev, loading: true }));
      
    try {
      // Create FormData for file upload
      const formData = new FormData();
      if (gradingState.assignment) {
        formData.append('file', gradingState.assignment);
      }
      formData.append('rubric_id', gradingState.rubric?.id || 'default');

      const response = await fetch('/api/grade-assignment', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.status === 'success' && result.task_id) {
        // Now poll for the actual results
        await pollForResults(result.task_id);
      } else {
        throw new Error(result.message || 'Grading failed');
      }
    } catch (error) {
      setAlert({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to grade assignment',
      });
      setGradingState(prev => ({ ...prev, loading: false }));
    }
  };

  const resetGrading = () => {
    setGradingState({
      step: 0,
      assignment: null,
      rubric: null,
      result: null,
      loading: false,
    });
    setAlert(null);
  };

  const renderUploadStep = () => (
    <Card sx={{ p: 4, textAlign: 'center' }}>
      <UploadIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
      <Typography variant="h5" gutterBottom>
        Upload Your Assignment
        </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Support for PDF, DOC, DOCX, and TXT files
        </Typography>
      
      <input
        accept=".pdf,.doc,.docx,.txt"
        style={{ display: 'none' }}
        id="file-upload"
        type="file"
        onChange={handleFileUpload}
      />
      <label htmlFor="file-upload">
          <Button 
            variant="contained" 
          component="span"
            size="large"
          startIcon={<UploadIcon />}
        >
          Choose File
        </Button>
      </label>

      {gradingState.assignment && (
        <Box sx={{ mt: 3 }}>
          <Chip
            icon={<AssignmentIcon />}
            label={gradingState.assignment.name}
            color="primary"
            variant="outlined"
          />
        </Box>
      )}
    </Card>
  );

  const renderRubricStep = () => (
    <Card sx={{ p: 4 }}>
      <Typography variant="h5" gutterBottom>
        Select Grading Rubric
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Choose a rubric for grading your assignment
      </Typography>

      {rubricsLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <CircularProgress size={24} />
          <Typography variant="body2" sx={{ ml: 2 }}>Loading rubrics...</Typography>
        </Box>
      )}

      {/* Default Rubric Option */}
      <Card 
            sx={{ 
          mb: 2, 
          cursor: 'pointer',
          border: gradingState.rubric?.id === 'default' ? '2px solid' : '1px solid',
          borderColor: gradingState.rubric?.id === 'default' ? 'primary.main' : 'divider',
        }}
        onClick={() => handleRubricSelect({ id: 'default', name: 'Default Assignment Rubric' })}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6">Default Assignment Rubric</Typography>
            <Chip label="Default" size="small" color="primary" sx={{ ml: 2 }} />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Standard rubric with criteria for content, analysis, organization, evidence, and communication
          </Typography>
        </CardContent>
      </Card>

      {/* Custom Rubrics */}
      {rubrics.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>Custom Rubrics</Typography>
          {rubrics.map((rubric) => (
            <Card 
              key={rubric.id}
              sx={{ 
                mb: 2, 
                cursor: 'pointer',
                border: gradingState.rubric?.id === rubric.id ? '2px solid' : '1px solid',
                borderColor: gradingState.rubric?.id === rubric.id ? 'primary.main' : 'divider',
              }}
              onClick={() => handleRubricSelect(rubric)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6">{rubric.name}</Typography>
                  <Chip label="Custom" size="small" color="secondary" sx={{ ml: 2 }} />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {rubric.description}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  {rubric.criteria.length} criteria • Created {new Date(rubric.created_at).toLocaleDateString()}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="outlined"
          fullWidth
          onClick={() => router.push('/rubrics')}
          startIcon={<RubricIcon />}
        >
          Create Custom Rubric
        </Button>
        <Button
          variant="text"
          onClick={loadRubrics}
          startIcon={<RefreshIcon />}
          disabled={rubricsLoading}
        >
          Refresh
          </Button>
      </Box>
    </Card>
  );

  const renderGradingStep = () => (
    <Card sx={{ p: 4 }}>
      <Typography variant="h5" gutterBottom>
        Ready to Grade
      </Typography>
      
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" color="text.secondary">Assignment:</Typography>
          <Typography variant="body1">{gradingState.assignment?.name}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" color="text.secondary">Rubric:</Typography>
          <Typography variant="body1">{gradingState.rubric?.name}</Typography>
        </Grid>
      </Grid>

      {/* Trial Status Warning */}
      {!isAuthenticated && !canGrade && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Free Trial: {maxAttempts - attemptsUsed} attempts remaining. 
          <Button 
            size="small" 
            onClick={() => router.push('/login')}
            sx={{ ml: 1 }}
          >
            Login for unlimited access
          </Button>
        </Alert>
      )}
      
      {/* Welcome message for authenticated users */}
      {isAuthenticated && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Welcome back! You have unlimited access to all grading features.
        </Alert>
      )}

      <Button
        variant="contained"
        size="large"
        fullWidth
        startIcon={<StartIcon />}
        onClick={handleStartGrading}
        disabled={gradingState.loading || (!canGrade && !isAuthenticated)}
      >
        {gradingState.loading ? 'Grading...' : 'Start Grading'}
      </Button>

      {gradingState.loading && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress />
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
            AI is analyzing your assignment...
          </Typography>
        </Box>
      )}
    </Card>
  );

  const renderResults = () => (
    <Card sx={{ p: 4 }}>
      <Typography variant="h5" gutterBottom>
        Grading Results
          </Typography>
          
      {gradingState.result && (
        <Box>
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Chip
              icon={<GradeIcon />}
              label={`Score: ${gradingState.result.score || 'N/A'}`}
              color="primary"
              size="large"
              sx={{ fontSize: '1.2rem', py: 3, px: 2 }}
            />
            {gradingState.result.percentage && gradingState.result.grade_letter && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" color="primary.main">
                  {gradingState.result.percentage}% - Grade: {gradingState.result.grade_letter}
                </Typography>
              </Box>
            )}
              </Box>

          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Detailed Feedback</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body1">
                {gradingState.result.feedback || 'No detailed feedback available.'}
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Criteria Breakdown</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {gradingState.result.criteria_scores && Array.isArray(gradingState.result.criteria_scores) ? (
                <Grid container spacing={2}>
                  {gradingState.result.criteria_scores.map((criterion: any, index: number) => (
                    <Grid item xs={12} sm={6} key={index}>
                      <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="subtitle2">{criterion.name}</Typography>
                        <Typography variant="body1" color="primary.main">
                          {criterion.points}/{criterion.max_points} points
                        </Typography>
                        {criterion.feedback && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            {criterion.feedback}
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography>No criteria breakdown available.</Typography>
              )}
            </AccordionDetails>
          </Accordion>

          {gradingState.result.mistakes && Array.isArray(gradingState.result.mistakes) && gradingState.result.mistakes.length > 0 && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Suggestions for Improvement</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box>
                  {gradingState.result.mistakes.map((mistake: any, index: number) => (
                    <Box key={index} sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'flex-start' }}>
                        <Typography component="span" sx={{ mr: 1, fontWeight: 'bold' }}>•</Typography>
                        {mistake.description}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>
          )}
        </Box>
      )}

      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button variant="outlined" onClick={resetGrading} fullWidth>
          Grade Another Assignment
        </Button>
        <Button variant="contained" onClick={() => router.push('/rubrics')} fullWidth>
          Manage Rubrics
            </Button>
          </Box>
    </Card>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        {/* Header content removed */}
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

      {/* Progress Indicator */}
      <Box sx={{ mb: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Stepper activeStep={gradingState.step} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>
      </Box>

      {/* Main Content */}
      {gradingState.result ? (
        renderResults()
      ) : (
        <>
          {gradingState.step === 0 && renderUploadStep()}
          {gradingState.step === 1 && renderRubricStep()}
          {gradingState.step === 2 && renderGradingStep()}
        </>
      )}

      {/* Login Modal */}
      <Dialog open={showLoginModal} onClose={() => setShowLoginModal(false)}>
        <DialogTitle>Login Required</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {!canUseFreeTrial 
              ? "You've used all your free trial attempts. Please login to continue grading assignments."
              : "Please login to access unlimited grading features."
            }
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create a free account to get unlimited grading access.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowLoginModal(false)}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={<LoginIcon />}
            onClick={() => {
              setShowLoginModal(false);
              router.push('/login');
            }}
          >
            Login
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default HomePage; 