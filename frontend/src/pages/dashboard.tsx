import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
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
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/router';

// Configure axios with base URL and default headers
axios.defaults.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
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
  borderRadius: '20px',
  padding: theme.spacing(4),
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  marginBottom: theme.spacing(6),
  border: 'none',
  boxShadow: '0 10px 25px rgba(102, 126, 234, 0.3)',
}));

const ModernCard = styled(Card)(({ theme }) => ({
  borderRadius: '20px',
  border: '1px solid #e5e7eb',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
    border: '1px solid #667eea',
  },
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
export default function Dashboard() {
  const router = useRouter();
  
  // State for single submission form
  const [singleForm, setSingleForm] = useState({
    studentName: '',
    assignmentName: '',
    questionPaper: null as File | null,
    submission: null as File | null,
    answerKey: null as File | null,
    rubricId: '',
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
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
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
        formData.append('rubric_id', singleForm.rubricId);
      }
      
      // Send request
      const response = await axios.post('/upload-single', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Handle response
      if (response.data && response.data.upload_id) {
        // Show success message instead of navigating to results
        setNotification({
          open: true,
          message: 'Assignment graded successfully! Results will be available in future releases.',
          severity: 'success',
        });
        
        // Reset form
        setSingleForm({
          studentName: '',
          assignmentName: '',
          questionPaper: null,
          submission: null,
          answerKey: null,
          rubricId: '',
        });
        setStrictness(0.5); // Reset strictness to default
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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Hero Section */}
      <GradientPaper elevation={3}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
            <Box
              component="img"
              src="/icons/scorepal_128x128.png"
              alt="ScorePAL Logo"
              sx={{
                width: 80,
                height: 80,
                borderRadius: 3,
                boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
                border: '4px solid rgba(255,255,255,0.2)',
              }}
            />
            <Box>
              <Typography variant="h3" component="h1" fontWeight="800" gutterBottom sx={{ color: 'white' }}>
                AI-Powered Grading Assistant
              </Typography>
              <Typography variant="h5" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 300 }}>
                Grade assignments faster with intelligent automation
        </Typography>
            </Box>
          </Box>
          
          <Typography variant="h6" gutterBottom sx={{ color: 'rgba(255,255,255,0.95)', mb: 4 }}>
            Grade assignments quickly, consistently, and objectively with advanced AI assistance
        </Typography>
          
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Button 
            variant="contained" 
            size="large"
              onClick={() => {
                document.getElementById('single-submission-form')?.scrollIntoView({ 
                  behavior: 'smooth' 
                });
              }}
            sx={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(8px)',
              color: 'white', 
                border: '2px solid rgba(255, 255, 255, 0.3)',
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
              '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
              }
            }}
            startIcon={<PersonIcon />}
          >
              Start Grading
          </Button>
          <Button 
            variant="outlined" 
            size="large"
            onClick={() => router.push('/canvas')}
            sx={{ 
              color: 'white', 
              borderColor: 'rgba(255, 255, 255, 0.5)',
                borderWidth: 2,
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
              '&:hover': {
                borderColor: 'white',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderWidth: 2,
                  transform: 'translateY(-2px)',
              }
            }}
            startIcon={<SchoolIcon />}
          >
            Canvas Integration
          </Button>
          </Box>
        </Box>
      </GradientPaper>
      
      {/* Quick Action Cards */}
      <Grid container spacing={4} sx={{ mb: 6 }}>
        <Grid item xs={12} md={4}>
          <ModernCard sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            cursor: 'pointer',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #667eea, #764ba2)',
            }
          }}>
            <CardContent sx={{ flexGrow: 1, textAlign: 'center', pt: 5, px: 4 }}>
              <Box sx={{ 
                display: 'inline-flex', 
                p: 3, 
                borderRadius: 4, 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                mb: 4,
                boxShadow: '0 8px 20px rgba(102, 126, 234, 0.3)',
              }}>
                <CreateIcon sx={{ fontSize: 40, color: 'white' }} />
              </Box>
              <Typography variant="h5" gutterBottom fontWeight="700" sx={{ color: '#000000', mb: 2 }}>
                Create Rubrics
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7, fontSize: '1.1rem' }}>
                Design custom grading rubrics with AI assistance and intelligent criteria
              </Typography>
            </CardContent>
            <CardActions sx={{ justifyContent: 'center', pb: 4 }}>
              <Button 
                variant="contained" 
                component={Link} 
                href="/rubrics"
                startIcon={<CreateIcon />}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  px: 4,
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 600,
                  borderRadius: 2,
                  boxShadow: 'none',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5a6fde 0%, #6a4190 100%)',
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                  }
                }}
              >
                Manage Rubrics
              </Button>
            </CardActions>
          </ModernCard>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <ModernCard sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            cursor: 'pointer',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #667eea, #764ba2)',
            }
          }}>
            <CardContent sx={{ flexGrow: 1, textAlign: 'center', pt: 5, px: 4 }}>
              <Box sx={{ 
                display: 'inline-flex', 
                p: 3, 
                borderRadius: 4, 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                mb: 4,
                boxShadow: '0 8px 20px rgba(102, 126, 234, 0.3)',
              }}>
                <SchoolIcon sx={{ fontSize: 40, color: 'white' }} />
              </Box>
              <Typography variant="h5" gutterBottom fontWeight="700" sx={{ color: '#000000', mb: 2 }}>
                Canvas Integration
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7, fontSize: '1.1rem' }}>
                Grade assignments directly from Canvas LMS with seamless workflow
              </Typography>
            </CardContent>
            <CardActions sx={{ justifyContent: 'center', pb: 4 }}>
              <Button 
                variant="contained" 
                component={Link} 
                href="/canvas"
                startIcon={<SchoolIcon />}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  px: 4,
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 600,
                  borderRadius: 2,
                  boxShadow: 'none',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5a6fde 0%, #6a4190 100%)',
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                  }
                }}
              >
                Canvas Grading
              </Button>
            </CardActions>
          </ModernCard>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <ModernCard sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            cursor: 'pointer',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #667eea, #764ba2)',
            }
          }}>
            <CardContent sx={{ flexGrow: 1, textAlign: 'center', pt: 5, px: 4 }}>
              <Box sx={{ 
                display: 'inline-flex', 
                p: 3, 
                borderRadius: 4, 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                mb: 4,
                boxShadow: '0 8px 20px rgba(102, 126, 234, 0.3)',
              }}>
                <PersonIcon sx={{ fontSize: 40, color: 'white' }} />
              </Box>
              <Typography variant="h5" gutterBottom fontWeight="700" sx={{ color: '#000000', mb: 2 }}>
                Single Submission
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7, fontSize: '1.1rem' }}>
                Grade individual student submissions quickly with AI-powered analysis
              </Typography>
            </CardContent>
            <CardActions sx={{ justifyContent: 'center', pb: 4 }}>
              <Button 
                variant="outlined"
                onClick={() => {
                  document.getElementById('single-submission-form')?.scrollIntoView({ 
                    behavior: 'smooth' 
                  });
                }}
                startIcon={<PersonIcon />}
                sx={{
                  borderColor: '#667eea',
                  color: '#667eea',
                  borderWidth: 1,
                  px: 4,
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 600,
                  borderRadius: 2,
                  '&:hover': {
                    borderColor: '#5a6fde',
                    backgroundColor: 'rgba(102, 126, 234, 0.04)',
                  }
                }}
              >
                Start Grading
              </Button>
            </CardActions>
          </ModernCard>
        </Grid>
      </Grid>

      {/* Main Form - Enhanced Design */}
      <Paper 
        elevation={3} 
        sx={{ 
          borderRadius: 4, 
          overflow: 'hidden', 
          mb: 6,
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          border: '1px solid #e2e8f0',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '6px',
            background: 'linear-gradient(90deg, #667eea, #764ba2)',
          }
        }} 
        id="single-submission-form"
      >
        {/* Single Submission Form */}
        <Box sx={{ p: 4, pt: 5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Box sx={{ 
              display: 'inline-flex', 
              p: 1.5, 
              borderRadius: 2, 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              boxShadow: '0 4px 8px rgba(102, 126, 234, 0.3)',
            }}>
              <AssignmentIcon sx={{ fontSize: 24, color: 'white' }} />
            </Box>
            <Box>
              <Typography variant="h5" gutterBottom fontWeight="700" sx={{ color: '#1e293b' }}>
            Grade Individual Submission
          </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                Upload a single student submission for quick AI-powered grading with detailed feedback.
          </Typography>
            </Box>
          </Box>
          
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
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 300,
                        overflow: 'auto',
                      },
                    },
                  }}
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
                    href="/rubrics"
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
                    : 'Drag and drop or click to select student submission (PDF/DOCX/TXT)'}
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
          </Box>
      </Paper>
      
      {/* Features Section */}
      <Box sx={{ mt: 8, mb: 6 }}>
        <Typography variant="h4" component="h2" textAlign="center" fontWeight="700" gutterBottom sx={{ color: '#1e293b' }}>
          Why Choose Our AI Assistant?
        </Typography>
        <Typography variant="h6" textAlign="center" color="text.secondary" sx={{ mb: 6, maxWidth: '600px', mx: 'auto' }}>
          Experience the future of grading with our AI-powered platform designed for educators
        </Typography>
        
        <Grid container spacing={4}>
          <Grid item xs={12} md={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{ 
                display: 'inline-flex', 
                p: 2, 
                borderRadius: 3, 
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                mb: 2,
                boxShadow: '0 8px 16px rgba(59, 130, 246, 0.3)',
              }}>
                <Box
                  component="img"
                  src="/icons/scorepal_48x48.png"
                  alt="AI Powered"
                  sx={{ width: 32, height: 32 }}
                />
              </Box>
              <Typography variant="h6" fontWeight="600" gutterBottom sx={{ color: '#1e293b' }}>
                AI-Powered
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Advanced AI algorithms ensure consistent and objective grading
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{ 
                display: 'inline-flex', 
                p: 2, 
                borderRadius: 3, 
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                mb: 2,
                boxShadow: '0 8px 16px rgba(16, 185, 129, 0.3)',
              }}>
                <Box
                  component="img"
                  src="/icons/scorepal_48x48.png"
                  alt="Fast Processing"
                  sx={{ width: 32, height: 32 }}
                />
              </Box>
              <Typography variant="h6" fontWeight="600" gutterBottom sx={{ color: '#1e293b' }}>
                Lightning Fast
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Grade assignments in seconds, not hours
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{ 
                display: 'inline-flex', 
                p: 2, 
                borderRadius: 3, 
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                mb: 2,
                boxShadow: '0 8px 16px rgba(245, 158, 11, 0.3)',
              }}>
                <Box
                  component="img"
                  src="/icons/scorepal_48x48.png"
                  alt="Detailed Feedback"
                  sx={{ width: 32, height: 32 }}
                />
              </Box>
              <Typography variant="h6" fontWeight="600" gutterBottom sx={{ color: '#1e293b' }}>
                Detailed Feedback
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Comprehensive feedback helps students improve
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{ 
                display: 'inline-flex', 
                p: 2, 
                borderRadius: 3, 
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                mb: 2,
                boxShadow: '0 8px 16px rgba(239, 68, 68, 0.3)',
              }}>
                <Box
                  component="img"
                  src="/icons/scorepal_48x48.png"
                  alt="Easy Integration"
                  sx={{ width: 32, height: 32 }}
                />
              </Box>
              <Typography variant="h6" fontWeight="600" gutterBottom sx={{ color: '#1e293b' }}>
                Easy Integration
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Seamlessly integrates with your existing LMS
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>
      
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
    </Container>
  );
} 