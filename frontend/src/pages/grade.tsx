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
export default function Home() {
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
        // Navigate to results page
        router.push(`/results/${response.data.upload_id}`);
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
      {/* Header Section */}
      <GradientPaper elevation={3}>
        <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
          ScorePAL: AI-Powered Grading
        </Typography>
        <Typography variant="h6" gutterBottom>
          Grade assignments quickly, consistently, and objectively with AI assistance
        </Typography>
        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          <Button 
            variant="contained" 
            color="secondary" 
            size="large"
            sx={{ 
              color: 'white', 
              borderRadius: 8, 
              px: 3,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.3)',
              }
            }}
            startIcon={<PersonIcon />}
          >
            Single Submission
          </Button>
          <Button 
            variant="outlined" 
            size="large"
            onClick={() => router.push('/canvas')}
            sx={{ 
              color: 'white', 
              borderColor: 'rgba(255, 255, 255, 0.5)',
              borderRadius: 8, 
              px: 3,
              '&:hover': {
                borderColor: 'white',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }
            }}
            startIcon={<SchoolIcon />}
          >
            Canvas Integration
          </Button>
        </Box>
      </GradientPaper>
      
      {/* Main Form - removing tabs */}
      <Paper elevation={2} sx={{ borderRadius: 3, overflow: 'hidden', mb: 4 }}>
        {/* Single Submission Form */}
        <Box sx={{ p: 3 }}>
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
          </Box>
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
    </Container>
  );
} 