import { useState, useEffect } from 'react';
import {
  Container, Typography, Card, CardContent, Box, Grid, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  Alert, CircularProgress, Divider, Accordion, AccordionSummary,
  AccordionDetails, TextField, InputAdornment, IconButton
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import Link from 'next/link';
import axios from 'axios';

const CanvasResultsPage = () => {
  const [gradingJobs, setGradingJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobDetailsOpen, setJobDetailsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data for now - in a real app, this would come from an API
  useEffect(() => {
    // Simulate loading saved grading jobs
    setTimeout(() => {
      const mockJobs = [
        {
          id: 'job_001',
          courseId: '1589225',
          courseName: 'SJSU CS Department',
          assignmentId: '7133587',
          assignmentName: 'Network Programming Assignment',
          gradedAt: '2024-01-15T10:30:00Z',
          totalSubmissions: 25,
          successfulGrades: 23,
          failedGrades: 2,
          averageScore: 78.5,
          rubricUsed: 'Technical Analysis Rubric',
          strictness: 0.5,
          results: [
            {
              user_id: 12345,
              user_name: 'John Doe',
              status: 'graded',
              grade: 85,
              feedback: 'Good understanding of networking concepts. Code structure is clear and well-documented.'
            },
            {
              user_id: 12346,
              user_name: 'Jane Smith',
              status: 'graded',
              grade: 92,
              feedback: 'Excellent work! All requirements met with exceptional code quality.'
            }
          ]
        },
        {
          id: 'job_002',
          courseId: '1589225',
          courseName: 'SJSU CS Department',
          assignmentId: '7133588',
          assignmentName: 'Database Design Project',
          gradedAt: '2024-01-10T14:20:00Z',
          totalSubmissions: 18,
          successfulGrades: 18,
          failedGrades: 0,
          averageScore: 82.3,
          rubricUsed: 'Default Rubric',
          strictness: 0.7,
          results: []
        }
      ];
      
      setGradingJobs(mockJobs);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredJobs = gradingJobs.filter(job =>
    job.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.assignmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewDetails = (job) => {
    setSelectedJob(job);
    setJobDetailsOpen(true);
  };

  const handleExportJob = (job) => {
    const jobData = {
      ...job,
      exportedAt: new Date().toISOString()
    };
    
    const jsonData = JSON.stringify(jobData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grading_job_${job.id}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getGradeColor = (percentage) => {
    if (percentage >= 90) return 'success';
    if (percentage >= 80) return 'info';
    if (percentage >= 70) return 'warning';
    if (percentage >= 60) return 'orange';
    return 'error';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading grading results...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Canvas Grading Results
        </Typography>
        
        <Typography variant="subtitle1" paragraph>
          View and manage your saved grading results from Canvas assignments.
        </Typography>

        {/* Search Bar */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <TextField
              fullWidth
              placeholder="Search by course, assignment, or job ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </CardContent>
        </Card>

        {/* Summary Statistics */}
        {gradingJobs.length > 0 && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                <Typography variant="h4">{gradingJobs.length}</Typography>
                <Typography variant="body2">Total Jobs</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.main', color: 'success.contrastText' }}>
                <Typography variant="h4">
                  {gradingJobs.reduce((sum, job) => sum + job.totalSubmissions, 0)}
                </Typography>
                <Typography variant="body2">Total Submissions</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.main', color: 'info.contrastText' }}>
                <Typography variant="h4">
                  {gradingJobs.length > 0 ? 
                    (gradingJobs.reduce((sum, job) => sum + job.averageScore, 0) / gradingJobs.length).toFixed(1) 
                    : 0}%
                </Typography>
                <Typography variant="body2">Avg Score</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.main', color: 'warning.contrastText' }}>
                <Typography variant="h4">
                  {gradingJobs.reduce((sum, job) => sum + job.successfulGrades, 0)}
                </Typography>
                <Typography variant="body2">Successful Grades</Typography>
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Jobs List */}
        {filteredJobs.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="h6" gutterBottom>
                No grading results found
              </Typography>
              <Typography color="text.secondary" paragraph>
                {searchTerm ? 
                  'No results match your search criteria.' : 
                  'You haven\'t graded any Canvas assignments yet.'
                }
              </Typography>
              <Button 
                variant="contained" 
                component={Link} 
                href="/canvas"
                sx={{ mt: 2 }}
              >
                Start Grading Assignments
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {filteredJobs.map((job) => (
              <Grid item xs={12} key={job.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" gutterBottom>
                          {job.assignmentName}
                        </Typography>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          {job.courseName} • Job ID: {job.id}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Graded on {formatDate(job.gradedAt)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          startIcon={<VisibilityIcon />}
                          onClick={() => handleViewDetails(job)}
                        >
                          View Details
                        </Button>
                        <Button
                          size="small"
                          startIcon={<FileDownloadIcon />}
                          onClick={() => handleExportJob(job)}
                        >
                          Export
                        </Button>
                      </Box>
                    </Box>

                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid item xs={6} sm={3}>
                        <Box textAlign="center">
                          <Typography variant="h6">{job.totalSubmissions}</Typography>
                          <Typography variant="caption">Total</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Box textAlign="center">
                          <Typography variant="h6" color="success.main">{job.successfulGrades}</Typography>
                          <Typography variant="caption">Graded</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Box textAlign="center">
                          <Typography variant="h6" color="error.main">{job.failedGrades}</Typography>
                          <Typography variant="caption">Failed</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Box textAlign="center">
                          <Typography variant="h6" color={getGradeColor(job.averageScore)}>
                            {job.averageScore.toFixed(1)}%
                          </Typography>
                          <Typography variant="caption">Avg Score</Typography>
                        </Box>
                      </Grid>
                    </Grid>

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip label={`Rubric: ${job.rubricUsed}`} size="small" />
                      <Chip label={`Strictness: ${Math.round(job.strictness * 100)}%`} size="small" />
                      <Chip 
                        label={job.successfulGrades === job.totalSubmissions ? 'All Graded' : 'Partial'} 
                        color={job.successfulGrades === job.totalSubmissions ? 'success' : 'warning'}
                        size="small" 
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Job Details Dialog */}
        <Dialog
          open={jobDetailsOpen}
          onClose={() => setJobDetailsOpen(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>
            Grading Job Details - {selectedJob?.assignmentName}
          </DialogTitle>
          <DialogContent sx={{ overflowY: 'auto' }}>
            {selectedJob && (
              <Box>
                <Grid container spacing={3} sx={{ mb: 3 }}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>Job Information</Typography>
                    <Typography><strong>Job ID:</strong> {selectedJob.id}</Typography>
                    <Typography><strong>Course:</strong> {selectedJob.courseName}</Typography>
                    <Typography><strong>Assignment:</strong> {selectedJob.assignmentName}</Typography>
                    <Typography><strong>Graded At:</strong> {formatDate(selectedJob.gradedAt)}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>Grading Settings</Typography>
                    <Typography><strong>Rubric Used:</strong> {selectedJob.rubricUsed}</Typography>
                    <Typography><strong>Strictness:</strong> {Math.round(selectedJob.strictness * 100)}%</Typography>
                    <Typography><strong>Success Rate:</strong> {((selectedJob.successfulGrades / selectedJob.totalSubmissions) * 100).toFixed(1)}%</Typography>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                <Typography variant="h6" gutterBottom>
                  Results ({selectedJob.results?.length || 0} detailed results available)
                </Typography>

                {selectedJob.results && selectedJob.results.length > 0 ? (
                  <TableContainer component={Paper} sx={{ mt: 2 }}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Student</TableCell>
                          <TableCell>Grade</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Feedback Preview</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedJob.results.map((result) => (
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
                              <Typography variant="h6" color={getGradeColor(result.grade)}>
                                {result.grade}%
                              </Typography>
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
                              <Typography variant="body2" sx={{ 
                                maxWidth: 300,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical'
                              }}>
                                {result.feedback || 'No feedback available'}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Alert severity="info">
                    Detailed results are not available for this job. This may be an older job or the results may have been archived.
                  </Alert>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setJobDetailsOpen(false)}>
              Close
            </Button>
            {selectedJob && (
              <Button
                variant="contained"
                startIcon={<FileDownloadIcon />}
                onClick={() => handleExportJob(selectedJob)}
              >
                Export Job Data
              </Button>
            )}
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
      </Box>
    </Container>
  );
};

export default CanvasResultsPage; 