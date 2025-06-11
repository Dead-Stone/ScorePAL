import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Chip,
  Divider,
  Tabs,
  Tab,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tooltip,
  IconButton,
  TextField,
  InputAdornment,
  ListItemButton,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import DownloadIcon from '@mui/icons-material/Download';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import GradeIcon from '@mui/icons-material/Grade';
import FeedbackIcon from '@mui/icons-material/Feedback';
import BarChartIcon from '@mui/icons-material/BarChart';
import SummarizeIcon from '@mui/icons-material/Summarize';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import ChatIcon from '@mui/icons-material/Chat';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import ImageIcon from '@mui/icons-material/Image';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import ArticleIcon from '@mui/icons-material/Article';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import VisibilityIcon from '@mui/icons-material/Visibility';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import Link from 'next/link';
import axios from 'axios';
import ChatInterface from '../../components/ChatInterface';
import SaveIcon from '@mui/icons-material/Save';

// Configure axios
axios.defaults.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
axios.defaults.headers.common['Accept'] = 'application/json';

// Define types for the data
interface CriterionScore {
  name: string;
  points: number;
  max_points: number;
  feedback: string;
}

interface Mistake {
  description?: string;
  deductions: number;
  reasons: string;
}

interface StudentResult {
  student_name?: string;
  score: number;
  total: number;
  percentage: number;
  grade_letter: string;
  grading_feedback: string;
  criteria_scores: CriterionScore[];
  mistakes: Record<string, Mistake>;
  timestamp?: string;
}

interface FileInfo {
  filename: string;
  path: string;
  size: number;
  last_modified: string;
  content_type: string;
}

interface FilesList {
  question_papers: FileInfo[];
  submissions: FileInfo[];
  answer_keys: FileInfo[];
  original_files?: FileInfo[];
}

interface GradingResults {
  id: string;
  assignment_id?: string;
  timestamp: string;
  assignment_name: string;
  student_name?: string;
  score?: number;
  total?: number;
  percentage?: number;
  grade_letter?: string;
  grading_feedback?: string;
  criteria_scores?: CriterionScore[];
  mistakes?: Record<string, Mistake>;
  summary_stats?: {
    submission_count: number;
    average_score: number;
    highest_score: number;
    lowest_score: number;
    passing_count: number;
    failing_count: number;
    score_distribution: Record<string, number>;
  };
  student_results?: Record<string, StudentResult>;
  question_text?: string;
  answer_key?: string;
  submission_text?: string;
  files?: FilesList;
}

// Styled components
const GradeAvatar = styled(Avatar)(({ theme }) => ({
  width: 70,
  height: 70,
  fontSize: '1.75rem',
  fontWeight: 'bold',
  marginBottom: theme.spacing(2),
}));

// ScoreBar component as a regular function component
interface ScoreBarProps {
  value: number;
}

