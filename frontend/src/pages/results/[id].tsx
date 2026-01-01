import React, { useState, useEffect, useMemo, memo } from 'react';
import { useRouter } from 'next/router';
import { GetStaticProps, GetStaticPaths } from 'next';
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
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { TopNavBar } from '@/components/layout/TopNavBar';
// Optimize icon imports - tree-shakeable
import {
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Download as DownloadIcon,
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  Grade as GradeIcon,
  Feedback as FeedbackIcon,
  BarChart as BarChartIcon,
  Summarize as SummarizeIcon,
  FormatListBulleted as FormatListBulletedIcon,
  Chat as ChatIcon,
  Article as ArticleIcon,
} from '@mui/icons-material';

import Link from 'next/link';
import apiClient from '@/utils/apiClient';
// Lazy load heavy components
import dynamic from 'next/dynamic';
const ChatInterface = dynamic(() => import('../../components/ChatInterface'), { ssr: false });
const FileBrowser = dynamic(() => import('../../components/FileBrowser'), { ssr: false });
import SaveIcon from '@mui/icons-material/Save';

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
  canvas_comparison?: {
    canvas_posted_grade?: string;
    canvas_posted_score?: number;
    canvas_posted_percentage?: number;
    ai_score: number;
    ai_total: number;
    ai_percentage: number;
    score_difference?: number;
    percentage_difference?: number;
    comparison_status: string;
    canvas_submission_url?: string;
    last_updated?: string;
  } | null;
  ai_model_used?: string;
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
  canvas_comparison?: {
    canvas_posted_grade?: string;
    canvas_posted_score?: number;
    canvas_posted_percentage?: number;
    ai_score: number;
    ai_total: number;
    ai_percentage: number;
    score_difference?: number;
    percentage_difference?: number;
    comparison_status: string;
    canvas_submission_url?: string;
    last_updated?: string;
  } | null;
  ai_model_used?: string;
  rubric?: any;
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

// Static generation for dynamic routes - compile at build time
export const getStaticPaths: GetStaticPaths = async () => {
  // Return empty paths array - pages will be generated on-demand
  return {
    paths: [],
    fallback: 'blocking', // Generate page on-demand but cache it
  };
};

export const getStaticProps: GetStaticProps = async (context) => {
  return {
    props: {},
    revalidate: 3600, // Revalidate every hour
  };
};

