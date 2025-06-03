import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  CircularProgress, 
  Typography, 
  TextField,
  Grid,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  Paper,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

const CanvasSubmissionProcessor = () => {
  const [canvasData, setCanvasData] = useState(null);
  const [rawData, setRawData] = useState('');
  const [processedData, setProcessedData] = useState(null);
  const [downloadedFiles, setDownloadedFiles] = useState(null);
  const [gradingReady, setGradingReady] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1);
  const [gradingInProgress, setGradingInProgress] = useState(false);
  const [gradingResults, setGradingResults] = useState(null);
  
  const onDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const jsonData = JSON.parse(reader.result);
          setCanvasData(jsonData);
          setRawData(reader.result);
        } catch (error) {
          setError('Invalid JSON format. Please upload a valid JSON file.');
        }
      };
      reader.readAsText(file);
    }
  };
  
  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json']
    },
    multiple: false
  });
  
  const handleManualInput = (event) => {
    const input = event.target.value;
    setRawData(input);
    
    try {
      const jsonData = JSON.parse(input);
      setCanvasData(jsonData);
      setError(null);
    } catch (error) {
      if (input.trim() !== '') {
        setError('Invalid JSON format. Please enter valid JSON data.');
      }
    }
  };
  
  const processCanvasData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('/api/canvas/process-canvas-data', canvasData);
      
      if (response.data.status === 'success') {
        setProcessedData(response.data);
        setStep(2);
      } else {
        setError(response.data.message || 'Failed to process Canvas data');
      }
    } catch (error) {
      setError('Error processing Canvas data: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };
  
  const downloadSubmissionFiles = async () => {
    if (!processedData) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('/api/canvas/download-submission-files', {
        submissions: processedData.submissions,
        output_directory: processedData.output_directory
      });
      
      if (response.data.status === 'success') {
        setDownloadedFiles(response.data);
        setStep(3);
      } else {
        setError(response.data.message || 'Failed to download submission files');
      }
    } catch (error) {
      setError('Error downloading files: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };
  
  const prepareForGrading = async () => {
    if (!downloadedFiles) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('/api/canvas/prepare-submissions-for-grading', {
        submissions: downloadedFiles.submissions,
        output_directory: downloadedFiles.output_directory
      });
      
      if (response.data.status === 'success') {
        setGradingReady(response.data);
        setStep(4);
      } else {
        setError(response.data.message || 'Failed to prepare submissions for grading');
      }
    } catch (error) {
      setError('Error preparing for grading: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };
  
  const startGrading = async () => {
    if (!gradingReady) return;
    
    setLoading(true);
    setGradingInProgress(true);
    setError(null);
    
    try {
      const response = await axios.post('/api/canvas/grade-assignment', {
        submissions_for_grading: gradingReady.submissions_for_grading,
        output_directory: gradingReady.output_directory
      });
      
      if (response.data.status === 'success') {
        setGradingResults(response.data);
        setStep(5);
      } else {
        setError(response.data.message || 'Failed to grade submissions');
      }
    } catch (error) {
      setError('Error grading submissions: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
      setGradingInProgress(false);
    }
  };
  
  const reset = () => {
    setCanvasData(null);
    setRawData('');
    setProcessedData(null);
    setDownloadedFiles(null);
    setGradingReady(null);
    setGradingResults(null);
    setGradingInProgress(false);
    setLoading(false);
    setError(null);
    setStep(1);
  };
  
  const renderStep1 = () => (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Step 1: Import Canvas Submission Data
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Paper 
            {...getRootProps()} 
            elevation={0}
            sx={{ 
              border: '2px dashed #ccc', 
              p: 3, 
              textAlign: 'center', 
              cursor: 'pointer',
              mb: 2
            }}
          >
            <input {...getInputProps()} />
            <Typography>
              Drag and drop a JSON file here, or click to select a file
            </Typography>
          </Paper>
          
          <Typography variant="subtitle2" gutterBottom>
            Or paste Canvas API response below:
          </Typography>
          
          <TextField
            fullWidth
            multiline
            rows={8}
            value={rawData}
            onChange={handleManualInput}
            placeholder="Paste Canvas submission data in JSON format here..."
            variant="outlined"
            sx={{ mb: 2 }}
          />
          
          {canvasData && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Successfully loaded {Array.isArray(canvasData) ? canvasData.length : 0} submissions
            </Alert>
          )}
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Button 
            variant="contained" 
            color="primary"
            onClick={processCanvasData}
            disabled={!canvasData || loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            Process Canvas Data
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
  
  const renderStep2 = () => (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Step 2: Process Submissions
        </Typography>
        
        {processedData && (
          <>
            <Alert severity="success" sx={{ mb: 2 }}>
              {processedData.message}
            </Alert>
            
            <Typography variant="subtitle2" gutterBottom>
              Output Directory: {processedData.output_directory}
            </Typography>
            
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Processed Submissions ({Object.keys(processedData.submissions).length})</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  {Object.entries(processedData.submissions).map(([userId, submission]) => (
                    <React.Fragment key={userId}>
                      <ListItem>
                        <ListItemText
                          primary={`User ID: ${userId} - Submission ID: ${submission.submission_id}`}
                          secondary={
                            <>
                              <Typography component="span" variant="body2">
                                Files: {submission.files.length} | 
                                Submitted: {new Date(submission.submitted_at).toLocaleString()} | 
                                Status: {submission.status}
                              </Typography>
                              {submission.files.length > 0 && (
                                <List dense>
                                  {submission.files.map((file, index) => (
                                    <ListItem key={index}>
                                      <ListItemText
                                        primary={file.name}
                                        secondary={`Type: ${file.content_type} | Size: ${Math.round(file.size / 1024)} KB`}
                                      />
                                    </ListItem>
                                  ))}
                                </List>
                              )}
                            </>
                          }
                        />
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
            
            <Box sx={{ mt: 2 }}>
              <Button 
                variant="contained" 
                color="primary"
                onClick={downloadSubmissionFiles}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <FileDownloadIcon />}
              >
                Download Submission Files
              </Button>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
  
  const renderStep3 = () => (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Step 3: Downloaded Files
        </Typography>
        
        {downloadedFiles && (
          <>
            <Alert severity="success" sx={{ mb: 2 }}>
              {downloadedFiles.message}
            </Alert>
            
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Downloaded Files</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  {Object.entries(downloadedFiles.submissions).map(([userId, submission]) => (
                    <React.Fragment key={userId}>
                      <ListItem>
                        <ListItemText
                          primary={`User ID: ${userId} - Submission ID: ${submission.submission_id}`}
                          secondary={
                            <>
                              <Typography component="span" variant="body2">
                                Status: {submission.status}
                              </Typography>
                              {submission.files.length > 0 && (
                                <List dense>
                                  {submission.files.map((file, index) => (
                                    <ListItem key={index}>
                                      <ListItemText
                                        primary={file.name}
                                        secondary={
                                          file.downloaded ? 
                                          `Downloaded to: ${file.path}` : 
                                          `Error: ${file.error || 'Unknown error'}`
                                        }
                                      />
                                      {file.downloaded ? 
                                        <CheckCircleIcon color="success" /> : 
                                        <ErrorIcon color="error" />
                                      }
                                    </ListItem>
                                  ))}
                                </List>
                              )}
                            </>
                          }
                        />
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
            
            <Box sx={{ mt: 2 }}>
              <Button 
                variant="contained" 
                color="primary"
                onClick={prepareForGrading}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : null}
              >
                Prepare for Grading
              </Button>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
  
  const renderStep4 = () => (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Step 4: Ready for Grading
        </Typography>
        
        {gradingReady && (
          <>
            <Alert severity="success" sx={{ mb: 2 }}>
              {gradingReady.message}
            </Alert>
            
            <Typography variant="subtitle2" gutterBottom>
              Submissions ready for grading: {gradingReady.submissions_for_grading.length}
            </Typography>
            
            <List>
              {gradingReady.submissions_for_grading.map((submission, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ListItemText
                      primary={`User ID: ${submission.user_id} - Submission ID: ${submission.submission_id}`}
                      secondary={
                        <>
                          <Typography component="span" variant="body2">
                            Submitted: {new Date(submission.submitted_at).toLocaleString()}
                          </Typography>
                          <List dense>
                            {submission.files.map((file, fileIndex) => (
                              <ListItem key={fileIndex}>
                                <ListItemText
                                  primary={file.split('/').pop()}
                                  secondary={`Path: ${file}`}
                                />
                              </ListItem>
                            ))}
                          </List>
                        </>
                      }
                    />
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
            
            <Box sx={{ mt: 2 }}>
              <Button 
                variant="contained" 
                color="success"
                onClick={startGrading}
                disabled={loading || gradingInProgress}
                startIcon={loading ? <CircularProgress size={20} /> : null}
              >
                Start Grading
              </Button>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
  
  const renderStep5 = () => (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Step 5: Grading Results
        </Typography>
        
        {gradingResults && (
          <>
            <Alert severity="success" sx={{ mb: 2 }}>
              {gradingResults.message}
            </Alert>
            
            <Typography variant="subtitle2" gutterBottom>
              Grading results saved to: {gradingResults.results_path}
            </Typography>
            
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Grading Results ({gradingResults.results.length})</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  {gradingResults.results.map((result, index) => (
                    <React.Fragment key={index}>
                      <ListItem>
                        <ListItemText
                          primary={`User ID: ${result.user_id} - Submission ID: ${result.submission_id}`}
                          secondary={
                            result.error ? (
                              <Typography color="error">Error: {result.error}</Typography>
                            ) : (
                              <>
                                <Typography component="div">
                                  Grade: {result.grade}
                                </Typography>
                                <Typography component="div" variant="body2">
                                  Feedback: {result.feedback}
                                </Typography>
                                <Typography component="div" variant="caption">
                                  Result saved to: {result.result_path}
                                </Typography>
                              </>
                            )
                          }
                        />
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          </>
        )}
      </CardContent>
    </Card>
  );
  
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Canvas Submission Processor
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ mb: 2 }}>
        <Chip 
          label="1. Import Data" 
          color={step >= 1 ? "primary" : "default"} 
          variant={step === 1 ? "filled" : "outlined"}
          sx={{ mr: 1 }}
        />
        <Chip 
          label="2. Process Data" 
          color={step >= 2 ? "primary" : "default"} 
          variant={step === 2 ? "filled" : "outlined"}
          sx={{ mr: 1 }}
        />
        <Chip 
          label="3. Download Files" 
          color={step >= 3 ? "primary" : "default"} 
          variant={step === 3 ? "filled" : "outlined"}
          sx={{ mr: 1 }}
        />
        <Chip 
          label="4. Prepare for Grading" 
          color={step >= 4 ? "primary" : "default"} 
          variant={step === 4 ? "filled" : "outlined"}
          sx={{ mr: 1 }}
        />
        <Chip 
          label="5. Grading Results" 
          color={step >= 5 ? "primary" : "default"} 
          variant={step === 5 ? "filled" : "outlined"}
        />
      </Box>
      
      {renderStep1()}
      {step >= 2 && renderStep2()}
      {step >= 3 && renderStep3()}
      {step >= 4 && renderStep4()}
      {step >= 5 && renderStep5()}
      
      <Box sx={{ mt: 2 }}>
        <Button 
          variant="outlined" 
          color="secondary"
          onClick={reset}
        >
          Reset
        </Button>
      </Box>
    </Box>
  );
};

export default CanvasSubmissionProcessor; 