/**
 * SingleGradingSteps - Step-by-step flow for single submission grading
 * Similar to demo but with 5 steps (one more than demo)
 */

import React, { useState } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Typography,
  Paper,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Chip,
  Tabs,
  Tab,
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Description as DescriptionIcon,
  Settings as SettingsIcon,
  PlayArrow as PlayArrowIcon,
  CheckCircle as CheckCircleIcon,
  Assessment as AssessmentIcon,
  AutoAwesome as AutoAwesomeIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { API_BASE_URL } from '@/config/api';

interface SingleGradingStepsProps {
  onComplete: (data: {
    studentName: string;
    assignmentName: string;
    questionPaper: File | null;
    submission: File | null;
    answerKey: File | null;
    rubricId: string;
    strictness: number;
    selectedModel?: any;
    generatedRubric?: any;
  }) => void;
  isLoading?: boolean;
  rubrics: any[];
  loadingRubrics: boolean;
  onModelSelect?: () => void;
  selectedModel?: any;
}

const steps = [
  { label: 'Upload Files', icon: <CloudUploadIcon /> },
  { label: 'Select Rubric', icon: <DescriptionIcon /> },
  { label: 'Configure Settings', icon: <SettingsIcon /> },
  { label: 'Grade Submission', icon: <PlayArrowIcon /> },
  { label: 'View Results', icon: <AssessmentIcon /> },
];