const ScoreBar: React.FC<ScoreBarProps> = ({ value }) => {
  return (
    <Box
      sx={(theme) => ({
        height: 8,
        width: '100%',
        borderRadius: theme.shape.borderRadius,
        backgroundColor: theme.palette.grey[200],
        position: 'relative',
        overflow: 'hidden',
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          width: `${value}%`,
          backgroundColor: 
            value >= 90 ? theme.palette.success.main :
            value >= 80 ? theme.palette.success.light :
            value >= 70 ? theme.palette.warning.light :
            value >= 60 ? theme.palette.warning.main :
            theme.palette.error.main,
          transition: 'width 1s ease-in-out',
        }
      })}
    />
  );
};

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
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function ResultsPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [results, setResults] = useState<GradingResults | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [files, setFiles] = useState<FilesList | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  
  useEffect(() => {
    if (!id) return;
    
    const fetchResults = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(`/grading-results/${id}`);
        setResults(response.data);
        
        // Select the first student by default if available
        if (response.data && response.data.student_results) {
          const studentNames = Object.keys(response.data.student_results);
          if (studentNames.length > 0) {
            setSelectedStudent(studentNames[0]);
          }
        } else if (response.data && response.data.student_name) {
          // If it's a single submission, select that student
          setSelectedStudent(response.data.student_name);
        }
      } catch (err) {
        console.error('Error fetching results:', err);
        setError('Failed to load results. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchResults();
  }, [id]);
  
  // Add useEffect for fetching files
  useEffect(() => {
    if (!id) return;
    
    const fetchFiles = async () => {
      try {
        setLoadingFiles(true);
        const response = await axios.get(`/grading-results/${id}/files`);
        setFiles(response.data);
      } catch (err) {
        console.error('Error fetching files:', err);
      } finally {
        setLoadingFiles(false);
      }
    };
    
    fetchFiles();
  }, [id]);
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const handleStudentSelect = (studentName: string) => {
    setSelectedStudent(studentName);
    setTabValue(1); // Switch to student details tab
  };
  
  const handleDownloadResults = async () => {
    try {
      const response = await axios.get(`/grading-results/${id}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `grading_results_${id}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error downloading results:', err);
      setError('Failed to download results');
    }
  };
  
  // File related functions
  const handleFileSelect = (file: FileInfo) => {
    setSelectedFile(file);
    if (file.content_type === 'application/pdf' || file.content_type.includes('pdf')) {
      setPdfViewerOpen(true);
    } else {
      // For non-PDF files, open in a new tab or download
      window.open(`${axios.defaults.baseURL}${file.path}`, '_blank');
    }
  };
  
  const handleCloseViewer = () => {
    setPdfViewerOpen(false);
    setSelectedFile(null);
  };
  
  const getFileIcon = (contentType: string) => {
    if (contentType.includes('pdf')) {
      return <PictureAsPdfIcon color="error" />;
    } else if (contentType.includes('word') || contentType.includes('document')) {
      return <DescriptionIcon color="primary" />;
    } else if (contentType.includes('image')) {
      return <ImageIcon color="success" />;
    } else if (contentType.includes('text')) {
      return <TextSnippetIcon color="info" />;
    } else {
      return <InsertDriveFileIcon />;
    }
  };
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };
  
  // Helper functions
  const getScoreColor = (percentage: number) => {
    if (percentage >= 90) return 'success';
    if (percentage >= 80) return 'info';
    if (percentage >= 70) return 'warning';
    return 'error';
  };
  
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'success.main';
      case 'B': return 'info.main';
      case 'C': return 'warning.light';
      case 'D': return 'warning.main';
      default: return 'error.main';
    }
  };
  
  // Render loading state
  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
          <CircularProgress size={60} thickness={4} />
          <Typography variant="h6" sx={{ mt: 3 }}>
            Loading grading results...
          </Typography>
        </Box>
      </Container>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          component={Link}
          href="/results"
        >
          Back to Results
        </Button>
      </Container>
    );
  }
  
  // Render empty state
  if (!results) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          No results found for this assignment.
        </Alert>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          component={Link}
          href="/results"
        >
          Back to Results
        </Button>
      </Container>
    );
  }
  
  // Calculate filtered students
  let filteredStudents: [string, StudentResult][] = [];
  
  // For single student submissions
  if (!results.student_results && results.student_name && results.score !== undefined) {
    const singleStudentResult: StudentResult = {
      score: results.score,
      total: results.total || 100,
      percentage: results.percentage || 0,
      grade_letter: results.grade_letter || 'N/A',
      grading_feedback: results.grading_feedback || '',
      criteria_scores: results.criteria_scores || [],
      mistakes: results.mistakes || {}
    };
    
    if (!searchQuery || results.student_name.toLowerCase().includes(searchQuery.toLowerCase())) {
      filteredStudents = [[results.student_name, singleStudentResult]];
    }
  }
  // For multiple students
  else if (results.student_results) {
    filteredStudents = Object.entries(results.student_results)
      .filter(([name]) => name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => b[1].percentage - a[1].percentage);
  }
  
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          {results.assignment_name || "Assignment Results"}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          {new Date(results.timestamp).toLocaleDateString(undefined, { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Typography>
        
        {/* Single Student Banner */}
        {results.student_name && !results.student_results && (
          <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
            <Typography variant="body1" fontWeight="medium">
              Single Student Submission: {results.student_name}
            </Typography>
            <Typography variant="body2">
              Score: {results.score}/{results.total || 100} ({(results.percentage || 0).toFixed(1)}%)
            </Typography>
          </Alert>
        )}
        
        <Box mt={1} display="flex" gap={1}>
          <Chip 
            icon={<PersonIcon />} 
            label={`${results.summary_stats?.submission_count || 1} Students`} 
            color="primary" 
            variant="outlined"
          />
          <Chip 
            icon={<GradeIcon />} 
            label={`Avg: ${results.summary_stats ? (results.summary_stats.average_score * 100).toFixed(1) : (results.percentage || 0).toFixed(1)}%`} 
            color={getScoreColor(results.summary_stats ? results.summary_stats.average_score * 100 : (results.percentage || 0))} 
            variant="outlined"
          />
          {results.summary_stats && (
            <Chip 
              icon={<CheckCircleIcon />} 
              label={`Pass Rate: ${(results.summary_stats.passing_count / results.summary_stats.submission_count * 100).toFixed(1)}%`} 
              color="success" 
              variant="outlined"
            />
          )}
        </Box>
      </Box>
      
      {/* Navigation */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          component={Link}
          href="/results"
        >
          Back to Results
        </Button>
        
        <Box>
          <Button
            variant="outlined"
            startIcon={<SaveIcon />}
            onClick={() => {
              const resultsJson = JSON.stringify(results, null, 2);
              const blob = new Blob([resultsJson], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `saved_results_${results.assignment_id || 'assignment'}_${new Date().toISOString().split('T')[0]}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            sx={{ mr: 2 }}
          >
            Save Results
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadResults}
          >
            Download Results
          </Button>
        </Box>
      </Box>
      
      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="results tabs">
          <Tab icon={<SummarizeIcon />} label="Summary" iconPosition="start" />
          <Tab icon={<PersonIcon />} label="Student Details" iconPosition="start" />
          <Tab icon={<BarChartIcon />} label="Analytics" iconPosition="start" />
          <Tab icon={<ArticleIcon />} label="Files" iconPosition="start" />
        </Tabs>
      </Box>
      
      {/* Summary Tab */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {/* Summary Stats */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
        <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="medium">
                  Assignment Statistics
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <PersonIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Total Students"
                      secondary={results.summary_stats?.submission_count || 1}
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <GradeIcon color="success" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Average Score"
                      secondary={`${results.summary_stats ? (results.summary_stats.average_score * 100).toFixed(1) : (results.percentage || 0).toFixed(1)}%`}
                    />
                  </ListItem>
                  
                  {results.summary_stats && (
                    <>
                      <ListItem>
                        <ListItemIcon>
                          <GradeIcon color="success" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Highest Score"
                          secondary={`${(results.summary_stats.highest_score * 100).toFixed(1)}%`}
                        />
                      </ListItem>
                      
                      <ListItem>
                        <ListItemIcon>
                          <WarningIcon color="warning" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Lowest Score"
                          secondary={`${(results.summary_stats.lowest_score * 100).toFixed(1)}%`}
                        />
                      </ListItem>
                      
                      <ListItem>
                        <ListItemIcon>
                          <CheckCircleIcon color="success" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Passing Students"
                          secondary={`${results.summary_stats.passing_count} (${(results.summary_stats.passing_count / results.summary_stats.submission_count * 100).toFixed(1)}%)`}
                        />
                      </ListItem>
                      
                      <ListItem>
                        <ListItemIcon>
                          <ErrorIcon color="error" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Failing Students"
                          secondary={`${results.summary_stats.failing_count} (${(results.summary_stats.failing_count / results.summary_stats.submission_count * 100).toFixed(1)}%)`}
                        />
                      </ListItem>
                    </>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Student List */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="medium">
                  Student Results
      </Typography>
      
                <TextField
                  fullWidth
                  placeholder="Search students..."
                  variant="outlined"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />
                
                <TableContainer component={Paper} variant="outlined">
        <Table>
                    <TableHead>
            <TableRow>
                        <TableCell>Student</TableCell>
                        <TableCell align="center">Score</TableCell>
                        <TableCell align="center">Grade</TableCell>
                        <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
                      {filteredStudents.length > 0 ? (
                        filteredStudents.map(([studentName, result]) => (
                          <TableRow 
                            key={studentName}
                            hover
                            sx={{
                              cursor: 'pointer',
                              '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
                              ...(selectedStudent === studentName && { backgroundColor: 'rgba(0, 0, 0, 0.08)' })
                            }}
                            onClick={() => handleStudentSelect(studentName)}
                          >
                            <TableCell component="th" scope="row">
                              <Box display="flex" alignItems="center">
                                <Avatar 
                                  sx={{ 
                                    bgcolor: getScoreColor(result.percentage),
                                    width: 32,
                                    height: 32,
                                    mr: 1.5,
                                    fontSize: '0.9rem'
                                  }}
                                >
                                  {studentName.substring(0, 2).toUpperCase()}
                                </Avatar>
                                <Typography>{studentName}</Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Box>
                                <Typography variant="body2" fontWeight="medium">
                                  {result.score}/{result.total}
                                </Typography>
                                <ScoreBar value={result.percentage} />
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                    <Chip 
                                label={result.grade_letter}
                      size="small"
                      sx={{ 
                                  fontWeight: 'bold',
                                  bgcolor: getGradeColor(result.grade_letter),
                                  color: 'white'
                      }}
                    />
                  </TableCell>
                            <TableCell align="center">
                              <Tooltip title="View Details">
                                <IconButton 
                                  size="small" 
                                  color="primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStudentSelect(studentName);
                                  }}
                                >
                                  <FormatListBulletedIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Chat with AI">
                                <IconButton 
                                  size="small"
                                  color="secondary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStudentSelect(studentName);
                                    // Additional chat functionality here
                                  }}
                                >
                                  <ChatIcon />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} align="center">
                            <Typography variant="body1" color="text.secondary" py={2}>
                              {results.student_results ? 
                                "No students found matching your search" : 
                                "This appears to be a single student submission"
                              }
                            </Typography>
                            {!results.student_results && results.student_name && (
                              <Button 
                                variant="contained" 
                                color="primary"
                                onClick={() => setTabValue(1)} // Switch to student details tab
                                sx={{ mt: 1 }}
                              >
                                View {results.student_name}'s Results
                              </Button>
                            )}
                          </TableCell>
                </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
      
      {/* Student Details Tab */}
      <TabPanel value={tabValue} index={1}>
        {((selectedStudent && results.student_results && results.student_results[selectedStudent]) || results.score) ? (
          <Grid container spacing={3}>
            {/* Student Overview */}
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ textAlign: 'center', pt: 4 }}>
                  <GradeAvatar 
              sx={{ 
                      mx: 'auto',
                      bgcolor: getGradeColor(
                        (selectedStudent && results.student_results && results.student_results[selectedStudent]?.grade_letter) || 
                        results.grade_letter || 
                        'N/A'
                      )
                    }}
                  >
                    {(selectedStudent && results.student_results && results.student_results[selectedStudent]?.grade_letter) || 
                     results.grade_letter || 
                     'N/A'}
                  </GradeAvatar>
                  
                  <Typography variant="h5" gutterBottom>
                    {selectedStudent || results.student_name || "Student"}
                  </Typography>
                  
                  <Typography variant="h4" fontWeight="bold" gutterBottom>
                    {(selectedStudent && results.student_results && results.student_results[selectedStudent]?.score) || results.score || 0} / 
                    {(selectedStudent && results.student_results && results.student_results[selectedStudent]?.total) || results.total || 100}
                  </Typography>
                  
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    {((selectedStudent && results.student_results && results.student_results[selectedStudent]?.percentage) || results.percentage || 0).toFixed(1)}%
                  </Typography>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box textAlign="left">
                    <Typography variant="h6" gutterBottom>
                      Overall Feedback
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                      {(selectedStudent && results.student_results && results.student_results[selectedStudent]?.grading_feedback) || 
                       results.grading_feedback || 
                       "No feedback available"}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Criteria Scores */}
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Grading Criteria
                  </Typography>
                  
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Criterion</TableCell>
                          <TableCell align="center">Score</TableCell>
                          <TableCell>Feedback</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {((selectedStudent && results.student_results && results.student_results[selectedStudent]?.criteria_scores) || 
                          results.criteria_scores || []).map((criterion: CriterionScore, index: number) => (
                          <TableRow key={index}>
                            <TableCell component="th" scope="row">
                              <Typography fontWeight="medium">{criterion.name}</Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Box>
                                <Typography variant="body2" fontWeight="medium">
                                  {criterion.points}/{criterion.max_points}
                                </Typography>
                                <ScoreBar value={(criterion.points / criterion.max_points) * 100} />
                              </Box>
                            </TableCell>
              <TableCell>
                              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                                {criterion.feedback}
                              </Typography>
              </TableCell>
            </TableRow>
                        ))}
          </TableBody>
        </Table>
      </TableContainer>
      
                  {/* Deductions */}
                  {((selectedStudent && results.student_results && results.student_results[selectedStudent]?.mistakes && 
                    Object.keys(results.student_results[selectedStudent].mistakes).length > 0) || 
                   (results.mistakes && Object.keys(results.mistakes).length > 0)) ? (
                    <Box mt={4}>
                      <Typography variant="h6" gutterBottom>
                        Deductions
                      </Typography>
                      
                      <TableContainer component={Paper} variant="outlined">
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Section</TableCell>
                              <TableCell>Points Lost</TableCell>
                              <TableCell>Reason</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {Object.entries(
                              (selectedStudent && results.student_results && results.student_results[selectedStudent]?.mistakes) || 
                              results.mistakes || {}
                            )
                            .filter(([_, mistake]) => mistake && mistake.deductions !== undefined && mistake.deductions > 0)
                            .map(([section, mistake], index) => (
                              <TableRow key={index}>
                                <TableCell>{section}</TableCell>
                                <TableCell>
                                  <Typography color="error">-{mistake.deductions}</Typography>
                                </TableCell>
                                <TableCell>{mistake.reasons}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  ) : null}
                </CardContent>
              </Card>
            </Grid>
            
            {/* For single submissions, show question and answer texts */}
            {!results.student_results && results.student_name && (
              <>
                {/* Question Text */}
                {results.question_text && (
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Question Paper
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Box sx={{ maxHeight: 300, overflow: 'auto', bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                          <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                            {results.question_text}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                
                {/* Submission Text */}
                {results.submission_text && (
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Student Submission
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Box sx={{ maxHeight: 300, overflow: 'auto', bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                          <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                            {results.submission_text}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                
                {/* Answer Key */}
                {results.answer_key && (
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Answer Key
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Box sx={{ maxHeight: 300, overflow: 'auto', bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                          <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                            {results.answer_key}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </>
            )}

            {/* Chat Interface */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    AI Assistant
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Box sx={{ height: 400 }}>
                    <ChatInterface 
                      assignmentId={id as string}
                      submissionId={selectedStudent ? `${id}_${selectedStudent}` : id as string}
                      studentName={selectedStudent || results.student_name}
                      questionText={results.question_text}
                      submissionText={results.submission_text}
                      gradingFeedback={(selectedStudent && results.student_results && 
                        results.student_results[selectedStudent]?.grading_feedback) || 
                        results.grading_feedback}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        ) : (
          <Box textAlign="center" py={4}>
            <Typography variant="h6" color="text.secondary">
              Select a student to view details
            </Typography>
          </Box>
        )}
      </TabPanel>
      
      {/* Analytics Tab */}
      <TabPanel value={tabValue} index={2}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Score Distribution
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Visualization of student performance across various score ranges.
          </Typography>
          
            <Box height={300} display="flex" alignItems="center" justifyContent="center">
              <Typography variant="body1" color="text.secondary">
                Analytics visualization will be displayed here
              </Typography>
              {/* In a real implementation, you would add a chart here */}
            </Box>
          </CardContent>
        </Card>
      </TabPanel>
      
      {/* Files Tab */}
      <TabPanel value={tabValue} index={3}>
        {loadingFiles ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : !files ? (
          <Alert severity="info">No files found for this submission.</Alert>
        ) : (
          <Grid container spacing={3}>
            {/* Files List */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Submission Files
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  {/* Question Papers */}
                  {files.question_papers && files.question_papers.length > 0 && (
                    <>
                      <Typography variant="subtitle1" fontWeight="medium" color="primary" gutterBottom>
                        Question Papers
                      </Typography>
                      <List>
                        {files.question_papers.map((file, index) => (
                          <ListItem 
                            key={index} 
                            disablePadding
                            secondaryAction={
                              <IconButton 
                                edge="end" 
                                aria-label="download"
                                href={`${axios.defaults.baseURL}${file.path}`}
                                target="_blank"
                                rel="noopener"
                              >
                                <DownloadIcon />
                              </IconButton>
                            }
                          >
                            <ListItemButton onClick={() => handleFileSelect(file)}>
                              <ListItemIcon>
                                {getFileIcon(file.content_type)}
                              </ListItemIcon>
                              <ListItemText 
                                primary={file.filename} 
                                secondary={`${formatFileSize(file.size)} · ${new Date(file.last_modified).toLocaleDateString()}`}
                              />
                            </ListItemButton>
                          </ListItem>
                        ))}
                      </List>
                    </>
                  )}
                  
                  {/* Student Submissions */}
                  {files.submissions && files.submissions.length > 0 && (
                    <>
                      <Typography variant="subtitle1" fontWeight="medium" color="primary" gutterBottom sx={{ mt: 3 }}>
                        Student Submissions
                      </Typography>
                      <List>
                        {files.submissions.map((file, index) => (
                          <ListItem 
                            key={index} 
                            disablePadding
                            secondaryAction={
                              <IconButton 
                                edge="end" 
                                aria-label="download"
                                href={`${axios.defaults.baseURL}${file.path}`}
                                target="_blank"
                                rel="noopener"
                              >
                                <DownloadIcon />
                              </IconButton>
                            }
                          >
                            <ListItemButton onClick={() => handleFileSelect(file)}>
                              <ListItemIcon>
                                {getFileIcon(file.content_type)}
                              </ListItemIcon>
                              <ListItemText 
                                primary={file.filename} 
                                secondary={`${formatFileSize(file.size)} · ${new Date(file.last_modified).toLocaleDateString()}`}
                              />
                            </ListItemButton>
                          </ListItem>
                        ))}
                      </List>
                    </>
                  )}
                  
                  {/* Answer Keys */}
                  {files.answer_keys && files.answer_keys.length > 0 && (
                    <>
                      <Typography variant="subtitle1" fontWeight="medium" color="primary" gutterBottom sx={{ mt: 3 }}>
                        Answer Keys
                      </Typography>
                      <List>
                        {files.answer_keys.map((file, index) => (
                          <ListItem 
                            key={index} 
                            disablePadding
                            secondaryAction={
                              <IconButton 
                                edge="end" 
                                aria-label="download"
                                href={`${axios.defaults.baseURL}${file.path}`}
                                target="_blank"
                                rel="noopener"
                              >
                                <DownloadIcon />
                              </IconButton>
                            }
                          >
                            <ListItemButton onClick={() => handleFileSelect(file)}>
                              <ListItemIcon>
                                {getFileIcon(file.content_type)}
                              </ListItemIcon>
                              <ListItemText 
                                primary={file.filename} 
                                secondary={`${formatFileSize(file.size)} · ${new Date(file.last_modified).toLocaleDateString()}`}
                              />
                            </ListItemButton>
                          </ListItem>
                        ))}
                      </List>
                    </>
                  )}
                  
                  {/* Original Files */}
                  {files.original_files && files.original_files.length > 0 && (
                    <>
                      <Typography variant="subtitle1" fontWeight="medium" color="primary" gutterBottom sx={{ mt: 3 }}>
                        Other Files
                      </Typography>
                      <List>
                        {files.original_files.map((file, index) => (
                          <ListItem 
                            key={index} 
                            disablePadding
                            secondaryAction={
                              <IconButton 
                                edge="end" 
                                aria-label="download"
                                href={`${axios.defaults.baseURL}${file.path}`}
                                target="_blank"
                                rel="noopener"
                              >
                                <DownloadIcon />
                              </IconButton>
                            }
                          >
                            <ListItemButton onClick={() => handleFileSelect(file)}>
                              <ListItemIcon>
                                {getFileIcon(file.content_type)}
                              </ListItemIcon>
                              <ListItemText 
                                primary={file.filename} 
                                secondary={`${formatFileSize(file.size)} · ${new Date(file.last_modified).toLocaleDateString()}`}
                              />
                            </ListItemButton>
                          </ListItem>
                        ))}
                      </List>
        </>
      )}
      
                  {/* No files found */}
                  {(!files.question_papers || files.question_papers.length === 0) &&
                   (!files.submissions || files.submissions.length === 0) &&
                   (!files.answer_keys || files.answer_keys.length === 0) &&
                   (!files.original_files || files.original_files.length === 0) && (
                    <Box textAlign="center" py={4}>
                      <Typography variant="body1" color="text.secondary">
                        No files found for this submission.
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
            
            {/* PDF/File Viewer */}
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="h6" gutterBottom>
                    File Preview
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  {selectedFile ? (
                    <>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="subtitle1">
                          {selectedFile.filename}
                        </Typography>
                        <Button 
                          variant="outlined" 
                          startIcon={<OpenInNewIcon />}
                          href={`${axios.defaults.baseURL}${selectedFile.path}`}
                          target="_blank"
                        >
                          Open in New Tab
                        </Button>
                      </Box>
                      
                      {selectedFile.content_type.includes('pdf') ? (
                        <Box sx={{ flexGrow: 1, minHeight: 500 }}>
                          <iframe 
                            src={`${axios.defaults.baseURL}${selectedFile.path}`}
                            style={{ width: '100%', height: '100%', minHeight: 500, border: 'none' }}
                            title={selectedFile.filename}
                          />
                        </Box>
                      ) : selectedFile.content_type.includes('image') ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
                          <img 
                            src={`${axios.defaults.baseURL}${selectedFile.path}`}
                            alt={selectedFile.filename}
                            style={{ maxWidth: '100%', maxHeight: 500, objectFit: 'contain' }}
                          />
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1 }}>
                          {getFileIcon(selectedFile.content_type)}
                          <Typography variant="body1" sx={{ mt: 2 }}>
                            This file type cannot be previewed directly.
                          </Typography>
                          <Button
                            variant="contained"
                            startIcon={<DownloadIcon />}
                            href={`${axios.defaults.baseURL}${selectedFile.path}`}
                            download
                            sx={{ mt: 2 }}
                          >
                            Download File
                          </Button>
                        </Box>
                      )}
                    </>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1 }}>
                      <ArticleIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="body1" color="text.secondary">
                        Select a file to preview
        </Typography>
      </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </TabPanel>
    </Container>
  );
} 