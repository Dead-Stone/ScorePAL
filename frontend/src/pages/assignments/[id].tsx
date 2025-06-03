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
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import DownloadIcon from '@mui/icons-material/Download';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BarChartIcon from '@mui/icons-material/BarChart';
import axios from 'axios';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// Define types for the data
interface CriterionScore {
  name: string;
  points: number;
  max_points: number;
  feedback: string;
}

interface Mistake {
  description: string;
}

interface GradingResult {
  student_name: string;
  score: number;
  max_score: number;
  percentage: number;
  grade_letter: string;
  feedback: string;
  criteria_scores: CriterionScore[];
  mistakes: Mistake[];
  timestamp: string;
}

interface BatchInfo {
  id: string;
  timestamp: string;
  total_submissions: number;
}

interface SummaryStats {
  average_score: number;
  average_percentage: number;
  passing_count: number;
  submission_count: number;
  grade_distribution: {
    A: number;
    B: number;
    C: number;
    D: number;
    F: number;
  };
}

interface TableData {
  headers: string[];
  rows: any[];
}

interface BatchResults {
  batch_info: BatchInfo;
  summary_stats: SummaryStats;
  student_results: { [key: string]: GradingResult };
  tabular_data: TableData;
}

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
      id={`assignment-tabpanel-${index}`}
      aria-labelledby={`assignment-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function AssignmentDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [results, setResults] = useState<BatchResults | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  
  useEffect(() => {
    if (!id) return;
    
    const fetchResults = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(`/api/assignments/${id}`);
        setResults(response.data);
        
        // Select the first student by default if available
        if (response.data.student_results) {
          const students = Object.keys(response.data.student_results);
          if (students.length > 0) {
            setSelectedStudent(students[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching assignment results:', err);
        setError('Failed to load assignment results. Please try again later.');
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
    setTabValue(2); // Switch to student details tab
  };
  
  const handleDownloadPDF = async () => {
    try {
      const response = await axios.get(`/api/export-assignment/${id}?format=pdf`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Assignment_${id}_Results.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error downloading PDF:', err);
      setError('Failed to download PDF. Please try again later.');
    }
  };
  
  const handleDownloadCSV = async () => {
    try {
      const response = await axios.get(`/api/export-assignment/${id}?format=csv`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Assignment_${id}_Results.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error downloading CSV:', err);
      setError('Failed to download CSV. Please try again later.');
    }
  };
  
  // Helper function to get color based on percentage
  const getScoreColor = (percentage: number) => {
    if (percentage >= 90) return 'success.main';
    if (percentage >= 80) return 'success.light';
    if (percentage >= 70) return 'warning.light';
    if (percentage >= 60) return 'warning.main';
    return 'error.main';
  };
  
  // Helper function to get background color for grade distribution
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return '#4caf50'; // green
      case 'B': return '#8bc34a'; // light green
      case 'C': return '#ffeb3b'; // yellow
      case 'D': return '#ff9800'; // orange
      case 'F': return '#f44336'; // red
      default: return '#9e9e9e'; // grey
    }
  };
  
  // Prepare data for grade distribution chart
  const prepareGradeDistributionData = (gradeDistribution: SummaryStats['grade_distribution']) => {
    return Object.entries(gradeDistribution).map(([grade, count]) => ({
      name: grade,
      value: count,
      color: getGradeColor(grade)
    }));
  };
  
  // Render loading state
  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
          <CircularProgress size={60} thickness={4} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading assignment results...
          </Typography>
        </Box>
      </Container>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/')}
        >
          Back to Home
        </Button>
      </Container>
    );
  }
  
  // Render empty state
  if (!results) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          No results found for this assignment.
        </Alert>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/')}
        >
          Back to Home
        </Button>
      </Container>
    );
  }
  
  // Get currently selected student result
  const selectedStudentResult = selectedStudent && results.student_results[selectedStudent] 
    ? results.student_results[selectedStudent] 
    : null;
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Assignment Results
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Assignment ID: {id}
        </Typography>
        <Typography variant="subtitle2" color="text.secondary">
          Submissions: {results.summary_stats.submission_count} | 
          Avg. Score: {results.summary_stats.average_percentage.toFixed(1)}%
        </Typography>
      </Box>
      
      {/* Navigation and Download */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/')}
        >
          Back to Home
        </Button>
        
        <Box>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadCSV}
            sx={{ mr: 2 }}
          >
            Download CSV
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadPDF}
          >
            Download PDF
          </Button>
        </Box>
      </Box>
      
      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="assignment results tabs"
          variant="fullWidth"
        >
          <Tab 
            icon={<BarChartIcon />} 
            label="Summary" 
            id="assignment-tab-0"
            aria-controls="assignment-tabpanel-0"
          />
          <Tab 
            icon={<GroupIcon />} 
            label="All Students" 
            id="assignment-tab-1"
            aria-controls="assignment-tabpanel-1"
          />
          <Tab 
            icon={<PersonIcon />} 
            label="Student Details" 
            id="assignment-tab-2"
            aria-controls="assignment-tabpanel-2"
            disabled={!selectedStudent}
          />
        </Tabs>
      </Box>
      
      {/* Summary Tab */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={4}>
          {/* Summary Stats Cards */}
          <Grid item xs={12} md={6}>
            <Card elevation={3} sx={{ height: '100%', borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Class Performance
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Average Score
                      </Typography>
                      <Typography variant="h4" color={getScoreColor(results.summary_stats.average_percentage)}>
                        {results.summary_stats.average_percentage.toFixed(1)}%
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Passing Rate
                      </Typography>
                      <Typography variant="h4" color={
                        results.summary_stats.passing_count / results.summary_stats.submission_count >= 0.7
                          ? 'success.main'
                          : 'warning.main'
                      }>
                        {results.summary_stats.submission_count > 0
                          ? ((results.summary_stats.passing_count / results.summary_stats.submission_count) * 100).toFixed(1)
                          : 0}%
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle2" color="text.secondary">
                        Total Submissions
                      </Typography>
                      <Typography variant="h5">
                        {results.summary_stats.submission_count}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Grade Distribution Card */}
          <Grid item xs={12} md={6}>
            <Card elevation={3} sx={{ height: '100%', borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Grade Distribution
                </Typography>
                <Box sx={{ height: 200, mt: 2 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={prepareGradeDistributionData(results.summary_stats.grade_distribution)}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        dataKey="value"
                      >
                        {prepareGradeDistributionData(results.summary_stats.grade_distribution).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name) => [`${value} students`, `Grade ${name}`]}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Score Distribution Chart */}
          <Grid item xs={12}>
            <Card elevation={3} sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Student Performance
                </Typography>
                <Box sx={{ height: 300, mt: 2 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={results.tabular_data.rows.map(row => ({
                        name: row.Student,
                        score: parseFloat(row.Percentage.replace('%', '')),
                        grade: row.Grade
                      }))}
                      margin={{ top: 5, right: 30, left: 20, bottom: 50 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis 
                        domain={[0, 100]}
                        label={{ value: 'Score (%)', angle: -90, position: 'insideLeft' }} 
                      />
                      <Tooltip formatter={(value) => [`${value}%`, 'Score']} />
                      <Legend />
                      <Bar 
                        dataKey="score" 
                        name="Score" 
                        fill="#2196f3"
                        isAnimationActive={true}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
      
      {/* All Students Tab */}
      <TabPanel value={tabValue} index={1}>
        <Typography variant="h6" gutterBottom>
          Student Results
        </Typography>
        
        <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead sx={{ bgcolor: 'primary.main' }}>
              <TableRow>
                {results.tabular_data.headers.map((header, index) => (
                  <TableCell 
                    key={index}
                    sx={{ color: 'white', fontWeight: 'bold' }}
                  >
                    {header}
                  </TableCell>
                ))}
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {results.tabular_data.rows.map((row, rowIndex) => (
                <TableRow key={rowIndex} hover>
                  {results.tabular_data.headers.map((header, colIndex) => {
                    // Special formatting for percentage
                    if (header === 'Percentage') {
                      const percentage = parseFloat(row[header].replace('%', ''));
                      return (
                        <TableCell key={colIndex}>
                          <Chip 
                            label={row[header]}
                            size="small"
                            sx={{ 
                              bgcolor: getScoreColor(percentage),
                              color: 'white',
                              fontWeight: 'bold'
                            }}
                          />
                        </TableCell>
                      );
                    }
                    // Standard rendering for other columns
                    return (
                      <TableCell key={colIndex}>
                        {row[header]}
                      </TableCell>
                    );
                  })}
                  <TableCell>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleStudentSelect(row.Student)}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>
      
      {/* Student Details Tab */}
      <TabPanel value={tabValue} index={2}>
        {selectedStudentResult ? (
          <>
            {/* Overall Score Card */}
            <Card 
              elevation={3} 
              sx={{ 
                mb: 4, 
                borderRadius: 2,
                borderTop: 6, 
                borderColor: getScoreColor(selectedStudentResult.percentage) 
              }}
            >
              <CardContent>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={8}>
                    <Typography variant="h5" component="div" gutterBottom>
                      {selectedStudent}'s Submission
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {selectedStudentResult.feedback}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4} sx={{ textAlign: 'center' }}>
                    <Box sx={{ 
                      p: 2, 
                      borderRadius: 2,
                      bgcolor: 'background.default',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center'
                    }}>
                      <Typography variant="h3" color={getScoreColor(selectedStudentResult.percentage)}>
                        {selectedStudentResult.grade_letter}
                      </Typography>
                      <Typography variant="h4">
                        {selectedStudentResult.score}/{selectedStudentResult.max_score}
                      </Typography>
                      <Typography variant="h6" color={getScoreColor(selectedStudentResult.percentage)}>
                        {selectedStudentResult.percentage.toFixed(1)}%
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
            
            {/* Criteria Scores Table */}
            <Typography variant="h6" gutterBottom sx={{ mt: 4, mb: 2 }}>
              Detailed Scoring
            </Typography>
            
            {selectedStudentResult.criteria_scores && selectedStudentResult.criteria_scores.length > 0 ? (
              <TableContainer component={Paper} elevation={2} sx={{ mb: 4, overflow: 'hidden', borderRadius: 2 }}>
                <Table>
                  <TableHead sx={{ bgcolor: 'primary.main' }}>
                    <TableRow>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Criterion</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Score</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Max</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Percentage</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Feedback</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedStudentResult.criteria_scores.map((criterion, index) => {
                      const criterionPercentage = (criterion.points / criterion.max_points) * 100;
                      return (
                        <TableRow key={index} hover>
                          <TableCell sx={{ fontWeight: 'medium' }}>{criterion.name}</TableCell>
                          <TableCell>{criterion.points}</TableCell>
                          <TableCell>{criterion.max_points}</TableCell>
                          <TableCell>
                            <Chip 
                              label={`${criterionPercentage.toFixed(1)}%`}
                              size="small"
                              sx={{ 
                                bgcolor: getScoreColor(criterionPercentage),
                                color: 'white',
                                fontWeight: 'bold'
                              }}
                            />
                          </TableCell>
                          <TableCell>{criterion.feedback}</TableCell>
                        </TableRow>
                      );
                    })}
                    {/* Total row */}
                    <TableRow 
                      sx={{ 
                        bgcolor: 'background.default',
                        '& td': { fontWeight: 'bold' } 
                      }}
                    >
                      <TableCell>TOTAL</TableCell>
                      <TableCell>{selectedStudentResult.score}</TableCell>
                      <TableCell>{selectedStudentResult.max_score}</TableCell>
                      <TableCell>
                        <Chip 
                          label={`${selectedStudentResult.percentage.toFixed(1)}%`}
                          size="small"
                          sx={{ 
                            bgcolor: getScoreColor(selectedStudentResult.percentage),
                            color: 'white',
                            fontWeight: 'bold'
                          }}
                        />
                      </TableCell>
                      <TableCell>{selectedStudentResult.grade_letter}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info" sx={{ mb: 4 }}>
                No detailed criteria scores available for this student.
              </Alert>
            )}
            
            {/* Areas for Improvement */}
            {selectedStudentResult.mistakes && selectedStudentResult.mistakes.length > 0 && (
              <>
                <Typography variant="h6" gutterBottom sx={{ mt: 4, mb: 2 }}>
                  Areas for Improvement
                </Typography>
                
                <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
                  <ul style={{ paddingLeft: '20px' }}>
                    {selectedStudentResult.mistakes.map((mistake, index) => (
                      <li key={index}>
                        <Typography variant="body1" paragraph>
                          {mistake.description}
                        </Typography>
                      </li>
                    ))}
                  </ul>
                </Paper>
              </>
            )}
          </>
        ) : (
          <Alert severity="info">
            Please select a student from the "All Students" tab to view detailed results.
          </Alert>
        )}
      </TabPanel>
      
      {/* Timestamp */}
      <Box sx={{ mt: 4, textAlign: 'right' }}>
        <Typography variant="body2" color="text.secondary">
          Graded on: {new Date(results.batch_info.timestamp).toLocaleString()}
        </Typography>
      </Box>
    </Container>
  );
} 