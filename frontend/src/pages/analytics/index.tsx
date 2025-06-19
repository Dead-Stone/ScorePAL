/**
 * ScorePAL - AI-Powered Academic Grading Assistant
 * Analytics Dashboard & Performance Insights
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 * @repository https://github.com/Dead-Stone/ScorePAL
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PeopleIcon from '@mui/icons-material/People';
import SchoolIcon from '@mui/icons-material/School';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import StarIcon from '@mui/icons-material/Star';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { API_BASE_URL } from '@/config/api';

// Dynamic import for Chart.js components
import dynamic from 'next/dynamic';
const Chart = dynamic(() => import('react-chartjs-2').then(mod => mod.Bar), { ssr: false });
const PieChart = dynamic(() => import('react-chartjs-2').then(mod => mod.Pie), { ssr: false });
const LineChart = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), { ssr: false });

// This needs to be imported only on the client side
interface ChartWrapperProps {
  children: React.ReactNode;
}

const ChartWrapper: React.FC<ChartWrapperProps> = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    
    // Import Chart.js and register required components
    const importChartjs = async () => {
      const { Chart, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend } = await import('chart.js');
      Chart.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);
    };
    
    importChartjs();
  }, []);
  
  if (!mounted) return null;
  return children;
};

// Configure axios
axios.defaults.baseURL = API_BASE_URL;
axios.defaults.headers.common['Accept'] = 'application/json';

// Types
interface Assignment {
  id: string;
  name: string;
  created_at: string;
  submission_count: number;
  average_score?: number;
  passing_count?: number;
  has_results: boolean;
}

interface GradingSummary {
  total_assignments: number;
  total_submissions: number;
  average_score: number;
  pass_rate: number;
  assignments_over_time: Array<{date: string, count: number}>;
  score_distribution: Array<{range: string, count: number}>;
  top_performing_assignments: Array<{name: string, score: number}>;
  common_mistakes: Array<{name: string, frequency: number}>;
}

// Styled components
const StatsCard = styled(Card)(({ theme }) => ({
  height: '100%',
  transition: 'transform 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: theme.shadows[8],
  },
}));

const ChartContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
}));

// Main component
export default function AnalyticsDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summaryData, setSummaryData] = useState<GradingSummary | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [timeRange, setTimeRange] = useState('all');
  
  // Generate mock data for the analytics
  // In a real app, this would come from an API
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        
        // Fetch data from the Knowledge Graph API
        let analyticsData;
        try {
          const response = await axios.get('/knowledge-graph/analytics');
          analyticsData = response.data;
          console.log('Fetched Knowledge Graph analytics:', analyticsData);
        } catch (apiError) {
          console.warn('Failed to fetch from Knowledge Graph API, using mock data:', apiError);
          // Fall back to mock data if API fails
          analyticsData = null;
        }
        
        if (analyticsData) {
          // Transform the data from the API to match our expected format
          const summaryData: GradingSummary = {
            total_assignments: analyticsData.summary.total_assignments,
            total_submissions: analyticsData.summary.total_submissions,
            average_score: analyticsData.summary.average_score,
            pass_rate: analyticsData.summary.pass_rate,
            assignments_over_time: analyticsData.recent_assignments.map((a: any, index: number) => {
              // Extract month-year from created_at
              const date = new Date(a.created_at);
              return {
                date: `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`,
                count: 1 // Each assignment counts as 1
              };
            }),
            score_distribution: analyticsData.score_distribution,
            top_performing_assignments: analyticsData.top_concepts.map((c: any) => ({
              name: c.name,
              score: c.average_score
            })),
            common_mistakes: [
              { name: 'Missing critical information', frequency: 42 },
              { name: 'Incomplete solution', frequency: 38 },
              { name: 'Code implementation errors', frequency: 31 },
              { name: 'Misunderstanding the problem', frequency: 29 },
              { name: 'Poor explanation', frequency: 25 },
            ]
          };
          
          setSummaryData(summaryData);
        } else {
          // For demo, generate mock data
          const mockSummary: GradingSummary = {
            total_assignments: 24,
            total_submissions: 357,
            average_score: 76.5,
            pass_rate: 0.83,
            assignments_over_time: [
              { date: '2023-01', count: 2 },
              { date: '2023-02', count: 3 },
              { date: '2023-03', count: 1 },
              { date: '2023-04', count: 4 },
              { date: '2023-05', count: 5 },
              { date: '2023-06', count: 3 },
              { date: '2023-07', count: 2 },
              { date: '2023-08', count: 1 },
              { date: '2023-09', count: 3 },
            ],
            score_distribution: [
              { range: '0-10%', count: 5 },
              { range: '11-20%', count: 7 },
              { range: '21-30%', count: 12 },
              { range: '31-40%', count: 15 },
              { range: '41-50%', count: 23 },
              { range: '51-60%', count: 35 },
              { range: '61-70%', count: 48 },
              { range: '71-80%', count: 89 },
              { range: '81-90%', count: 76 },
              { range: '91-100%', count: 47 },
            ],
            top_performing_assignments: [
              { name: 'Assignment 12: Advanced Algorithms', score: 92.3 },
              { name: 'Assignment 7: Data Structures', score: 89.7 },
              { name: 'Assignment 19: Database Design', score: 87.4 },
              { name: 'Assignment 3: Software Architecture', score: 86.1 },
              { name: 'Assignment 15: Machine Learning Basics', score: 85.8 },
            ],
            common_mistakes: [
              { name: 'Missing critical information', frequency: 42 },
              { name: 'Incomplete solution', frequency: 38 },
              { name: 'Code implementation errors', frequency: 31 },
              { name: 'Misunderstanding the problem', frequency: 29 },
              { name: 'Poor explanation', frequency: 25 },
            ],
          };
          
          setSummaryData(mockSummary);
        }
        
        // Try to get real assignments
        try {
          const assignmentsResponse = await axios.get('/assignments');
          if (assignmentsResponse.data && Array.isArray(assignmentsResponse.data.assignments)) {
            const assignmentsWithResults = assignmentsResponse.data.assignments.filter(
              (a: Assignment) => a.has_results
            );
            setAssignments(assignmentsWithResults);
          }
        } catch (err) {
          console.warn('Could not fetch real assignments, using mock data only');
        }
        
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError('Failed to load analytics data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  // Prepare chart data
  const getAssignmentsChartData = () => ({
    labels: summaryData?.assignments_over_time.map(item => item.date) || [],
    datasets: [
      {
        label: 'Assignments',
        data: summaryData?.assignments_over_time.map(item => item.count) || [],
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  });

  const getScoreDistributionData = () => ({
    labels: summaryData?.score_distribution.map(item => item.range) || [],
    datasets: [
      {
        label: 'Student Count',
        data: summaryData?.score_distribution.map(item => item.count) || [],
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(255, 159, 64, 0.6)',
          'rgba(255, 205, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(153, 102, 255, 0.6)',
          'rgba(201, 203, 207, 0.6)',
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(75, 192, 192, 0.6)',
        ],
        borderWidth: 1,
      },
    ],
  });

  const getPassRateData = () => ({
    labels: ['Passed', 'Failed'],
    datasets: [
      {
        label: 'Pass/Fail Rate',
        data: [
          summaryData ? summaryData.pass_rate * 100 : 0, 
          summaryData ? (1 - summaryData.pass_rate) * 100 : 0
        ],
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 99, 132, 0.6)',
        ],
        borderWidth: 1,
      },
    ],
  });

  const getChartOptions = (title: string) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: title,
        font: {
          size: 16,
        },
      },
    },
  });

  // Add a section to display recent submissions
  const RecentSubmissions = () => {
    const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);
    
    useEffect(() => {
      const fetchRecentSubmissions = async () => {
        try {
          // Try to fetch from Knowledge Graph API
          const response = await axios.get('/knowledge-graph/analytics');
          if (response.data && response.data.recent_submissions) {
            setRecentSubmissions(response.data.recent_submissions);
          }
        } catch (err) {
          console.warn('Could not fetch recent submissions');
        }
      };
      
      fetchRecentSubmissions();
    }, []);
    
    if (recentSubmissions.length === 0) {
      return null;
    }
    
    return (
      <Grid item xs={12}>
        <Card>
          <CardHeader title="Recent Submissions" />
          <Divider />
          <CardContent>
            <List>
              {recentSubmissions.map((submission, index) => (
                <ListItem key={index} sx={{ py: 1 }}>
                  <ListItemIcon>
                    <AssignmentIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={`${submission.student_name} - ${submission.assignment_name}`}
                    secondary={`Score: ${submission.score}/${submission.total} (${((submission.score / submission.total) * 100).toFixed(1)}%)`}
                  />
                  <Button 
                    variant="outlined" 
                    size="small"
                    component={Link}
                    href={`/results/${submission.assignment_id}`}
                  >
                    View Details
                  </Button>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          Analytics Dashboard
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Gain insights into student performance and assignment metrics
        </Typography>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
      ) : !summaryData ? (
        <Alert severity="info" sx={{ mb: 3 }}>No analytics data available</Alert>
      ) : (
        <>
          {/* Key Metrics */}
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <AssignmentIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6" fontWeight="medium">
                      Assignments
                    </Typography>
                  </Box>
                  <Typography variant="h3" fontWeight="bold">
                    {summaryData.total_assignments}
                  </Typography>
                </CardContent>
              </StatsCard>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <PeopleIcon color="secondary" sx={{ mr: 1 }} />
                    <Typography variant="h6" fontWeight="medium">
                      Submissions
                    </Typography>
                  </Box>
                  <Typography variant="h3" fontWeight="bold">
                    {summaryData.total_submissions}
                  </Typography>
                </CardContent>
              </StatsCard>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <SchoolIcon color="success" sx={{ mr: 1 }} />
                    <Typography variant="h6" fontWeight="medium">
                      Average Score
                    </Typography>
                  </Box>
                  <Typography variant="h3" fontWeight="bold">
                    {summaryData.average_score.toFixed(1)}%
                  </Typography>
                </CardContent>
              </StatsCard>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <CheckCircleIcon color="info" sx={{ mr: 1 }} />
                    <Typography variant="h6" fontWeight="medium">
                      Pass Rate
                    </Typography>
                  </Box>
                  <Typography variant="h3" fontWeight="bold">
                    {(summaryData.pass_rate * 100).toFixed(1)}%
                  </Typography>
                </CardContent>
              </StatsCard>
            </Grid>
          </Grid>
          
          {/* Charts */}
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} md={8}>
              <ChartContainer>
                <Typography variant="h6" gutterBottom>
                  Assignments Over Time
                </Typography>
                <Box sx={{ flexGrow: 1, height: 300 }}>
                  <ChartWrapper>
                    <Chart 
                      data={getAssignmentsChartData()} 
                      options={getChartOptions('Number of Assignments by Month')}
                    />
                  </ChartWrapper>
                </Box>
              </ChartContainer>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <ChartContainer>
                <Typography variant="h6" gutterBottom>
                  Pass/Fail Rate
                </Typography>
                <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                  <ChartWrapper>
                    <PieChart 
                      data={getPassRateData()} 
                      options={getChartOptions('Student Pass/Fail Distribution')}
                    />
                  </ChartWrapper>
                </Box>
              </ChartContainer>
            </Grid>
            
            <Grid item xs={12}>
              <ChartContainer>
                <Typography variant="h6" gutterBottom>
                  Score Distribution
                </Typography>
                <Box sx={{ flexGrow: 1, height: 300 }}>
                  <ChartWrapper>
                    <Chart 
                      data={getScoreDistributionData()} 
                      options={getChartOptions('Distribution of Student Scores')}
                    />
                  </ChartWrapper>
                </Box>
              </ChartContainer>
            </Grid>
          </Grid>
          
          {/* Insights */}
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Top Performing Assignments" />
                <Divider />
                <CardContent>
                  <List>
                    {summaryData.top_performing_assignments.map((item, index) => (
                      <ListItem key={index} sx={{ py: 1 }}>
                        <ListItemIcon>
                          <StarIcon color={index < 3 ? "warning" : "action"} />
                        </ListItemIcon>
                        <ListItemText 
                          primary={item.name}
                          secondary={`Average Score: ${item.score.toFixed(1)}%`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Common Mistakes" />
                <Divider />
                <CardContent>
                  <List>
                    {summaryData.common_mistakes.map((item, index) => (
                      <ListItem key={index} sx={{ py: 1 }}>
                        <ListItemIcon>
                          <CancelIcon color="error" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={item.name}
                          secondary={`Frequency: ${item.frequency} occurrences`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Add Recent Submissions component */}
            <RecentSubmissions />
          </Grid>
        </>
      )}

      <Box mt={4} display="flex" justifyContent="space-between">
        <Button 
          variant="outlined"
          component={Link}
          href="/"
        >
          Back to Home
        </Button>
        <Box>
          <Button 
            variant="contained"
            component={Link}
            href="/results"
          >
            View Graded Assignments
          </Button>
        </Box>
      </Box>
    </Container>
  );
} 