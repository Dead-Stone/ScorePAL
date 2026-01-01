/**
 * ScorePAL - AI-Powered Academic Grading Assistant
 * Single & Batch Grading Interface
 * Statically generated at build time - data fetched client-side
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 * @repository https://github.com/Dead-Stone/ScorePAL
 */

import React, { useState, useEffect } from 'react';
import { GetStaticProps } from 'next';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  Card,
  CardContent,
  CardActions,
  TextField,
  Tab,
  Tabs,
  CircularProgress,
  Snackbar,
  Alert,
  IconButton,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Divider,
  Chip,
} from '@mui/material';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { GradePageDocumentation } from '../components/PageDocumentation';
import { useAuth } from '../contexts/AuthContext';
import { CanvasIntegrationTab } from '../components/grading/CanvasIntegrationTab';
import { SingleGradingSteps } from '../components/grading/SingleGradingSteps';
import { CanvasGradingSteps } from '../components/grading/CanvasGradingSteps';
import { PageLayout } from '../components/layout/PageLayout';
import { PageHeader } from '../components/common/PageHeader';
import { styled } from '@mui/material/styles';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import InfoIcon from '@mui/icons-material/Info';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DescriptionIcon from '@mui/icons-material/Description';
import CreateIcon from '@mui/icons-material/Create';
import BarChartIcon from '@mui/icons-material/BarChart';
import SchoolIcon from '@mui/icons-material/School';
import PsychologyIcon from '@mui/icons-material/Psychology';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { API_BASE_URL } from '@/config/api';
import ModelSelectionDialog from '../components/ModelSelectionDialog';

// Configure axios with base URL and default headers
axios.defaults.baseURL = API_BASE_URL;
axios.defaults.headers.common['Accept'] = 'application/json';
axios.defaults.headers.post['Content-Type'] = 'application/json';

// Type definitions
interface Rubric {
  id: string;
  name: string;
  total_points: number;
  sections: RubricSection[];
}

interface RubricSection {
  name: string;
  max_points: number;
  criteria: RubricCriterion[];
}

interface RubricCriterion {
  name: string;
  points: number;
  description: string;
  grading_scale: GradingScale[];
}

interface GradingScale {
  level: string;
  points: number;
  description: string;
}

interface ModelSelection {
  model_config_id: string;
  provider: string;
  model_name: string;
  custom_temperature?: number | null;
  custom_max_tokens?: number | null;
  use_streaming?: boolean;
}

// Styled components
const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

