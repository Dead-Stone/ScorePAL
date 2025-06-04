import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  Tabs,
  Tab,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';
import dynamic from 'next/dynamic';

// Configure axios
axios.defaults.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
axios.defaults.headers.common['Accept'] = 'application/json';

// Use dynamic import for the React Force Graph component to avoid SSR issues
const ForceGraph = dynamic(() => import('react-force-graph-2d'), { ssr: false });

// Types for graph data
interface GraphNode {
  id: string;
  name: string;
  val?: number;
  color?: string;
  type: string;
}

interface GraphLink {
  source: string;
  target: string;
  value?: number;
  type: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface KnowledgeGraphData {
  nodes: Array<{
    id: number;
    labels: string[];
    properties: {
      [key: string]: any;
    };
  }>;
  relationships: Array<{
    id: number;
    type: string;
    start_node: number;
    end_node: number;
    properties: {
      [key: string]: any;
    };
  }>;
}

// Main component
export default function KnowledgeGraphVisualization() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState('');
  const [assignments, setAssignments] = useState<any[]>([]);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedConcept, setSelectedConcept] = useState<any>(null);
  const [conceptData, setConceptData] = useState<any>(null);

  const graphRef = useRef<any>();

  // Fetch assignments for the dropdown
  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const response = await axios.get('/assignments');
        if (response.data && Array.isArray(response.data.assignments)) {
          setAssignments(response.data.assignments);
          if (response.data.assignments.length > 0) {
            setSelectedAssignment(response.data.assignments[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching assignments:', err);
        setError('Failed to load assignments. Please try again later.');
      }
    };

    fetchAssignments();
  }, []);

  // Fetch graph data when an assignment is selected
  useEffect(() => {
    if (!selectedAssignment) return;

    const fetchGraphData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/knowledge-graph/assignments/${selectedAssignment}`);
        
        if (response.data) {
          // Transform the data for the force graph
          const nodes: GraphNode[] = [];
          const links: GraphLink[] = [];
          
          // Add nodes
          response.data.nodes.forEach((node: any) => {
            // Determine node color based on type
            let color = '#999999'; // Default gray
            let size = 5; // Default size
            
            if (node.labels.includes('Assignment')) {
              color = '#e91e63'; // Pink
              size = 15;
            } else if (node.labels.includes('Student')) {
              color = '#2196f3'; // Blue
              size = 10;
            } else if (node.labels.includes('Submission')) {
              color = '#ff9800'; // Orange
              size = 8;
            } else if (node.labels.includes('Concept')) {
              color = '#4caf50'; // Green
              size = 12;
            } else if (node.labels.includes('RubricCriterion')) {
              color = '#9c27b0'; // Purple
              size = 8;
            }
            
            nodes.push({
              id: node.id.toString(),
              name: node.properties.name || node.labels[0] + '_' + node.id,
              val: size,
              color,
              type: node.labels[0]
            });
          });
          
          // Add links
          response.data.relationships.forEach((rel: any) => {
            links.push({
              source: rel.start_node.toString(),
              target: rel.end_node.toString(),
              type: rel.type
            });
          });
          
          setGraphData({ nodes, links });
        }
      } catch (err) {
        console.error('Error fetching graph data:', err);
        setError('Failed to load knowledge graph data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchGraphData();
  }, [selectedAssignment]);

  // Handle node click to show details
  const handleNodeClick = async (node: any) => {
    // If it's a concept node, fetch concept relationships
    if (node.type === 'Concept') {
      try {
        const response = await axios.get(`/knowledge-graph/concepts/${node.name}`);
        if (response.data) {
          setSelectedConcept(node);
          setConceptData(response.data);
          setSelectedTab(1); // Switch to Details tab
        }
      } catch (err) {
        console.error('Error fetching concept data:', err);
      }
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          Knowledge Graph Visualization
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Explore the relationships between assignments, submissions, students, and concepts
        </Typography>
      </Box>

      <Tabs value={selectedTab} onChange={handleTabChange} aria-label="knowledge graph tabs" sx={{ mb: 3 }}>
        <Tab label="Graph Visualization" />
        <Tab label="Concept Details" disabled={!selectedConcept} />
      </Tabs>

      {selectedTab === 0 && (
        <>
          <Paper sx={{ p: 3, mb: 3 }}>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel id="assignment-select-label">Select Assignment</InputLabel>
              <Select
                labelId="assignment-select-label"
                id="assignment-select"
                value={selectedAssignment}
                label="Select Assignment"
                onChange={(e) => setSelectedAssignment(e.target.value)}
                MenuProps={{
                  PaperProps: {
                    style: {
                      maxHeight: 300,
                      overflow: 'auto',
                    },
                  },
                }}
              >
                {assignments.map((assignment) => (
                  <MenuItem key={assignment.id} value={assignment.id}>
                    {assignment.assignment_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {loading ? (
              <Box display="flex" justifyContent="center" my={4}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
            ) : graphData.nodes.length === 0 ? (
              <Alert severity="info" sx={{ mb: 3 }}>No knowledge graph data available for this assignment</Alert>
            ) : (
              <Box sx={{ height: '600px', border: '1px solid #eee' }}>
                <ForceGraph
                  ref={graphRef}
                  graphData={graphData}
                  nodeLabel={(node: any) => `${node.type}: ${node.name}`}
                  linkLabel={(link: any) => link.type}
                  nodeColor={(node: any) => node.color}
                  nodeVal={(node: any) => node.val}
                  onNodeClick={handleNodeClick}
                  linkDirectionalArrowLength={3.5}
                  linkDirectionalArrowRelPos={1}
                  linkCurvature={0.25}
                  linkWidth={1}
                  cooldownTicks={100}
                  linkDirectionalParticles={2}
                  linkDirectionalParticleSpeed={0.01}
                />
              </Box>
            )}

            <Box mt={2}>
              <Typography variant="subtitle2" gutterBottom>Legend:</Typography>
              <Grid container spacing={2}>
                <Grid item>
                  <Box display="flex" alignItems="center">
                    <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: '#e91e63', mr: 1 }} />
                    <Typography variant="body2">Assignment</Typography>
                  </Box>
                </Grid>
                <Grid item>
                  <Box display="flex" alignItems="center">
                    <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: '#2196f3', mr: 1 }} />
                    <Typography variant="body2">Student</Typography>
                  </Box>
                </Grid>
                <Grid item>
                  <Box display="flex" alignItems="center">
                    <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: '#ff9800', mr: 1 }} />
                    <Typography variant="body2">Submission</Typography>
                  </Box>
                </Grid>
                <Grid item>
                  <Box display="flex" alignItems="center">
                    <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: '#4caf50', mr: 1 }} />
                    <Typography variant="body2">Concept</Typography>
                  </Box>
                </Grid>
                <Grid item>
                  <Box display="flex" alignItems="center">
                    <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: '#9c27b0', mr: 1 }} />
                    <Typography variant="body2">Rubric Criterion</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Paper>

          <Typography variant="body2" color="text.secondary">
            Click on a concept node (green) to view detailed information about the concept and its relationships.
          </Typography>
        </>
      )}

      {selectedTab === 1 && selectedConcept && conceptData && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Concept: {selectedConcept.name}
          </Typography>
          
          <Divider sx={{ my: 2 }} />
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Related Assignments
                  </Typography>
                  {conceptData.assignments && conceptData.assignments.length > 0 ? (
                    <List>
                      {conceptData.assignments.map((assignment: any, index: number) => (
                        <ListItem key={index}>
                          <ListItemText 
                            primary={assignment.name}
                          />
                          <Button 
                            variant="outlined" 
                            size="small"
                            disabled
                          >
                            View (Coming Soon)
                          </Button>
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No related assignments found.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Related Concepts
                  </Typography>
                  {conceptData.related_concepts && conceptData.related_concepts.length > 0 ? (
                    <List>
                      {conceptData.related_concepts.map((concept: any, index: number) => (
                        <ListItem key={index}>
                          <ListItemText 
                            primary={concept.name}
                            secondary={`Relationship Strength: ${concept.strength}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No related concepts found.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Student Submissions
                  </Typography>
                  {conceptData.submissions && conceptData.submissions.length > 0 ? (
                    <List>
                      {conceptData.submissions.map((submission: any, index: number) => (
                        <ListItem key={index}>
                          <ListItemText 
                            primary={submission.student_name}
                            secondary={`Score: ${submission.score}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No student submissions found.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          <Box mt={3} display="flex" justifyContent="space-between">
            <Button 
              variant="outlined"
              onClick={() => {
                setSelectedTab(0);
                setSelectedConcept(null);
                setConceptData(null);
              }}
            >
              Back to Graph
            </Button>
          </Box>
        </Paper>
      )}

      <Box mt={4} display="flex" justifyContent="center">
        <Button 
          variant="outlined"
          component={Link}
          href="/"
        >
          Back to Home
        </Button>
      </Box>
      
      <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
        <Typography variant="body2" color="info.dark" textAlign="center">
          🔬 Advanced analytics and detailed results will be available in future releases!
        </Typography>
      </Box>
    </Container>
  );
} 