export default function ResultsPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [results, setResults] = useState<GradingResults | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  
  useEffect(() => {
    if (!id) return;
    
    const fetchResults = async () => {
      try {
        setIsLoading(true);
        // Try new MongoDB API first, fall back to old endpoint
        let response;
        try {
          response = await apiClient.get(`/api/results/${id}?include_canvas_comparison=true`);
          // Transform MongoDB result to expected format
          const result = response.data;
          const transformedData: GradingResults = {
            id: result.id || id as string,
            assignment_id: result.assignment_id,
            assignment_name: result.assignment_id,
            student_name: result.student_name,
            score: result.score,
            total: result.total_points,
            percentage: result.percentage,
            grade_letter: result.grade_letter,
            grading_feedback: result.overall_feedback || result.detailed_feedback,
            criteria_scores: result.criteria_scores || [],
            mistakes: result.mistakes || {},
            submission_text: result.submission_text,
            question_text: result.question_text,
            answer_key: result.answer_key_text,
            timestamp: result.graded_at || new Date().toISOString(),
            canvas_comparison: result.canvas_comparison || null,
            ai_model_used: result.ai_model_used || 'Unknown',
            rubric: result.rubric_used || result.rubric,
          };
          setResults(transformedData);
          if (result.student_name) {
            setSelectedStudent(result.student_name);
          }
        } catch (newApiError) {
          // Fall back to old endpoint
          response = await apiClient.get(`/grading-results/${id}`);
          setResults(response.data);
          
          // Select the first student by default if available
          if (response.data && response.data.student_results) {
            const studentNames = Object.keys(response.data.student_results);
            if (studentNames.length > 0) {
              setSelectedStudent(studentNames[0]);
            }
          } else if (response.data && response.data.student_name) {
            setSelectedStudent(response.data.student_name);
          }
        }
      } catch (err) {
        // Error handled by UI state
        setError('Failed to load results. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchResults();
  }, [id]);
  

  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const handleStudentSelect = (studentName: string) => {
    setSelectedStudent(studentName);
    setTabValue(1); // Switch to student details tab
  };

  // Memoize filtered students calculation - MUST be before conditional returns
  const filteredStudents = useMemo<[string, StudentResult][]>(() => {
    if (!results) return [];
    
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
        return [[results.student_name, singleStudentResult]];
      }
      return [];
    }
    // For multiple students
    if (results.student_results) {
      return Object.entries(results.student_results)
        .filter(([name]) => name.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => b[1].percentage - a[1].percentage);
    }
    return [];
  }, [results, searchQuery]);
  
  const handleDownloadResults = async () => {
    try {
      const response = await apiClient.get(`/grading-results/${id}/download`, {
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
      // Download error handled by UI
      setError('Failed to download results');
    }
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <TopNavBar />
        <Container maxWidth="lg" sx={{ py: 6, pt: { xs: 12, sm: 12 } }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
            <CircularProgress size={60} thickness={4} />
            <Typography variant="h6" sx={{ mt: 3 }}>
              Loading grading results...
            </Typography>
          </Box>
        </Container>
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <TopNavBar />
        <Container maxWidth="lg" sx={{ py: 6, pt: { xs: 12, sm: 12 } }}>
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
      </div>
    );
  }
  
  // Render empty state
  if (!results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <TopNavBar />
        <Container maxWidth="lg" sx={{ py: 6, pt: { xs: 12, sm: 12 } }}>
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
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <TopNavBar />
      <Container maxWidth="lg" sx={{ py: 6, pt: { xs: 12, sm: 12 } }}>
        {/* Header */}
        <Box mb={4}>
          <Typography 
            variant="h3" 
            component="h1" 
            gutterBottom 
            fontWeight="bold"
            sx={{ 
              background: 'linear-gradient(135deg, #1D80C3 0%, #4F46E5 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1
            }}
          >
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
          {results?.canvas_comparison && (
            <Tab icon={<GradeIcon />} label="Grade Comparison" iconPosition="start" />
          )}
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
                  Rubric-Based Assignment Statistics
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
            
            {/* Rubric Analysis - Enhanced */}
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Rubric-Based Assessment
                  </Typography>
                  
                  {/* Rubric Summary */}
                  <Box mb={3}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Performance by Criterion
                    </Typography>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      {(() => {
                        const criteriaScores = (selectedStudent && results.student_results && results.student_results[selectedStudent]?.criteria_scores) || 
                                             results.criteria_scores;
                        return Array.isArray(criteriaScores) ? criteriaScores : [];
                      })().map((criterion: CriterionScore, index: number) => {
                        const percentage = (criterion.points / criterion.max_points) * 100;
                        return (
                          <Chip
                            key={index}
                            label={`${criterion.name}: ${criterion.points}/${criterion.max_points}`}
                            color={percentage >= 80 ? 'success' : percentage >= 60 ? 'warning' : 'error'}
                            variant="outlined"
                            size="small"
                          />
                        );
                      })}
                    </Box>
                  </Box>
                  
                  {/* Detailed Rubric Table */}
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Rubric Criterion</strong></TableCell>
                          <TableCell align="center"><strong>Score</strong></TableCell>
                          <TableCell align="center"><strong>Performance</strong></TableCell>
                          <TableCell><strong>Detailed Feedback</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(() => {
                          const criteriaScores = (selectedStudent && results.student_results && results.student_results[selectedStudent]?.criteria_scores) || 
                                               results.criteria_scores;
                          return Array.isArray(criteriaScores) ? criteriaScores : [];
                        })().map((criterion: CriterionScore, index: number) => {
                          const percentage = (criterion.points / criterion.max_points) * 100;
                          return (
                            <TableRow key={index}>
                              <TableCell component="th" scope="row">
                                <Typography fontWeight="medium">{criterion.name}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Max: {criterion.max_points} points
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Box>
                                  <Typography variant="body2" fontWeight="medium">
                                    {criterion.points}/{criterion.max_points}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {percentage.toFixed(1)}%
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell align="center">
                                <Box>
                                  <ScoreBar value={percentage} />
                                  <Typography variant="caption" color="text.secondary">
                                    {percentage >= 80 ? 'Excellent' : 
                                     percentage >= 60 ? 'Good' : 
                                     percentage >= 40 ? 'Fair' : 'Needs Improvement'}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                                  {criterion.feedback || 'No specific feedback provided for this criterion.'}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  
                  {/* Rubric Performance Summary */}
                  <Box mt={3} p={2} bgcolor="grey.50" borderRadius={1}>
                    <Typography variant="subtitle2" gutterBottom>
                      Rubric Performance Summary
                    </Typography>
                    <Box display="flex" gap={2} flexWrap="wrap">
                      {(() => {
                        const criteriaScores = (selectedStudent && results.student_results && results.student_results[selectedStudent]?.criteria_scores) || 
                                             results.criteria_scores;
                        const safeCriteriaScores = Array.isArray(criteriaScores) ? criteriaScores : [];
                        const totalPoints = safeCriteriaScores.reduce((sum, c) => sum + c.points, 0);
                        const totalMaxPoints = safeCriteriaScores.reduce((sum, c) => sum + c.max_points, 0);
                        const overallPercentage = totalMaxPoints > 0 ? (totalPoints / totalMaxPoints) * 100 : 0;
                        
                        const excellentCriteria = safeCriteriaScores.filter(c => (c.points / c.max_points) * 100 >= 80).length;
                        const goodCriteria = safeCriteriaScores.filter(c => {
                          const pct = (c.points / c.max_points) * 100;
                          return pct >= 60 && pct < 80;
                        }).length;
                        const needsImprovementCriteria = safeCriteriaScores.filter(c => (c.points / c.max_points) * 100 < 60).length;
                        
                        return (
                          <>
                            <Chip 
                              label={`Overall: ${overallPercentage.toFixed(1)}%`}
                              color={overallPercentage >= 80 ? 'success' : overallPercentage >= 60 ? 'warning' : 'error'}
                              variant="filled"
                            />
                            <Chip 
                              label={`Excellent: ${excellentCriteria}`}
                              color="success"
                              size="small"
                            />
                            <Chip 
                              label={`Good: ${goodCriteria}`}
                              color="warning"
                              size="small"
                            />
                            <Chip 
                              label={`Needs Improvement: ${needsImprovementCriteria}`}
                              color="error"
                              size="small"
                            />
                          </>
                        );
                      })()}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Rubric Analysis - Areas for Improvement */}
            {((selectedStudent && results.student_results && results.student_results[selectedStudent]?.mistakes && 
              Object.keys(results.student_results[selectedStudent].mistakes).length > 0) || 
             (results.mistakes && Object.keys(results.mistakes).length > 0)) && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Areas for Improvement
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Specific areas where the student can improve based on rubric criteria
                    </Typography>
                    
                    <TableContainer component={Paper} variant="outlined">
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>Rubric Area</strong></TableCell>
                            <TableCell><strong>Issue Identified</strong></TableCell>
                            <TableCell><strong>Impact on Score</strong></TableCell>
                            <TableCell><strong>Recommendation</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {Object.entries(
                            (selectedStudent && results.student_results && results.student_results[selectedStudent]?.mistakes) || 
                            results.mistakes || {}
                          )
                          .filter(([_, mistake]) => mistake && (mistake.deductions !== undefined || mistake.description))
                          .map(([section, mistake], index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <Typography fontWeight="medium">{section}</Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                  {mistake.description || mistake.reasons || 'Specific issue not detailed'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {mistake.deductions !== undefined && mistake.deductions > 0 ? (
                                  <Typography color="error" fontWeight="medium">
                                    -{mistake.deductions} points
                                  </Typography>
                                ) : (
                                  <Typography color="warning" variant="body2">
                                    Minor impact
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                  {(() => {
                                    const issue = mistake.description || mistake.reasons || '';
                                    if (issue.toLowerCase().includes('missing')) {
                                      return 'Include this element in future submissions';
                                    } else if (issue.toLowerCase().includes('unclear') || issue.toLowerCase().includes('vague')) {
                                      return 'Provide more specific and detailed explanations';
                                    } else if (issue.toLowerCase().includes('incorrect')) {
                                      return 'Review the correct approach or concept';
                                    } else {
                                      return 'Focus on improving clarity and completeness';
                                    }
                                  })()}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>
            )}
            
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
                      rubric={results.rubric}
                      criteriaScores={(selectedStudent && results.student_results && 
                        results.student_results[selectedStudent]?.criteria_scores) || 
                        results.criteria_scores}
                      mistakes={(selectedStudent && results.student_results && 
                        results.student_results[selectedStudent]?.mistakes) || 
                        results.mistakes}
                      score={(selectedStudent && results.student_results && 
                        results.student_results[selectedStudent]?.score) || 
                        results.score}
                      maxScore={(selectedStudent && results.student_results && 
                        results.student_results[selectedStudent]?.total) || 
                        results.total}
                      percentage={(selectedStudent && results.student_results && 
                        results.student_results[selectedStudent]?.percentage) || 
                        results.percentage}
                      gradeLetter={(selectedStudent && results.student_results && 
                        results.student_results[selectedStudent]?.grade_letter) || 
                        results.grade_letter}
                      answerKey={results.answer_key}
                      assignmentName={results.assignment_name}
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
      
      {/* Grade Comparison Tab */}
      {results?.canvas_comparison && (
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    AI Grade vs Canvas Posted Grade
                  </Typography>
                  <Divider sx={{ mb: 3 }} />
                  
                  <Grid container spacing={3}>
                    {/* AI Grade Card */}
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined" sx={{ bgcolor: 'primary.50' }}>
                        <CardContent>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            AI Grade ({results.ai_model_used || 'Unknown Model'})
                          </Typography>
                          <Typography variant="h4" fontWeight="bold" color="primary.main">
                            {results.score?.toFixed(1)} / {results.total?.toFixed(1)}
                          </Typography>
                          <Typography variant="h6" color="text.secondary">
                            {results.percentage?.toFixed(1)}% ({results.grade_letter})
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    
                    {/* Canvas Grade Card */}
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined" sx={{ bgcolor: 'info.50' }}>
                        <CardContent>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Canvas Posted Grade
                          </Typography>
                          {results.canvas_comparison?.canvas_posted_score !== null && results.canvas_comparison?.canvas_posted_score !== undefined ? (
                            <>
                              <Typography variant="h4" fontWeight="bold" color="info.main">
                                {results.canvas_comparison.canvas_posted_score.toFixed(1)} / {results.total?.toFixed(1)}
                              </Typography>
                              <Typography variant="h6" color="text.secondary">
                                {results.canvas_comparison.canvas_posted_percentage?.toFixed(1)}%
                              </Typography>
                            </>
                          ) : (
                            <Typography variant="body1" color="text.secondary">
                              No grade posted yet
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                    
                    {/* Comparison Stats */}
                    {results.canvas_comparison?.score_difference !== null && results.canvas_comparison?.score_difference !== undefined && (
                      <Grid item xs={12}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="subtitle1" gutterBottom>
                              Comparison Analysis
                            </Typography>
                            <Grid container spacing={2} sx={{ mt: 1 }}>
                              <Grid item xs={12} sm={6}>
                                <Box>
                                  <Typography variant="body2" color="text.secondary">
                                    Score Difference
                                  </Typography>
                                  <Typography 
                                    variant="h6" 
                                    color={
                                      Math.abs(results.canvas_comparison.score_difference) <= 1 ? 'success.main' :
                                      Math.abs(results.canvas_comparison.score_difference) <= 5 ? 'warning.main' : 'error.main'
                                    }
                                  >
                                    {results.canvas_comparison.score_difference > 0 ? '+' : ''}
                                    {results.canvas_comparison.score_difference.toFixed(2)} points
                                  </Typography>
                                </Box>
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <Box>
                                  <Typography variant="body2" color="text.secondary">
                                    Percentage Difference
                                  </Typography>
                                  <Typography 
                                    variant="h6"
                                    color={
                                      Math.abs(results.canvas_comparison.percentage_difference || 0) <= 1 ? 'success.main' :
                                      Math.abs(results.canvas_comparison.percentage_difference || 0) <= 5 ? 'warning.main' : 'error.main'
                                    }
                                  >
                                    {results.canvas_comparison.percentage_difference && results.canvas_comparison.percentage_difference > 0 ? '+' : ''}
                                    {results.canvas_comparison.percentage_difference?.toFixed(2)}%
                                  </Typography>
                                </Box>
                              </Grid>
                              <Grid item xs={12}>
                                <Chip
                                  label={
                                    results.canvas_comparison.comparison_status === 'exact_match' ? 'Exact Match' :
                                    results.canvas_comparison.comparison_status === 'close_match' ? 'Close Match' :
                                    results.canvas_comparison.comparison_status === 'moderate_difference' ? 'Moderate Difference' :
                                    results.canvas_comparison.comparison_status === 'significant_difference' ? 'Significant Difference' :
                                    'No Comparison Available'
                                  }
                                  color={
                                    results.canvas_comparison.comparison_status === 'exact_match' ? 'success' :
                                    results.canvas_comparison.comparison_status === 'close_match' ? 'info' :
                                    results.canvas_comparison.comparison_status === 'moderate_difference' ? 'warning' :
                                    'error'
                                  }
                                  sx={{ mt: 1 }}
                                />
                              </Grid>
                            </Grid>
                            {results.canvas_comparison.canvas_submission_url && (
                              <Box sx={{ mt: 2 }}>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  href={results.canvas_comparison.canvas_submission_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  View Canvas Submission
                                </Button>
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      )}
      
      {/* Analytics Tab */}
      <TabPanel value={tabValue} index={results?.canvas_comparison ? 3 : 2}>
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
      <TabPanel value={tabValue} index={results?.canvas_comparison ? 4 : 3}>
        <FileBrowser 
          assignmentId={id as string}
          title="Assignment Files"
          showCategories={true}
        />
      </TabPanel>
      </Container>
    </div>
  );
} 