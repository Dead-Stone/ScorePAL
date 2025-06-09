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
  Slider,
  IconButton,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Drawer,
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
  Info as InfoIcon,
  Settings as SettingsIcon,
  Tune as TuneIcon,
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
  assignments: File[];
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
    assignments: [],
    rubric: null,
    result: null,
    loading: false,
  });

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null);
  
  // Configuration state
  const [config, setConfig] = useState({
    strictness: 0.5,
    modelType: 'moderate', // 'fast', 'moderate', 'deep'
    selectedRubric: null as any,
  });

  const steps = ['Upload Files', 'Configure & Grade'];

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
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      // Validate file type - much more comprehensive list
      const allowedTypes = [
        // Documents
        'application/pdf', 'text/plain', 'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/markdown',
        
        // Programming files
        'text/x-python', 'text/x-java-source', 'text/x-c', 'text/x-c++src',
        'application/javascript', 'text/javascript', 'application/typescript',
        'text/html', 'text/css',
        
        // Data files
        'application/json', 'application/xml', 'text/xml', 'text/csv',
        'application/x-yaml', 'text/yaml',
        
        // Archives
        'application/zip', 'application/x-tar', 'application/gzip',
        
        // Images
        'image/jpeg', 'image/png', 'image/gif', 'image/bmp',
        
        // Notebooks
        'application/x-ipynb+json',
      ];
      
      // Validate all files
      const allowedExtensions = [
        'pdf', 'txt', 'doc', 'docx', 'md',
        'py', 'java', 'cpp', 'c', 'h', 'hpp', 'js', 'ts', 'html', 'css', 'scss',
        'json', 'xml', 'yaml', 'yml', 'csv', 'tsv',
        'zip', 'tar', 'gz',
        'jpg', 'jpeg', 'png', 'gif', 'bmp',
        'ipynb', 'r', 'R', 'm', 'sql', 'sh', 'bash', 'ps1', 'bat'
      ];
      
      const invalidFiles = files.filter(file => {
        const fileExtension = file.name.toLowerCase().split('.').pop() || '';
        return !allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension);
      });
      
      if (invalidFiles.length > 0) {
        setAlert({
          type: 'error',
          message: `Unsupported file type(s): ${invalidFiles.map(f => f.name).join(', ')}. Please upload supported file types only.`,
        });
        return;
      }
      
      setGradingState(prev => ({
        ...prev,
        assignments: files,
        step: 1,
      }));

      setAlert({
        type: 'success',
        message: `${files.length} file(s) uploaded successfully!`,
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
      gradingState.assignments.forEach((file, index) => {
        formData.append(`files`, file);
      });
      formData.append('rubric_id', config.selectedRubric?.id || gradingState.rubric?.id || 'default');
      formData.append('strictness', config.strictness.toString());
      formData.append('model_type', config.modelType);

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
      assignments: [],
      rubric: null,
      result: null,
      loading: false,
    });
    // Reset configuration to defaults
    setConfig({
      strictness: 0.5,
      modelType: 'moderate',
      selectedRubric: null,
    });
    setAlert(null);
  };

  const regradeAssignment = async () => {
    if (gradingState.assignments.length === 0) return;
    
    setGradingState(prev => ({ ...prev, loading: true, result: null }));
    await handleStartGrading();
  };

  const updateConfig = (key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const renderConfigurationSidebar = () => (
    <Paper sx={{ p: 3, position: 'sticky', top: 20, height: 'fit-content' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <TuneIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6" color="primary.main">
          Grading Settings
        </Typography>
      </Box>

      {/* Strictness Level */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" gutterBottom>
          Grading Strictness
          <IconButton
            size="small"
            onClick={() => setAlert({
              type: 'info',
              message: "Higher strictness means more rigorous grading standards. Moderate works well for most assignments.",
            })}
            sx={{ ml: 0.5 }}
          >
            <InfoIcon fontSize="small" />
          </IconButton>
        </Typography>
        <Slider
          value={config.strictness}
          min={0}
          max={1}
          step={0.1}
          marks={[
            { value: 0, label: 'Lenient' },
            { value: 0.5, label: 'Moderate' },
            { value: 1, label: 'Strict' },
          ]}
          onChange={(_, value) => updateConfig('strictness', value)}
          valueLabelDisplay="auto"
          valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
          size="small"
        />
      </Box>

      {/* Model Type */}
      <Box sx={{ mb: 3 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Analysis Type</InputLabel>
          <Select
            value={config.modelType}
            label="Analysis Type"
            onChange={(e) => updateConfig('modelType', e.target.value)}
          >
            <MenuItem value="fast">Fast Analysis</MenuItem>
            <MenuItem value="moderate">Moderate Analysis</MenuItem>
            <MenuItem value="deep">Deep Analysis</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Rubric Selection */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" gutterBottom>
          Rubric
        </Typography>
        {rubricsLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" sx={{ ml: 1 }}>Loading...</Typography>
          </Box>
        ) : (
          <FormControl fullWidth size="small">
            <InputLabel>Select Rubric</InputLabel>
            <Select
              value={config.selectedRubric?.id || 'default'}
              label="Select Rubric"
              onChange={(e) => {
                const rubricId = e.target.value;
                const selectedRubric = rubricId === 'default' 
                  ? { id: 'default', name: 'Default Assignment Rubric' }
                  : rubrics.find(r => r.id === rubricId);
                updateConfig('selectedRubric', selectedRubric);
              }}
            >
              <MenuItem value="default">Default Assignment Rubric</MenuItem>
              {rubrics.map((rubric) => (
                <MenuItem key={rubric.id} value={rubric.id}>
                  {rubric.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      {/* Configuration Summary */}
      <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {config.modelType} • {Math.round(config.strictness * 100)}% strictness
        </Typography>
      </Box>
    </Paper>
  );

  const renderUploadStep = () => (
    <Card sx={{ p: 4, textAlign: 'center', maxWidth: '600px', mx: 'auto' }}>
      <UploadIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
      <Typography variant="h5" gutterBottom>
        Upload Your Assignment Files
        </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Upload one or multiple assignment files for AI-powered grading
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        <strong>Supported formats:</strong> 
        <br/>📄 Documents: PDF, DOC, DOCX, TXT, MD
        <br/>💻 Code: Python, Java, C/C++, JavaScript, HTML, CSS, SQL, R, MATLAB
        <br/>📊 Data: CSV, JSON, XML, YAML, Excel, Jupyter notebooks
        <br/>📦 Archives: ZIP, TAR (multiple files)
        <br/>🖼️ Images: JPG, PNG, GIF, BMP (with OCR)
        <br/><strong>File size limit:</strong> Up to 10MB
        </Typography>
      
      <input
        accept=".pdf,.doc,.docx,.txt,.py,.java,.cpp,.c,.js,.ts,.html,.css,.json,.xml,.csv,.md,.ipynb,.zip,.tar,.jpg,.jpeg,.png,.gif,.bmp"
        style={{ display: 'none' }}
        id="file-upload"
        type="file"
        multiple
        onChange={handleFileUpload}
      />
      <label htmlFor="file-upload">
          <Button 
            variant="contained" 
          component="span"
            size="large"
          startIcon={<UploadIcon />}
          sx={{ 
            px: 6, 
            py: 2, 
            fontSize: '1.1rem',
            boxShadow: 3,
            '&:hover': {
              boxShadow: 6,
              transform: 'translateY(-2px)',
              transition: 'all 0.2s ease-in-out'
            }
          }}
        >
          Choose Files
        </Button>
      </label>

      {gradingState.assignments.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
            {gradingState.assignments.map((file, index) => (
          <Chip
                key={index}
            icon={<AssignmentIcon />}
                label={file.name}
            color="primary"
            variant="outlined"
                size="medium"
          />
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
            {gradingState.assignments.length} file(s) selected
          </Typography>
        </Box>
      )}
    </Card>
  );

  const renderRubricStep = () => (
    <Card sx={{ p: 4 }}>
      <Typography variant="h5" gutterBottom>
        Select Grading Rubric
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Choose how your assignment should be evaluated
      </Typography>
      <Box sx={{ mb: 3, p: 2, bgcolor: 'info.50', borderRadius: 1, border: '1px solid', borderColor: 'info.100' }}>
        <Typography variant="body2" color="info.main">
          <strong>💡 Pro Tip:</strong> Our default rubric evaluates content quality, analysis depth, 
          organization, evidence usage, and communication clarity. Perfect for most academic assignments!
        </Typography>
      </Box>

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
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Review your selections and start the AI-powered grading process
      </Typography>
      
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" color="text.secondary">Files:</Typography>
          <Typography variant="body1">
            {gradingState.assignments.length === 1 
              ? gradingState.assignments[0].name 
              : `${gradingState.assignments.length} files selected`
            }
          </Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" color="text.secondary">Rubric:</Typography>
          <Typography variant="body1">{config.selectedRubric?.name || 'Default Assignment Rubric'}</Typography>
        </Grid>
      </Grid>

      {/* Configuration Summary */}
      <Box sx={{ mb: 3, p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Current Configuration
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Analysis: <strong>{config.modelType}</strong> | Strictness: <strong>{Math.round(config.strictness * 100)}%</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Use the configuration panel on the right to adjust grading settings.
        </Typography>
      </Box>

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

      <Box sx={{ mt: 3, textAlign: 'center', maxWidth: '400px', mx: 'auto' }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          🚀 <strong>Processing typically takes 30-60 seconds</strong> depending on assignment length
        </Typography>
      <Button
        variant="contained"
        size="large"
          sx={{ 
            px: 6, 
            py: 2, 
            fontSize: '1.1rem',
            boxShadow: 3,
            '&:hover': {
              boxShadow: 6,
              transform: 'translateY(-2px)',
              transition: 'all 0.2s ease-in-out'
            }
          }}
        startIcon={<StartIcon />}
        onClick={handleStartGrading}
        disabled={gradingState.loading || (!canGrade && !isAuthenticated)}
      >
          {gradingState.loading ? 'Grading in Progress...' : 'Start AI Grading'}
      </Button>
      </Box>

      {gradingState.loading && (
        <Box sx={{ mt: 3 }}>
          <LinearProgress />
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
            🤖 AI is analyzing your assignment and applying the rubric criteria...
          </Typography>
          <Typography variant="caption" color="text.secondary" align="center" sx={{ mt: 1, display: 'block' }}>
            This may take a moment for longer assignments
          </Typography>
        </Box>
      )}
    </Card>
  );

  const renderResults = () => (
    <Card sx={{ p: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 3 }}>
      <Typography variant="h5" gutterBottom>
          🎯 Grading Complete!
          </Typography>
        <Typography variant="body1" color="text.secondary">
          Your assignment has been analyzed and graded using AI-powered evaluation
        </Typography>
      </Box>
          
      {gradingState.result && (
        <Box>
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Chip
              icon={<GradeIcon />}
              label={`Score: ${gradingState.result.score || 'N/A'}`}
              color="primary"
              size="medium"
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

      <Box sx={{ mt: 4 }}>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2 }}>
          Need to grade more assignments? Consider upgrading for bulk grading and advanced features.
        </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button 
            variant="contained" 
            onClick={regradeAssignment} 
            disabled={gradingState.loading}
            sx={{ flex: 1, minWidth: '140px' }}
          >
            {gradingState.loading ? 'Regrading...' : 'Regrade'}
        </Button>
          <Button 
            variant="outlined" 
            onClick={resetGrading} 
            sx={{ flex: 1, minWidth: '140px' }}
          >
            New Assignment
          </Button>
          <Button 
            variant="text" 
            onClick={() => router.push('/rubrics')} 
            sx={{ flex: 1, minWidth: '140px' }}
          >
            Custom Rubrics
            </Button>
        </Box>
          </Box>
    </Card>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header with Process Explanation */}
      <Box sx={{ mb: 4 }}>
        <Paper 
          sx={{ 
            p: 4, 
            background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
            color: 'white',
            borderRadius: 3,
            mb: 3
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
              Assignment Grading
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9, maxWidth: '800px', mx: 'auto' }}>
              Experience AI-powered assignment grading that's fast, consistent, and detailed. Upload single or multiple files.
            </Typography>
          </Box>
        </Paper>

        <Paper sx={{ p: 4, borderRadius: 3, border: '1px solid #e5e7eb' }}>
          <Typography variant="h5" gutterBottom color="primary.main" fontWeight="semibold">
            How Single Grading Works
          </Typography>
          <Typography variant="body1" paragraph color="text.secondary" sx={{ mb: 3 }}>
            Our single grading feature allows you to grade individual assignments quickly and efficiently. 
            No registration required to get started - try it for free!
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Box 
                  sx={{ 
                    width: 60, 
                    height: 60, 
                    borderRadius: '50%', 
                    background: 'linear-gradient(135deg, #3b82f6, #1e40af)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2
                  }}
                >
                  <Typography variant="h6" color="white" fontWeight="bold">1</Typography>
                </Box>
                <Typography variant="h6" gutterBottom>Upload Assignments</Typography>
                <Typography variant="body2" color="text.secondary">
                  Upload one or multiple assignment files including documents, code files, data files, or archives. 
                  Our AI understands all major programming languages and academic formats.
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Box 
                  sx={{ 
                    width: 60, 
                    height: 60, 
                    borderRadius: '50%', 
                    background: 'linear-gradient(135deg, #3b82f6, #1e40af)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2
                  }}
                >
                  <Typography variant="h6" color="white" fontWeight="bold">2</Typography>
                </Box>
                <Typography variant="h6" gutterBottom>Choose Rubric</Typography>
                <Typography variant="body2" color="text.secondary">
                  Select from our comprehensive default rubric or use your custom rubrics. 
                  Each rubric includes detailed criteria for consistent grading.
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Box 
                  sx={{ 
                    width: 60, 
                    height: 60, 
                    borderRadius: '50%', 
                    background: 'linear-gradient(135deg, #3b82f6, #1e40af)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2
                  }}
                >
                  <Typography variant="h6" color="white" fontWeight="bold">3</Typography>
                </Box>
                <Typography variant="h6" gutterBottom>Get Results</Typography>
                <Typography variant="body2" color="text.secondary">
                  Receive detailed feedback, scores, and suggestions for improvement. 
                  Results include criteria breakdown and constructive comments.
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Box sx={{ mt: 4, p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
            <Typography variant="subtitle1" gutterBottom fontWeight="semibold">
              ✨ Free Trial Available
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try our single grading feature for free! No account required. 
              Sign up for unlimited access and advanced features like bulk grading, 
              custom rubrics, and integration with learning management systems.
            </Typography>
          </Box>
        </Paper>

        {/* Features and Benefits */}
        <Paper sx={{ p: 4, borderRadius: 3, border: '1px solid #e5e7eb', mt: 3 }}>
          <Typography variant="h6" gutterBottom color="primary.main" fontWeight="semibold">
            Why Choose AI-Powered Grading?
          </Typography>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <StartIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="subtitle2" gutterBottom fontWeight="semibold">
                  Lightning Fast
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Grade assignments in seconds, not hours
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <AssignmentIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="subtitle2" gutterBottom fontWeight="semibold">
                  Consistent Results
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Objective evaluation without bias
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <RubricIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="subtitle2" gutterBottom fontWeight="semibold">
                  Detailed Feedback
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Comprehensive analysis and suggestions
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <GradeIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="subtitle2" gutterBottom fontWeight="semibold">
                  Professional Quality
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  University-grade evaluation standards
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
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

      {/* Main Layout with Sidebar */}
      <Box sx={{ 
        display: 'flex', 
        gap: 3,
        flexDirection: { xs: 'column', lg: 'row' }
      }}>
        {/* Main Content - Center */}
        <Box sx={{ 
          flex: 1, 
          maxWidth: { xs: '100%', lg: '800px' }, 
          mx: { xs: 0, lg: 'auto' },
          order: { xs: 2, lg: 1 }
        }}>
      {gradingState.result ? (
        renderResults()
      ) : (
        <>
          {gradingState.step === 0 && renderUploadStep()}
              {gradingState.step === 1 && renderGradingStep()}
        </>
      )}
        </Box>

        {/* Right Sidebar - Configuration Panel */}
        <Box sx={{ 
          width: { xs: '100%', lg: 320 }, 
          flexShrink: 0,
          order: { xs: 1, lg: 2 }
        }}>
          {renderConfigurationSidebar()}
        </Box>
      </Box>

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