const DropzoneContainer = styled('div')(({ theme }) => ({
  border: `2px dashed ${theme.palette.primary.main}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(4),
  textAlign: 'center',
  cursor: 'pointer',
  marginTop: theme.spacing(2),
  backgroundColor: theme.palette.background.default,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const GradientPaper = styled(Paper)(({ theme }) => ({
  borderRadius: '16px',
  padding: theme.spacing(3),
  background: `linear-gradient(to right bottom, ${theme.palette.primary.light}, ${theme.palette.primary.main})`,
  color: theme.palette.primary.contrastText,
  marginBottom: theme.spacing(4),
}));

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

// Main component
// Static generation - compile at build time only
export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {},
    revalidate: 3600, // Revalidate every hour
  };
};

export default function Home() {
  const router = useRouter();
  const { checkGradingPermission, incrementGradingCount } = useAuth();
  
  // Tab state
  const [currentTab, setCurrentTab] = useState(0);
  
  // State for single submission form
  const [singleForm, setSingleForm] = useState({
    studentName: '',
    assignmentName: '',
    questionPaper: null as File | null,
    submission: null as File | null,
    answerKey: null as File | null,
    rubricId: '',
    generatedRubric: null as any,
  });
  
  // Loading and notification state
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning',
  });
  
  // Add a state for strictness
  const [strictness, setStrictness] = useState(0.5);
  
  // State for rubrics
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [loadingRubrics, setLoadingRubrics] = useState(false);
  
  // State for AI model selection
  const [selectedModel, setSelectedModel] = useState<ModelSelection | null>(null);
  const [modelSelectionOpen, setModelSelectionOpen] = useState(false);
  const [estimatedTokens, setEstimatedTokens] = useState(0);
  
  // Fetch rubrics on component mount
  useEffect(() => {
    const fetchRubrics = async () => {
      try {
        setLoadingRubrics(true);
        const response = await axios.get('/rubrics');
        if (response.data && Array.isArray(response.data.rubrics)) {
          setRubrics(response.data.rubrics);
        }
      } catch (error) {
        console.error('Error fetching rubrics:', error);
        setNotification({
          open: true,
          message: 'Failed to load rubrics. Using default rubric instead.',
          severity: 'warning',
        });
      } finally {
        setLoadingRubrics(false);
      }
    };
    
    fetchRubrics();
  }, []);
  
  // Handle single form field changes
  const handleSingleFormChange = (field: string, value: any) => {
    setSingleForm(prev => ({ ...prev, [field]: value }));
    
    // Estimate tokens when content changes
    if (field === 'submission' || field === 'answerKey' || field === 'questionPaper') {
      estimateTokensForGrading();
    }
  };
  
  // Estimate tokens for grading
  const estimateTokensForGrading = () => {
    let totalText = '';
    
    // Add text content from files (simplified estimation)
    if (singleForm.submission) {
      totalText += `Submission content (estimated): ${singleForm.submission.size / 4} characters\n`;
    }
    if (singleForm.answerKey) {
      totalText += `Answer key content (estimated): ${singleForm.answerKey.size / 4} characters\n`;
    }
    if (singleForm.questionPaper) {
      totalText += `Question content (estimated): ${singleForm.questionPaper.size / 4} characters\n`;
    }
    
    // Rough token estimation: ~4 characters per token
    const estimated = Math.ceil(totalText.length / 4);
    setEstimatedTokens(Math.max(estimated, 500)); // Minimum estimate for grading prompt
  };
  
  // Handle model selection
  const handleModelSelect = (modelSelection: ModelSelection) => {
    setSelectedModel(modelSelection);
    setModelSelectionOpen(false);
  };
  
  // Open model selection dialog
  const openModelSelection = () => {
    estimateTokensForGrading();
    setModelSelectionOpen(true);
  };
  
  // Dropzone for question paper in single mode
  const questionPaperDropzone = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
    },
    maxFiles: 1,
    onDrop: acceptedFiles => {
      if (acceptedFiles.length > 0) {
          handleSingleFormChange('questionPaper', acceptedFiles[0]);
      }
    },
  });
  
  // Dropzone for answer key
  const answerKeyDropzone = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    onDrop: acceptedFiles => {
      if (acceptedFiles.length > 0) {
        handleSingleFormChange('answerKey', acceptedFiles[0]);
      }
    },
  });
  
  // Dropzone for submission in single mode
  const submissionDropzone = useDropzone({
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    onDrop: acceptedFiles => {
      if (acceptedFiles.length > 0) {
        handleSingleFormChange('submission', acceptedFiles[0]);
      }
    },
  });
  
  // Handle submission of single form
  const handleSingleSubmit = async () => {
    try {
      // Validate form
      if (!singleForm.studentName) {
        setNotification({
          open: true,
          message: 'Please enter a student name',
          severity: 'error',
        });
        return;
      }
      
      if (!singleForm.assignmentName) {
        setNotification({
          open: true,
          message: 'Please enter an assignment name',
          severity: 'error',
        });
        return;
      }
      
      if (!singleForm.questionPaper) {
        setNotification({
          open: true,
          message: 'Please upload a question paper',
          severity: 'error',
        });
        return;
      }
      
      if (!singleForm.submission) {
        setNotification({
          open: true,
          message: 'Please upload a submission',
          severity: 'error',
        });
        return;
      }
      
      setIsLoading(true);
      
      // Create form data
      const formData = new FormData();
      formData.append('student_name', singleForm.studentName);
      formData.append('assignment_name', singleForm.assignmentName);
      formData.append('question_paper', singleForm.questionPaper);
      formData.append('submission', singleForm.submission);
      formData.append('strictness', strictness.toString());
      
      if (singleForm.answerKey) {
        formData.append('answer_key', singleForm.answerKey);
      }
      
      if (singleForm.rubricId) {
        if (singleForm.rubricId === 'generated' && singleForm.generatedRubric) {
          // If using generated rubric, send it as JSON
          formData.append('rubric_json', JSON.stringify(singleForm.generatedRubric));
        } else {
          formData.append('rubric_id', singleForm.rubricId);
        }
      }
      
      // Include AI model selection if available
      if (selectedModel) {
        formData.append('ai_model_selection', JSON.stringify(selectedModel));
      }
      
      // Send request
      const response = await axios.post('/upload-single', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Handle response
      if (response.data && response.data.upload_id) {
        // Navigate to results page
        router.replace(`/results/${response.data.upload_id}`);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setNotification({
        open: true,
        message: 'Failed to submit form. Please try again.',
        severity: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle close notification
  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };
  
  return (
    <ProtectedRoute>
      <PageLayout maxWidth="lg">
        {/* Documentation */}
        <GradePageDocumentation />
        
        <PageHeader
          title="AI-Powered Grading"
          subtitle="Grade assignments quickly, consistently, and objectively with AI assistance"
        />
      
      {/* Tabs for Grading Options */}
      <Paper 
        elevation={0} 
        sx={{ 
          borderRadius: 2, 
          overflow: 'hidden', 
          mb: 4,
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Tabs 
          value={currentTab} 
          onChange={(e, newValue) => setCurrentTab(newValue)}
          sx={{ 
            bgcolor: 'white',
            '& .MuiTab-root': {
              textTransform: 'none',
              fontSize: '0.95rem',
              fontWeight: 500,
              minHeight: 56,
              '&.Mui-selected': {
                color: '#1D80C3',
              }
            },
            '& .MuiTabs-indicator': {
              height: 3,
              bgcolor: '#1D80C3',
            }
          }}
        >
          <Tab 
            icon={<PersonIcon />} 
            iconPosition="start"
            label="Single Submission" 
            id="tab-0"
            aria-controls="tabpanel-0"
          />
          <Tab 
            icon={
              <Box
                component="img"
                src="/canvas-logo.jpg"
                alt="Canvas"
                sx={{
                  width: 20,
                  height: 20,
                  objectFit: 'contain',
                }}
              />
            }
            iconPosition="start"
            label="Canvas Integration" 
            id="tab-1"
            aria-controls="tabpanel-1"
          />
          <Tab 
            icon={
              <Box
                component="img"
                src="/moodle-logo.png"
                alt="Moodle"
                sx={{
                  width: 20,
                  height: 20,
                  objectFit: 'contain',
                  opacity: 0.5,
                }}
              />
            }
            iconPosition="start"
            label="Moodle Integration" 
            id="tab-2"
            aria-controls="tabpanel-2"
            disabled
          />
        </Tabs>
        
        {/* Single Submission Tab */}
        <TabPanel value={currentTab} index={0}>
          <SingleGradingSteps
            onComplete={async (data) => {
              // Update form state with step data
              setSingleForm({
                studentName: data.studentName,
                assignmentName: data.assignmentName,
                questionPaper: data.questionPaper,
                submission: data.submission,
                answerKey: data.answerKey,
                rubricId: data.rubricId,
                generatedRubric: data.generatedRubric,
              });
              setStrictness(data.strictness);
              if (data.selectedModel) {
                setSelectedModel(data.selectedModel);
              }
              // Trigger the actual grading
              await handleSingleSubmit();
            }}
            isLoading={isLoading}
            rubrics={rubrics}
            loadingRubrics={loadingRubrics}
          />
          
          {/* Keep old form as fallback or remove if not needed */}
          {false && <Box>
          <Typography variant="h6" gutterBottom>
            Grade Individual Submission
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Upload a single student submission for quick grading.
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Student Name"
                fullWidth
                value={singleForm.studentName}
                onChange={(e) => handleSingleFormChange('studentName', e.target.value)}
                required
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Assignment Name"
                fullWidth
                value={singleForm.assignmentName}
                onChange={(e) => handleSingleFormChange('assignmentName', e.target.value)}
                required
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="single-rubric-select-label">Rubric</InputLabel>
                <Select
                  labelId="single-rubric-select-label"
                  id="single-rubric-select"
                  value={singleForm.rubricId}
                  label="Rubric"
                  onChange={(e) => handleSingleFormChange('rubricId', e.target.value)}
                  disabled={loadingRubrics}
                  startAdornment={loadingRubrics ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
                >
                  <MenuItem value="">
                    <em>Default Rubric</em>
                  </MenuItem>
                  {rubrics.map((rubric) => (
                    <MenuItem key={rubric.id} value={rubric.id}>
                      {rubric.name} ({rubric.total_points} points)
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  Select a rubric or use the default
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
              <Typography variant="subtitle1" gutterBottom>
                Grading Strictness
                <IconButton
                  size="small"
                  onClick={() => setNotification({
                    open: true,
                    message: "Higher strictness means more rigorous grading with potentially lower scores. Lower strictness is more lenient.",
                    severity: "info",
                  })}
                >
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Typography>
              <Box sx={{ px: 2 }}>
                <Slider
                  value={strictness}
                  min={0}
                  max={1}
                  step={0.1}
                  marks={[
                    { value: 0, label: 'Lenient' },
                    { value: 0.5, label: 'Moderate' },
                    { value: 1, label: 'Strict' },
                  ]}
                  onChange={(_, value) => setStrictness(value as number)}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
                />
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                AI Model Selection
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<PsychologyIcon />}
                  onClick={openModelSelection}
                  sx={{ minWidth: 200 }}
                >
                  {selectedModel ? 'Change AI Model' : 'Select AI Model'}
                </Button>
                
                {selectedModel && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={`${selectedModel.provider} - ${selectedModel.model_name}`}
                      color="primary"
                      variant="outlined"
                    />
                    {estimatedTokens > 0 && (
                      <Chip
                        label={`~${estimatedTokens.toLocaleString()} tokens`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>
                )}
              </Box>
              
              {!selectedModel && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  No AI model selected. The system will use your default configuration.
                </Alert>
              )}
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                Upload Files
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" gutterBottom>
                Question Paper (Required)
              </Typography>
              <DropzoneContainer {...questionPaperDropzone.getRootProps()}>
                <input {...questionPaperDropzone.getInputProps()} />
                <CloudUploadIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="body2">
                  {singleForm.questionPaper 
                    ? `Selected: ${singleForm.questionPaper.name}` 
                    : 'Drag and drop or click to select question paper (PDF/DOCX)'}
                </Typography>
              </DropzoneContainer>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" gutterBottom>
                Student Submission (Required)
              </Typography>
              <DropzoneContainer {...submissionDropzone.getRootProps()}>
                <input {...submissionDropzone.getInputProps()} />
                <CloudUploadIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="body2">
                  {singleForm.submission 
                    ? `Selected: ${singleForm.submission.name}` 
                    : 'Drag and drop or click to select student submission (PDF only)'}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Support for DOCX, TXT, and other formats coming soon!
                </Typography>
              </DropzoneContainer>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" gutterBottom>
                Answer Key (Optional)
              </Typography>
              <DropzoneContainer {...answerKeyDropzone.getRootProps()}>
                <input {...answerKeyDropzone.getInputProps()} />
                <CloudUploadIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="body2">
                  {singleForm.answerKey 
                    ? `Selected: ${singleForm.answerKey.name}` 
                    : 'Drag and drop or click to select answer key (PDF/DOCX/TXT) - Optional'}
                </Typography>
              </DropzoneContainer>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleSingleSubmit}
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} /> : <PlayArrowIcon />}
              sx={{ px: 4, py: 1 }}
            >
              {isLoading ? 'Processing...' : 'Grade Submission'}
            </Button>
          </Box>
          </Box>}
        </TabPanel>
        
        {/* Canvas Integration Tab */}
        <TabPanel value={currentTab} index={1}>
          <CanvasIntegrationTab />
        </TabPanel>

        {/* Moodle Integration Tab */}
        <TabPanel value={currentTab} index={2}>
          <Box>
            <Typography variant="h6" gutterBottom>
              Moodle LMS Integration
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Moodle integration is coming soon. This feature will allow you to grade assignments directly from your Moodle courses.
            </Typography>
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Chip
                label="Coming Soon"
                color="default"
                sx={{ opacity: 0.6 }}
              />
            </Box>
          </Box>
        </TabPanel>
      </Paper>
      
      {/* Notification snackbar */}
      <Snackbar 
        open={notification.open} 
        autoHideDuration={6000} 
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity}>
          {notification.message}
        </Alert>
      </Snackbar>
      
      {/* Model Selection Dialog */}
      <ModelSelectionDialog
        open={modelSelectionOpen}
        onClose={() => setModelSelectionOpen(false)}
        onSelect={handleModelSelect}
        currentSelection={selectedModel}
        estimatedTokens={estimatedTokens}
      />
      </PageLayout>
    </ProtectedRoute>
  );
}