export const SingleGradingSteps: React.FC<SingleGradingStepsProps> = ({
  onComplete,
  isLoading = false,
  rubrics,
  loadingRubrics,
  onModelSelect,
  selectedModel,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [studentName, setStudentName] = useState('');
  const [assignmentName, setAssignmentName] = useState('');
  const [questionPaper, setQuestionPaper] = useState<File | null>(null);
  const [submission, setSubmission] = useState<File | null>(null);
  const [answerKey, setAnswerKey] = useState<File | null>(null);
  const [rubricId, setRubricId] = useState('');
  const [strictness, setStrictness] = useState(0.5);
  const [error, setError] = useState('');
  const [rubricMode, setRubricMode] = useState<'select' | 'generate'>('select');
  const [rubricNotes, setRubricNotes] = useState('');
  const [isGeneratingRubric, setIsGeneratingRubric] = useState(false);
  const [generatedRubric, setGeneratedRubric] = useState<any>(null);
  const [totalPoints, setTotalPoints] = useState('100');

  // Dropzones
  const questionPaperDropzone = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
    },
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setQuestionPaper(acceptedFiles[0]);
        setError('');
      }
    },
    multiple: false,
  });

  const submissionDropzone = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
    },
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setSubmission(acceptedFiles[0]);
        setError('');
      }
    },
    multiple: false,
  });

  const answerKeyDropzone = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
    },
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setAnswerKey(acceptedFiles[0]);
        setError('');
      }
    },
    multiple: false,
  });

  const handleNext = () => {
    setError('');
    
    // Validation for each step
    if (activeStep === 0) {
      if (!studentName.trim() || !assignmentName.trim()) {
        setError('Please enter student name and assignment name');
        return;
      }
      if (!questionPaper || !submission) {
        setError('Please upload question paper and submission');
        return;
      }
    } else if (activeStep === 1) {
      if (rubricMode === 'select' && !rubricId) {
        setError('Please select a rubric');
        return;
      }
      if (rubricMode === 'generate' && !generatedRubric && !rubricId) {
        setError('Please generate a rubric or select an existing one');
        return;
      }
    }
    
    if (activeStep === steps.length - 2) {
      // Last step before results - trigger grading
      // Use generated rubric if available, otherwise use selected rubricId
      const finalRubricId = (rubricMode === 'generate' && generatedRubric) ? 'generated' : rubricId;
      
      onComplete({
        studentName,
        assignmentName,
        questionPaper,
        submission,
        answerKey,
        rubricId: finalRubricId,
        strictness,
        selectedModel,
        generatedRubric: rubricMode === 'generate' ? generatedRubric : undefined,
      });
      setActiveStep(activeStep + 1);
    } else {
      setActiveStep(activeStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(activeStep - 1);
    setError('');
  };

  const generateRubric = async () => {
    if (!questionPaper) {
      setError('Please upload a question paper first');
      return;
    }

    setIsGeneratingRubric(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('question_paper', questionPaper);
      formData.append('rubric_context', rubricNotes || 'Generate a comprehensive grading rubric based on this assignment.');
      formData.append('total_points', totalPoints);

      const response = await axios.post(`${API_BASE_URL}/api/grade-public/generate-rubric`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.status === 'success') {
        const generated = response.data.rubric;
        setGeneratedRubric(generated);
        setRubricId('generated');
      } else {
        setError('Failed to generate rubric');
      }
    } catch (err: any) {
      console.error('Error generating rubric:', err);
      setError(err.response?.data?.detail || 'Error generating rubric');
    } finally {
      setIsGeneratingRubric(false);
    }
  };

  const saveGeneratedRubric = async () => {
    if (!generatedRubric) return;

    try {
      const response = await axios.post('/api/rubrics', {
        name: `AI Generated Rubric - ${assignmentName || 'Assignment'}`,
        criteria: generatedRubric.criteria,
        total_points: generatedRubric.total_points || totalPoints,
        description: `AI-generated rubric based on question paper${rubricNotes ? ` and notes: ${rubricNotes}` : ''}`,
      });

      if (response.data?.rubric?.id) {
        setRubricId(response.data.rubric.id);
        setError('');
      }
    } catch (err: any) {
      console.error('Error saving rubric:', err);
      setError(err.response?.data?.detail || 'Failed to save rubric');
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    setStudentName('');
    setAssignmentName('');
    setQuestionPaper(null);
    setSubmission(null);
    setAnswerKey(null);
    setRubricId('');
    setStrictness(0.5);
    setError('');
    setRubricMode('select');
    setRubricNotes('');
    setGeneratedRubric(null);
    setTotalPoints('100');
  };

  return (
    <Box>
      <Stepper activeStep={activeStep} orientation="vertical">
        {/* Step 1: Upload Files */}
        <Step>
          <StepLabel StepIconComponent={() => <CloudUploadIcon />}>
            Upload Files
          </StepLabel>
          <StepContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Student Name"
                  fullWidth
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  required
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Assignment Name"
                  fullWidth
                  value={assignmentName}
                  onChange={(e) => setAssignmentName(e.target.value)}
                  required
                  margin="normal"
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Paper
                  {...questionPaperDropzone.getRootProps()}
                  sx={{
                    p: 3,
                    border: '2px dashed',
                    borderColor: questionPaper ? 'success.main' : 'grey.300',
                    textAlign: 'center',
                    cursor: 'pointer',
                    '&:hover': { borderColor: 'primary.main' },
                  }}
                >
                  <input {...questionPaperDropzone.getInputProps()} />
                  <CloudUploadIcon sx={{ fontSize: 40, mb: 1, color: 'primary.main' }} />
                  <Typography variant="body2">
                    {questionPaper ? questionPaper.name : 'Question Paper (Required)'}
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Paper
                  {...submissionDropzone.getRootProps()}
                  sx={{
                    p: 3,
                    border: '2px dashed',
                    borderColor: submission ? 'success.main' : 'grey.300',
                    textAlign: 'center',
                    cursor: 'pointer',
                    '&:hover': { borderColor: 'primary.main' },
                  }}
                >
                  <input {...submissionDropzone.getInputProps()} />
                  <CloudUploadIcon sx={{ fontSize: 40, mb: 1, color: 'primary.main' }} />
                  <Typography variant="body2">
                    {submission ? submission.name : 'Student Submission (Required)'}
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Paper
                  {...answerKeyDropzone.getRootProps()}
                  sx={{
                    p: 3,
                    border: '2px dashed',
                    borderColor: answerKey ? 'success.main' : 'grey.300',
                    textAlign: 'center',
                    cursor: 'pointer',
                    '&:hover': { borderColor: 'primary.main' },
                  }}
                >
                  <input {...answerKeyDropzone.getInputProps()} />
                  <CloudUploadIcon sx={{ fontSize: 40, mb: 1, color: 'primary.main' }} />
                  <Typography variant="body2">
                    {answerKey ? answerKey.name : 'Answer Key (Optional)'}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
            
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            
            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button onClick={handleNext} variant="contained">
                Next
              </Button>
            </Box>
          </StepContent>
        </Step>

        {/* Step 2: Select or Generate Rubric */}
        <Step>
          <StepLabel StepIconComponent={() => <DescriptionIcon />}>
            Select or Generate Rubric
          </StepLabel>
          <StepContent>
            <Tabs 
              value={rubricMode} 
              onChange={(e, newValue) => setRubricMode(newValue)}
              sx={{ mb: 3 }}
            >
              <Tab label="Select Existing" value="select" />
              <Tab label="Generate AI Rubric" value="generate" icon={<AutoAwesomeIcon />} iconPosition="start" />
            </Tabs>

            {rubricMode === 'select' ? (
              <>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Rubric</InputLabel>
                  <Select
                    value={rubricId}
                    onChange={(e) => setRubricId(e.target.value)}
                    label="Rubric"
                    disabled={loadingRubrics}
                  >
                    <MenuItem value="">Select a rubric</MenuItem>
                    {rubrics.map((rubric) => (
                      <MenuItem key={rubric.id} value={rubric.id}>
                        {rubric.name} ({rubric.total_points} points)
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            ) : (
              <>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Generate an AI-powered rubric based on your question paper and additional notes.
                </Alert>
                
                {!questionPaper && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Please upload a question paper in Step 1 to generate a rubric.
                  </Alert>
                )}

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      label="Total Points"
                      type="number"
                      fullWidth
                      value={totalPoints}
                      onChange={(e) => setTotalPoints(e.target.value)}
                      margin="normal"
                      inputProps={{ min: 1, max: 1000 }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Additional Notes / Context (Optional)"
                      fullWidth
                      multiline
                      rows={4}
                      value={rubricNotes}
                      onChange={(e) => setRubricNotes(e.target.value)}
                      margin="normal"
                      placeholder="Add any specific requirements, grading criteria, or context for the rubric..."
                      helperText="Provide additional context to help the AI generate a more accurate rubric"
                    />
                  </Grid>
                </Grid>

                <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    onClick={generateRubric}
                    disabled={!questionPaper || isGeneratingRubric}
                    startIcon={isGeneratingRubric ? <CircularProgress size={20} /> : <AutoAwesomeIcon />}
                  >
                    {isGeneratingRubric ? 'Generating...' : 'Generate Rubric'}
                  </Button>
                </Box>

                {generatedRubric && (
                  <Card sx={{ mt: 3 }}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">
                          Generated Rubric
                        </Typography>
                        <Chip 
                          label={`${generatedRubric.total_points || totalPoints} points`} 
                          color="primary" 
                        />
                      </Box>
                      
                      <List>
                        {generatedRubric.criteria?.map((criterion: any, index: number) => (
                          <ListItem key={index} sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                            <Box display="flex" justifyContent="space-between" width="100%" mb={1}>
                              <Typography variant="subtitle1" fontWeight="bold">
                                {criterion.name}
                              </Typography>
                              <Chip 
                                label={`${criterion.max_points} pts`} 
                                size="small" 
                                color="primary"
                              />
                            </Box>
                            {criterion.description && (
                              <Typography variant="body2" color="text.secondary">
                                {criterion.description}
                              </Typography>
                            )}
                            {index < generatedRubric.criteria.length - 1 && <Divider sx={{ width: '100%', mt: 1 }} />}
                          </ListItem>
                        ))}
                      </List>

                      <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                        <Button
                          variant="outlined"
                          startIcon={<SaveIcon />}
                          onClick={saveGeneratedRubric}
                        >
                          Save Rubric
                        </Button>
                        <Button
                          variant="contained"
                          onClick={() => {
                            setRubricId('generated');
                            setError('');
                          }}
                        >
                          Use This Rubric
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
            
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            
            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button onClick={handleBack}>Back</Button>
              <Button 
                onClick={handleNext} 
                variant="contained"
                disabled={
                  (rubricMode === 'select' && !rubricId) || 
                  (rubricMode === 'generate' && !generatedRubric && !rubricId)
                }
              >
                Next
              </Button>
            </Box>
          </StepContent>
        </Step>

        {/* Step 3: Configure Settings (NEW STEP) */}
        <Step>
          <StepLabel StepIconComponent={() => <SettingsIcon />}>
            Configure Settings
          </StepLabel>
          <StepContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      Grading Strictness
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Adjust how strict the AI grading should be (0.0 = lenient, 1.0 = strict)
                    </Typography>
                    <Box sx={{ px: 2, py: 2 }}>
                      <Slider
                        value={strictness}
                        onChange={(e, newValue) => setStrictness(newValue as number)}
                        min={0}
                        max={1}
                        step={0.1}
                        marks={[
                          { value: 0, label: 'Lenient' },
                          { value: 0.5, label: 'Moderate' },
                          { value: 1, label: 'Strict' },
                        ]}
                        valueLabelDisplay="auto"
                      />
                      <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                        Current: {Math.round(strictness * 100)}% strict
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              {onModelSelect && (
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        AI Model Selection
                      </Typography>
                      <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Button
                          variant="outlined"
                          onClick={onModelSelect}
                          sx={{ minWidth: 200 }}
                        >
                          {selectedModel ? 'Change AI Model' : 'Select AI Model'}
                        </Button>
                        {selectedModel && (
                          <Chip
                            label={`${selectedModel.provider} - ${selectedModel.model_name}`}
                            color="primary"
                            variant="outlined"
                          />
                        )}
                      </Box>
                      {!selectedModel && (
                        <Alert severity="info" sx={{ mt: 2 }}>
                          No AI model selected. The system will use your default configuration.
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
            
            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button onClick={handleBack}>Back</Button>
              <Button onClick={handleNext} variant="contained">
                Next
              </Button>
            </Box>
          </StepContent>
        </Step>

        {/* Step 4: Grade Submission */}
        <Step>
          <StepLabel StepIconComponent={() => <PlayArrowIcon />}>
            Grade Submission
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              {isLoading ? (
                <>
                  <CircularProgress size={60} sx={{ mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Grading in Progress...
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Our AI is analyzing the submission and providing detailed feedback
                  </Typography>
                </>
              ) : (
                <>
                  <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Ready to Grade
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Review your settings and click "Start Grading" to begin
                  </Typography>
                  <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
                    <Button onClick={handleBack}>Back</Button>
                    <Button onClick={handleNext} variant="contained" size="large">
                      Start Grading
                    </Button>
                  </Box>
                </>
              )}
            </Paper>
          </StepContent>
        </Step>

        {/* Step 5: View Results */}
        <Step>
          <StepLabel StepIconComponent={() => <AssessmentIcon />}>
            View Results
          </StepLabel>
          <StepContent>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Grading Complete!
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Results will be displayed here. Check the results page for detailed feedback.
              </Typography>
              <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button onClick={handleReset} variant="outlined">
                  Grade Another
                </Button>
              </Box>
            </Paper>
          </StepContent>
        </Step>
      </Stepper>
    </Box>
  );
};

