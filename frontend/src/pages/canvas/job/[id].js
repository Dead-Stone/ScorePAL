import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import {
  Box, Container, Typography, CircularProgress, Alert, Button,
  Card, CardContent, Divider, Grid, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Chip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const CanvasJobPage = () => {
  const router = useRouter();
  const { id } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [job, setJob] = useState(null);
  const [results, setResults] = useState(null);
  
  // Fetch job status and results when the component mounts
  useEffect(() => {
    if (!id) return;
    
    const fetchJobDetails = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch job status
        const statusResponse = await axios.get(`/api/canvas/jobs/${id}`);
        setJob(statusResponse.data);
        
        // If results are available, fetch them
        if (statusResponse.data.results_available) {
          const resultsResponse = await axios.get(`/api/canvas/jobs/${id}/results`);
          setResults(resultsResponse.data);
        }
      } catch (err) {
        setError(err.response?.data?.detail || 'An error occurred fetching job details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchJobDetails();
  }, [id]);
  
  // Post grades back to Canvas
  const handlePostGrades = async () => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // This would require the Canvas URL and API key to be stored somewhere
      // For now, we'll redirect to the Canvas page
      router.push('/canvas');
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred posting grades');
      setLoading(false);
    }
  };
  
  // Render loading state
  if (loading && !job) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading job details...
        </Typography>
      </Container>
    );
  }
  
  // Render error state
  if (error && !job) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/canvas')}
        >
          Back to Canvas
        </Button>
      </Container>
    );
  }
  
  // Get the status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
      case 'grades_posted':
        return 'success';
      case 'failed':
      case 'posting_failed':
        return 'error';
      case 'processing':
      case 'posting_grades':
        return 'warning';
      default:
        return 'default';
    }
  };
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/canvas')}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        <Typography variant="h4" component="h1">
          Canvas Grading Job
        </Typography>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {job && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Job Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1">
                  Job ID: {job.job_id}
                </Typography>
                <Typography variant="subtitle1">
                  Status: <Chip 
                    label={job.status} 
                    color={getStatusColor(job.status)} 
                    size="small"
                  />
                </Typography>
                <Typography variant="subtitle1">
                  Created: {new Date(job.created_at).toLocaleString()}
                </Typography>
                {job.completed_at && (
                  <Typography variant="subtitle1">
                    Completed: {new Date(job.completed_at).toLocaleString()}
                  </Typography>
                )}
              </Grid>
              <Grid item xs={12} md={6}>
                {job.status === 'completed' && !job.results_available && (
                  <Alert severity="warning">
                    Job is completed but results are not yet available.
                  </Alert>
                )}
                {job.error && (
                  <Alert severity="error">
                    Error: {job.error}
                  </Alert>
                )}
                {job.status === 'completed' && job.results_available && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handlePostGrades}
                    disabled={loading || job.status === 'grades_posted'}
                  >
                    {job.status === 'grades_posted' ? 'Grades Posted' : 'Post Grades to Canvas'}
                  </Button>
                )}
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
      
      {loading && (
        <Box sx={{ textAlign: 'center', my: 3 }}>
          <CircularProgress />
          <Typography variant="subtitle1" sx={{ mt: 1 }}>
            Loading results...
          </Typography>
        </Box>
      )}
      
      {results && (
        <>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Assignment Summary
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1">
                    Course: {results.course?.name || 'N/A'}
                  </Typography>
                  <Typography variant="subtitle1">
                    Assignment: {results.assignment?.name || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1">
                    Total Submissions: {results.summary?.total_submissions || 0}
                  </Typography>
                  <Typography variant="subtitle1">
                    Graded Submissions: {results.summary?.graded_submissions || 0}
                  </Typography>
                  <Typography variant="subtitle1">
                    Average Score: {results.summary?.average_score?.toFixed(2) || 'N/A'}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Submission Results
              </Typography>
              {results.submissions && Object.keys(results.submissions).length > 0 ? (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Student</TableCell>
                        <TableCell>Score</TableCell>
                        <TableCell>Grade</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.values(results.submissions).map((submission) => (
                        <TableRow key={submission.user_id}>
                          <TableCell>{submission.user_name}</TableCell>
                          <TableCell>
                            {submission.grading_result?.score || 'N/A'}
                            {submission.grading_result?.max_score && 
                              `/${submission.grading_result.max_score}`}
                          </TableCell>
                          <TableCell>
                            {submission.grading_result?.grade_letter || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {submission.error ? (
                              <Chip label="Error" color="error" size="small" />
                            ) : submission.grading_result ? (
                              <Chip label="Graded" color="success" size="small" />
                            ) : (
                              <Chip label="Not Graded" color="default" size="small" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body1">
                  No submission results available.
                </Typography>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Container>
  );
};

export default CanvasJobPage; 