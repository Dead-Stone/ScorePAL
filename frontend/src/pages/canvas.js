/**
 * ScorePAL - AI-Powered Academic Grading Assistant
 * Canvas LMS Integration Interface
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 * @repository https://github.com/Dead-Stone/ScorePAL
 */

import { useState, useEffect } from 'react';
import { 
  Box, Button, Card, CardContent, Container, Typography, TextField, 
  FormControl, InputLabel, Select, MenuItem, CircularProgress,
  Alert, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Link, InputAdornment, IconButton,
  Chip, Divider, Checkbox, TablePagination, Grid, Accordion,
  AccordionSummary, AccordionDetails, Stepper, Step, StepLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, Slider,
  List, ListItem, ListItemText, ListItemIcon, FormHelperText,
  Tab, Tabs
} from '@mui/material';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { CanvasPageDocumentation } from '../components/PageDocumentation';
import { useAuth } from '../contexts/AuthContext';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import SyncIcon from '@mui/icons-material/Sync';
import GradeIcon from '@mui/icons-material/Grade';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import { useRouter } from 'next/router';
import axios from 'axios';
import { normalizeCanvasUrl } from '../utils/canvas';

const CanvasPage = () => {
  const router = useRouter();
  const [apiKey, setApiKey] = useState('');
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Course and assignment selection
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [selectedCourseName, setSelectedCourseName] = useState('');
  const [selectedAssignmentName, setSelectedAssignmentName] = useState('');
  
  // Workflow states
  const [currentStep, setCurrentStep] = useState(0); // 0: connect, 1: select-course, 2: sync, 3: review-rubric, 4: select, 5: grade, 6: results
  const [activeView, setActiveView] = useState('connect');
  const [showApiKey, setShowApiKey] = useState(false);
  
  // Sync-related states
  const [syncJobId, setSyncJobId] = useState('');
  const [syncedSubmissions, setSyncedSubmissions] = useState([]);
  const [syncSummary, setSyncSummary] = useState(null);
  
  // Selection states
  const [selectedSubmissions, setSelectedSubmissions] = useState(new Set());
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Grading states
  const [strictness, setStrictness] = useState(0.5);
  const [gradingInProgress, setGradingInProgress] = useState(false);
  const [gradingJobId, setGradingJobId] = useState('');
  
  // Results states
  const [gradingResults, setGradingResults] = useState([]);
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);

  // Add rubric preview states
  const [rubricPreviewOpen, setRubricPreviewOpen] = useState(false);
  const [previewRubricData, setPreviewRubricData] = useState(null);
  const [loadingRubric, setLoadingRubric] = useState(false);

  // Add rubric review states
  const [reviewRubricData, setReviewRubricData] = useState(null);
  const [reviewAnswerKey, setReviewAnswerKey] = useState(null);
  const [rubricApproved, setRubricApproved] = useState(false);
  const [answerKeyApproved, setAnswerKeyApproved] = useState(false);

  // Add rubric editing states
  const [editRubricDialogOpen, setEditRubricDialogOpen] = useState(false);
  const [editingRubricData, setEditingRubricData] = useState(null);
  const [savingRubric, setSavingRubric] = useState(false);
  const [editRubricTab, setEditRubricTab] = useState(0);

  // No longer need to fetch rubrics - they're auto-generated

  // Handle saving results to MongoDB
  const handleSaveResults = async () => {
    if (!gradingJobId) {
      alert('No grading job found. Please grade submissions first.');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`/api/canvas/jobs/${gradingJobId}/save-results`);
      
      if (response.data.status === 'success') {
        alert(`Successfully saved ${response.data.saved_count} results to MongoDB. Analytics will be updated.`);
      } else {
        alert(`Error saving results: ${response.data.message}`);
      }
    } catch (err) {
      console.error('Error saving results:', err);
      alert(`Error saving results: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle posting grades to Canvas
  const handlePostGrades = async () => {
    if (!gradingJobId) {
      alert('No grading job found. Please grade submissions first.');
      return;
    }
    
    if (!apiKey) {
      alert('Canvas API key is required to post grades.');
      return;
    }
    
    const confirmed = window.confirm(
      'This will post grades to Canvas. Do you want to also save results to MongoDB for analytics?'
    );
    
    setLoading(true);
    try {
      const response = await axios.post(
        `/api/canvas/post-grades/${gradingJobId}`,
        {
          canvas_url: 'https://sjsu.instructure.com',
          api_key: processApiKey(apiKey)
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      if (response.data.status === 'success') {
        alert('Grades are being posted to Canvas. This may take a few moments.');
        if (confirmed) {
          // Also save to MongoDB
          await handleSaveResults();
        }
      } else {
        alert(`Error posting grades: ${response.data.message}`);
      }
    } catch (err) {
      console.error('Error posting grades:', err);
      alert(`Error posting grades: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to process the API key/token
  const processApiKey = (key) => {
    const cleanKey = key.replace(/^Bearer\s+/i, '').trim();
    return cleanKey;
  };

  // Connect to Canvas and fetch TA courses
  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const processedApiKey = processApiKey(apiKey);
      
      const response = await axios.post('/api/canvas/connect', {
        api_key: processedApiKey
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.status === 'success') {
        setConnected(true);
        
        // Fetch TA courses
        await fetchTACourses(processedApiKey);
        
        setCurrentStep(1);
        setActiveView('select-course');
      } else {
        setError(response.data.message || 'Failed to connect to Canvas');
      }
    } catch (err) {
      console.error('Canvas connection error:', err);
      setError(err.response?.data?.message || err.message || 'An error occurred connecting to Canvas');
    } finally {
      setLoading(false);
    }
  };

  // Fetch TA courses from Canvas through backend
  const fetchTACourses = async (processedApiKey) => {
    try {
      const response = await axios.post('/api/canvas/get-ta-courses', {
        api_key: processedApiKey
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.status === 'success' && response.data.courses) {
        // Filter only active courses
        const activeCourses = response.data.courses.filter(course => 
          course.workflow_state === 'available' && 
          course.enrollments?.some(enrollment => enrollment.type === 'ta' && enrollment.enrollment_state === 'active')
        );
        setCourses(activeCourses);
        
        if (activeCourses.length > 0) {
          setSelectedCourseId(activeCourses[0].id.toString());
          setSelectedCourseName(activeCourses[0].name);
        }
      } else {
        setError(response.data.message || 'Failed to fetch TA courses');
      }
    } catch (err) {
      console.error('Error fetching TA courses:', err);
      setError('Failed to fetch your TA courses. Please check your API key permissions.');
    }
  };

  // Fetch assignments for selected course
  const fetchAssignments = async () => {
    if (!selectedCourseId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const processedApiKey = processApiKey(apiKey);
      
      const response = await axios.post('/api/canvas/get-assignments', {
        api_key: processedApiKey,
        course_id: parseInt(selectedCourseId)
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.status === 'success' && response.data.assignments) {
        // Filter only published assignments with more robust checking
        const publishedAssignments = response.data.assignments.filter(assignment => {
          // Check multiple conditions for published state
          const isPublished = assignment.published === true;
          const workflowPublished = assignment.workflow_state === 'published';
          const notUnpublished = assignment.workflow_state !== 'unpublished';
          const notDeleted = assignment.workflow_state !== 'deleted';
          
          // Must be published AND have a valid workflow state
          return (isPublished && workflowPublished) || (workflowPublished && notUnpublished && notDeleted);
        });
        setAssignments(publishedAssignments);
        
        if (publishedAssignments.length > 0) {
          setSelectedAssignmentId(publishedAssignments[0].id.toString());
          setSelectedAssignmentName(publishedAssignments[0].name);
        }
      } else {
        setError(response.data.message || 'Failed to fetch assignments');
      }
    } catch (err) {
      console.error('Error fetching assignments:', err);
      setError('Failed to fetch assignments for this course.');
    } finally {
      setLoading(false);
    }
  };

  // Handle course selection
  const handleCourseChange = (courseId) => {
    setSelectedCourseId(courseId);
    const course = courses.find(c => c.id.toString() === courseId);
    if (course) {
      setSelectedCourseName(course.name);
    }
    setAssignments([]);
    setSelectedAssignmentId('');
    setSelectedAssignmentName('');
  };

  // Handle assignment selection
  const handleAssignmentChange = (assignmentId) => {
    setSelectedAssignmentId(assignmentId);
    const assignment = assignments.find(a => a.id.toString() === assignmentId);
    if (assignment) {
      setSelectedAssignmentName(assignment.name);
    }
  };

  // Sync submissions from Canvas
  const handleSyncSubmissions = async (forceSync = false) => {
    if (!selectedCourseId || !selectedAssignmentId) {
      setError('Please select a course and assignment first');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const processedApiKey = processApiKey(apiKey);
      
      const response = await axios.post('/api/canvas/sync-submissions', {
        api_key: processedApiKey,
        course_id: parseInt(selectedCourseId),
        assignment_id: parseInt(selectedAssignmentId),
        force_sync: forceSync
      }, {
        timeout: 300000, // 5 minutes timeout for frontend
      });
      
      if (response.data.status === 'success') {
        setSyncJobId(response.data.sync_job_id);
        setSyncSummary(response.data.summary);
        setSyncedSubmissions(response.data.summary.submissions || []);
        
        // Load rubric and answer key for review
        await loadRubricAndAnswerKey(response.data.sync_job_id);
        
        // Move to rubric review screen
        setCurrentStep(3);
        setActiveView('review-rubric');
        
        // Show different message based on whether it was existing data or fresh sync
        if (response.data.is_existing_data) {
          console.log('Using existing sync data');
        } else if (response.data.was_forced) {
          console.log('Force synced - overwrote existing data');
        } else {
          console.log('Fresh sync completed');
        }
      } else {
        setError(response.data.message || 'Failed to sync submissions');
      }
    } catch (err) {
      console.error('Sync error:', err);
      
      // Handle timeout errors specifically
      if (err.code === 'ECONNABORTED' || err.response?.status === 408) {
        setError('The sync operation is taking longer than expected. This is normal for large assignments. Please wait a few minutes and try again - your data may already be synced in the background.');
      } else {
        setError(err.response?.data?.message || err.message || 'An error occurred syncing submissions');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Grade selected submissions
  const handleGradeSubmissions = async () => {
    if (selectedSubmissions.size === 0) {
      setError('Please select at least one submission to grade');
      return;
    }

    setGradingInProgress(true);
    setLoading(true);
    setError(null);
    
    try {
      const selectedUserIds = Array.from(selectedSubmissions);
      
      const response = await axios.post('/api/canvas/grade-selected-submissions', {
        sync_job_id: syncJobId,
        selected_user_ids: selectedUserIds,
        strictness: strictness
      }, {
        timeout: 600000, // 10 minutes timeout for grading
      });
      
      if (response.data.status === 'success') {
        setGradingJobId(response.data.grading_job_id);
        setGradingResults(response.data.results || []);
        
        // Results are automatically saved to MongoDB during grading
        if (response.data.saved_to_mongodb) {
          console.log(`Saved ${response.data.saved_to_mongodb} results to MongoDB`);
        }
        setCurrentStep(6);
        setActiveView('results');
      } else {
        setError(response.data.message || 'Failed to grade submissions');
      }
    } catch (err) {
      console.error('Grading error:', err);
      
      // Handle timeout errors specifically
      if (err.code === 'ECONNABORTED' || err.response?.status === 408) {
        setError('The grading operation is taking longer than expected. This is normal for large assignments. Please check back in a few minutes - your grading may complete in the background.');
      } else {
        setError(err.response?.data?.message || err.message || 'An error occurred grading submissions');
      }
    } finally {
      setLoading(false);
      setGradingInProgress(false);
    }
  };

  // Handle submission selection
  const handleSelectSubmission = (userId) => {
    const newSelected = new Set(selectedSubmissions);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedSubmissions(newSelected);
  };

  const handleSelectAll = () => {
    const validSubmissions = syncedSubmissions.filter(s => s.sync_status === 'synced');
    if (selectedSubmissions.size === validSubmissions.length) {
      setSelectedSubmissions(new Set());
      } else {
      setSelectedSubmissions(new Set(validSubmissions.map(s => s.user_id)));
    }
  };

  // Add function to fetch and display rubric preview
  const handlePreviewRubric = async () => {
    if (!syncSummary) return;
    
    try {
      setLoadingRubric(true);
      
      // Try to load the AI-generated rubric from the assignment analysis
      const response = await fetch('/api/canvas/get-assignment-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sync_job_id: syncJobId,
          course_id: selectedCourseId,
          assignment_id: selectedAssignmentId
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const rubricData = data.content_analysis?.generated_rubric;
        
        if (rubricData) {
          setPreviewRubricData(rubricData);
          setRubricPreviewOpen(true);
        } else {
          // Show default rubric if AI-generated one is not available
          const defaultRubric = {
            name: "Default Grading Rubric",
            description: "Comprehensive default rubric covering technical accuracy, completeness, and analysis quality.",
            total_points: syncSummary.assignment_details?.points_possible || 100,
            sections: [
              {
                name: "Content Understanding",
                max_points: Math.round((syncSummary.assignment_details?.points_possible || 100) * 0.4),
                criteria: [
                  {
                    name: "Understanding",
                    points: Math.round((syncSummary.assignment_details?.points_possible || 100) * 0.4),
                    description: "Demonstrates understanding of key concepts and materials",
                    grading_scale: [
                      { level: "Excellent", points: Math.round((syncSummary.assignment_details?.points_possible || 100) * 0.4), description: "Outstanding understanding with deep insights" },
                      { level: "Good", points: Math.round((syncSummary.assignment_details?.points_possible || 100) * 0.3), description: "Strong understanding with minor gaps" },
                      { level: "Satisfactory", points: Math.round((syncSummary.assignment_details?.points_possible || 100) * 0.2), description: "Basic understanding with some confusion" },
                      { level: "Poor", points: Math.round((syncSummary.assignment_details?.points_possible || 100) * 0.1), description: "Limited understanding with significant gaps" }
                    ]
                  }
                ]
              },
              {
                name: "Analysis & Application",
                max_points: Math.round((syncSummary.assignment_details?.points_possible || 100) * 0.35),
                criteria: [
                  {
                    name: "Critical Thinking",
                    points: Math.round((syncSummary.assignment_details?.points_possible || 100) * 0.35),
                    description: "Applies concepts effectively and demonstrates analytical skills",
                    grading_scale: [
                      { level: "Excellent", points: Math.round((syncSummary.assignment_details?.points_possible || 100) * 0.35), description: "Exceptional analysis with creative applications" },
                      { level: "Good", points: Math.round((syncSummary.assignment_details?.points_possible || 100) * 0.26), description: "Good analysis with solid applications" },
                      { level: "Satisfactory", points: Math.round((syncSummary.assignment_details?.points_possible || 100) * 0.18), description: "Basic analysis with simple applications" },
                      { level: "Poor", points: Math.round((syncSummary.assignment_details?.points_possible || 100) * 0.09), description: "Weak analysis with minimal application" }
                    ]
                  }
                ]
              },
              {
                name: "Presentation & Quality",
                max_points: Math.round((syncSummary.assignment_details?.points_possible || 100) * 0.25),
                criteria: [
                  {
                    name: "Organization & Clarity",
                    points: Math.round((syncSummary.assignment_details?.points_possible || 100) * 0.25),
                    description: "Clear structure, organization, and presentation quality",
                    grading_scale: [
                      { level: "Excellent", points: Math.round((syncSummary.assignment_details?.points_possible || 100) * 0.25), description: "Exceptionally well-organized and clear" },
                      { level: "Good", points: Math.round((syncSummary.assignment_details?.points_possible || 100) * 0.19), description: "Well-organized with minor issues" },
                      { level: "Satisfactory", points: Math.round((syncSummary.assignment_details?.points_possible || 100) * 0.13), description: "Adequately organized with some confusion" },
                      { level: "Poor", points: Math.round((syncSummary.assignment_details?.points_possible || 100) * 0.06), description: "Poorly organized and unclear" }
                    ]
                  }
                ]
              }
            ]
          };
          setPreviewRubricData(defaultRubric);
          setRubricPreviewOpen(true);
        }
      } else {
        alert('Unable to load rubric preview. Please try again.');
      }
    } catch (err) {
      console.error('Error loading rubric preview:', err);
      alert('Error loading rubric preview. Please try again.');
    } finally {
      setLoadingRubric(false);
    }
  };

  // Load rubric and answer key for review
  const loadRubricAndAnswerKey = async (syncJobId) => {
    try {
      const response = await fetch('/api/canvas/get-assignment-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sync_job_id: syncJobId,
          course_id: selectedCourseId,
          assignment_id: selectedAssignmentId
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Set rubric data for review
        const rubricData = data.content_analysis?.generated_rubric;
        if (rubricData) {
          setReviewRubricData(rubricData);
        } else {
          // Create default rubric if none exists
          const defaultRubric = {
            name: `Rubric for ${data.assignment_details?.name || 'Assignment'}`,
            description: "AI-generated rubric based on assignment content and requirements.",
            total_points: data.assignment_details?.points_possible || 100,
            sections: [
              {
                name: "Content Understanding",
                max_points: Math.round((data.assignment_details?.points_possible || 100) * 0.4),
                criteria: [
                  {
                    name: "Concept Mastery",
                    points: Math.round((data.assignment_details?.points_possible || 100) * 0.4),
                    description: "Demonstrates understanding of key concepts and materials",
                    grading_scale: [
                      { level: "Excellent", points: Math.round((data.assignment_details?.points_possible || 100) * 0.4), description: "Outstanding understanding with deep insights" },
                      { level: "Good", points: Math.round((data.assignment_details?.points_possible || 100) * 0.3), description: "Strong understanding with minor gaps" },
                      { level: "Satisfactory", points: Math.round((data.assignment_details?.points_possible || 100) * 0.2), description: "Basic understanding with some confusion" },
                      { level: "Poor", points: Math.round((data.assignment_details?.points_possible || 100) * 0.1), description: "Limited understanding with significant gaps" }
                    ]
                  }
                ]
              },
              {
                name: "Application & Analysis",
                max_points: Math.round((data.assignment_details?.points_possible || 100) * 0.35),
                criteria: [
                  {
                    name: "Problem Solving",
                    points: Math.round((data.assignment_details?.points_possible || 100) * 0.35),
                    description: "Applies concepts effectively and demonstrates analytical skills",
                    grading_scale: [
                      { level: "Excellent", points: Math.round((data.assignment_details?.points_possible || 100) * 0.35), description: "Exceptional analysis with creative applications" },
                      { level: "Good", points: Math.round((data.assignment_details?.points_possible || 100) * 0.26), description: "Good analysis with solid applications" },
                      { level: "Satisfactory", points: Math.round((data.assignment_details?.points_possible || 100) * 0.18), description: "Basic analysis with simple applications" },
                      { level: "Poor", points: Math.round((data.assignment_details?.points_possible || 100) * 0.09), description: "Weak analysis with minimal application" }
                    ]
                  }
                ]
              },
              {
                name: "Communication & Quality",
                max_points: Math.round((data.assignment_details?.points_possible || 100) * 0.25),
                criteria: [
                  {
                    name: "Clarity & Organization",
                    points: Math.round((data.assignment_details?.points_possible || 100) * 0.25),
                    description: "Clear structure, organization, and presentation quality",
                    grading_scale: [
                      { level: "Excellent", points: Math.round((data.assignment_details?.points_possible || 100) * 0.25), description: "Exceptionally well-organized and clear" },
                      { level: "Good", points: Math.round((data.assignment_details?.points_possible || 100) * 0.19), description: "Well-organized with minor issues" },
                      { level: "Satisfactory", points: Math.round((data.assignment_details?.points_possible || 100) * 0.13), description: "Adequately organized with some confusion" },
                      { level: "Poor", points: Math.round((data.assignment_details?.points_possible || 100) * 0.06), description: "Poorly organized and unclear" }
                    ]
                  }
                ]
              }
            ]
          };
          setReviewRubricData(defaultRubric);
        }
        
        // Set answer key data for review
        const answerKeyData = data.answer_key_data?.answer_key;
        if (answerKeyData) {
          setReviewAnswerKey(answerKeyData);
        }
        
        console.log('Loaded rubric and answer key for review');
      } else {
        console.error('Failed to load assignment analysis');
      }
    } catch (err) {
      console.error('Error loading rubric and answer key:', err);
    }
  };

  // Open edit rubric dialog
  const openEditRubricDialog = (rubricData) => {
    // Add null check to prevent runtime error
    if (!rubricData) {
      console.error('openEditRubricDialog called with null rubricData');
      return;
    }
    
    setEditingRubricData({
      name: rubricData.name || '',
      description: rubricData.description || '',
      sections: rubricData.sections || [],
      total_points: rubricData.total_points || 0,
      strictness: rubricData.strictness || 0.5
    });
    setEditRubricDialogOpen(true);
    setEditRubricTab(0);
  };

  // Close edit rubric dialog
  const closeEditRubricDialog = () => {
    setEditRubricDialogOpen(false);
    setEditingRubricData(null);
    setEditRubricTab(0);
  };

  // Add criterion to a section
  const addCriterionToSection = (sectionIndex) => {
    const newCriterion = {
      name: '',
      description: '',
      points: 10,
      grading_scale: [
        { level: 'Excellent', points: 10, description: 'Exceeds expectations' },
        { level: 'Good', points: 8, description: 'Meets expectations' },
        { level: 'Satisfactory', points: 6, description: 'Below expectations' },
        { level: 'Poor', points: 3, description: 'Does not meet expectations' }
      ]
    };

    setEditingRubricData(prev => ({
      ...prev,
      sections: prev.sections.map((section, index) =>
        index === sectionIndex
          ? { ...section, criteria: [...section.criteria, newCriterion] }
          : section
      )
    }));
  };

  // Remove criterion from a section
  const removeCriterionFromSection = (sectionIndex, criterionIndex) => {
    setEditingRubricData(prev => ({
      ...prev,
      sections: prev.sections.map((section, index) =>
        index === sectionIndex
          ? { ...section, criteria: section.criteria.filter((_, i) => i !== criterionIndex) }
          : section
      )
    }));
  };

  // Update criterion in a section
  const updateCriterion = (sectionIndex, criterionIndex, field, value) => {
    setEditingRubricData(prev => ({
      ...prev,
      sections: prev.sections.map((section, sIndex) =>
        sIndex === sectionIndex
          ? {
              ...section,
              criteria: section.criteria.map((criterion, cIndex) =>
                cIndex === criterionIndex
                  ? { ...criterion, [field]: value }
                  : criterion
              )
            }
          : section
      )
    }));
  };

  // Add grading level to a criterion
  const addGradingLevel = (sectionIndex, criterionIndex) => {
    const newLevel = {
      level: 'New Level',
      points: 5,
      description: 'Description for this level'
    };

    setEditingRubricData(prev => ({
      ...prev,
      sections: prev.sections.map((section, sIndex) =>
        sIndex === sectionIndex
          ? {
              ...section,
              criteria: section.criteria.map((criterion, cIndex) =>
                cIndex === criterionIndex
                  ? {
                      ...criterion,
                      grading_scale: [...(criterion.grading_scale || []), newLevel]
                    }
                  : criterion
              )
            }
          : section
      )
    }));
  };

  // Remove grading level from a criterion
  const removeGradingLevel = (sectionIndex, criterionIndex, levelIndex) => {
    setEditingRubricData(prev => ({
      ...prev,
      sections: prev.sections.map((section, sIndex) =>
        sIndex === sectionIndex
          ? {
              ...section,
              criteria: section.criteria.map((criterion, cIndex) =>
                cIndex === criterionIndex
                  ? {
                      ...criterion,
                      grading_scale: criterion.grading_scale.filter((_, lIndex) => lIndex !== levelIndex)
                    }
                  : criterion
              )
            }
          : section
      )
    }));
  };

  // Update grading level
  const updateGradingLevel = (sectionIndex, criterionIndex, levelIndex, field, value) => {
    setEditingRubricData(prev => ({
      ...prev,
      sections: prev.sections.map((section, sIndex) =>
        sIndex === sectionIndex
          ? {
              ...section,
              criteria: section.criteria.map((criterion, cIndex) =>
                cIndex === criterionIndex
                  ? {
                      ...criterion,
                      grading_scale: criterion.grading_scale.map((level, lIndex) =>
                        lIndex === levelIndex
                          ? { ...level, [field]: value }
                          : level
                      )
                    }
                  : criterion
              )
            }
          : section
      )
    }));
  };

  // Calculate total points for editing rubric
  const calculateTotalPoints = () => {
    if (!editingRubricData || !editingRubricData.sections) return 0;
    return editingRubricData.sections.reduce((total, section) => {
      return total + (section.criteria || []).reduce((sectionTotal, criterion) => {
        return sectionTotal + (criterion.points || 0);
      }, 0);
    }, 0);
  };

  // Save edited rubric (this will be a temporary save for Canvas use only)
  const saveEditedRubric = () => {
    const updatedRubric = {
      ...editingRubricData,
      total_points: calculateTotalPoints()
    };
    
    // Update the preview rubric data with the edited version
    setPreviewRubricData(updatedRubric);
    setReviewRubricData(updatedRubric);
    
    // Close the edit dialog
    closeEditRubricDialog();
    
    // Show success message
    alert('Rubric updated successfully! This is a temporary edit for this Canvas session only.');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Render course and assignment selection screen
  const renderCourseSelectionScreen = () => (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Select Course and Assignment
        </Typography>
        
        <Typography variant="body1" paragraph>
          Choose the course and assignment you want to grade.
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="course-select-label">Select Course</InputLabel>
              <Select
                labelId="course-select-label"
                value={selectedCourseId}
                label="Select Course"
                onChange={(e) => handleCourseChange(e.target.value)}
                disabled={loading}
              >
                {courses.map((course) => (
                  <MenuItem key={course.id} value={course.id.toString()}>
                    {course.name}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {courses.length} TA course(s) found
              </FormHelperText>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="assignment-select-label">Select Assignment</InputLabel>
              <Select
                labelId="assignment-select-label"
                value={selectedAssignmentId}
                label="Select Assignment"
                onChange={(e) => handleAssignmentChange(e.target.value)}
                disabled={loading || !selectedCourseId}
              >
                {assignments.map((assignment) => (
                  <MenuItem key={assignment.id} value={assignment.id.toString()}>
                    {assignment.name}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {selectedCourseId ? `${assignments.length} published assignment(s) in course` : 'Select a course first'}
              </FormHelperText>
            </FormControl>
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 3 }}>
          <Button 
            variant="outlined" 
            onClick={fetchAssignments}
            disabled={loading || !selectedCourseId}
            startIcon={loading ? <CircularProgress size={20} /> : <SyncIcon />}
            sx={{ mr: 2 }}
          >
            {loading ? 'Loading...' : 'Load Assignments'}
          </Button>
          
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => {
              setCurrentStep(2);
              setActiveView('sync');
            }}
            disabled={!selectedCourseId || !selectedAssignmentId}
            size="large"
          >
            Continue to Sync
          </Button>
        </Box>
        
        {selectedCourseId && selectedAssignmentId && (
          <Paper sx={{ mt: 3, p: 2, bgcolor: 'primary.50' }}>
            <Typography variant="subtitle2" gutterBottom>
              Selected:
            </Typography>
            <Typography variant="body2">
              <strong>Course:</strong> {selectedCourseName}
            </Typography>
            <Typography variant="body2">
              <strong>Assignment:</strong> {selectedAssignmentName}
            </Typography>
          </Paper>
        )}
      </CardContent>
    </Card>
  );

  // Render connection screen
  const renderConnectScreen = () => (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Connect to Canvas LMS
        </Typography>
        
        <Typography variant="body1" paragraph>
          Enter your Canvas API token to get started with assignment grading.
        </Typography>
        
          <TextField
            fullWidth
          label="Canvas API Token"
          type={showApiKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          variant="outlined"
          margin="normal"
          required
          disabled={loading}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                  onClick={() => setShowApiKey(!showApiKey)}
                    edge="end"
                  >
                    {showApiKey ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          helperText="Your Canvas API token from Settings > Approved Integrations"
          />
        
        <Box sx={{ mt: 3 }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleConnect} 
            disabled={loading || !apiKey.trim()}
            size="large"
            startIcon={loading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
          >
            {loading ? 'Connecting...' : 'Connect to Canvas'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );

  // Render sync screen
  const renderSyncScreen = () => (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Sync Assignment Submissions
        </Typography>
        
        <Box sx={{ mt: 3, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            <strong>Course:</strong> {selectedCourseName}
          </Typography>
          <Typography variant="subtitle1" gutterBottom>
            <strong>Assignment:</strong> {selectedAssignmentName}
          </Typography>
        </Box>
        
        <Typography variant="body1" paragraph>
          Click "Sync Submissions" to download all submission files from Canvas. This will prepare them for grading and allow you to select which students to grade.
        </Typography>
        
        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button 
          variant="outlined" 
            onClick={() => {
              setCurrentStep(1);
              setActiveView('select-course');
            }}
        >
          Back
        </Button>
        <Button 
          variant="contained" 
          color="primary" 
            onClick={() => handleSyncSubmissions(false)} 
          disabled={loading}
            size="large"
            startIcon={loading ? <CircularProgress size={20} /> : <SyncIcon />}
        >
            {loading ? 'Syncing...' : 'Smart Sync'}
        </Button>
        <Button 
          variant="outlined" 
          color="secondary" 
            onClick={() => handleSyncSubmissions(true)} 
          disabled={loading}
            size="large"
            startIcon={loading ? <CircularProgress size={20} /> : <SyncIcon />}
        >
            Force Resync
        </Button>
        </Box>
      </CardContent>
    </Card>
  );
  
  // Render submission selection screen
  const renderSelectionScreen = () => {
    const validSubmissions = syncedSubmissions.filter(s => s.sync_status === 'synced');
    const paginatedSubmissions = validSubmissions.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    
    return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
            Select Submissions to Grade
          </Typography>
          
          {syncSummary && (
            <Box sx={{ mb: 3 }}>
              <Alert severity="success" sx={{ mb: 2 }}>
                Successfully synced {syncSummary.successful_syncs} of {syncSummary.total_submissions} submissions
                {syncSummary.assignment_analysis && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2">
                      ✨ Enhanced with AI analysis: {syncSummary.assignment_analysis.questions_found} questions identified,
                      {syncSummary.assignment_analysis.has_generated_rubric ? ' custom rubric generated,' : ''}
                      {syncSummary.assignment_analysis.has_answer_key ? ' answer key created' : ''}
                    </Typography>
                  </Box>
                )}
              </Alert>
              
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                    <Typography variant="h4">{syncSummary.total_submissions}</Typography>
                    <Typography variant="body2">Total</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.main', color: 'success.contrastText' }}>
                    <Typography variant="h4">{syncSummary.successful_syncs}</Typography>
                    <Typography variant="body2">Synced</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.main', color: 'error.contrastText' }}>
                    <Typography variant="h4">{syncSummary.failed_syncs}</Typography>
                    <Typography variant="body2">Failed</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.main', color: 'warning.contrastText' }}>
                    <Typography variant="h4">{syncSummary.no_files}</Typography>
                    <Typography variant="body2">No Files</Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Enhanced Assignment Analysis Display */}
              {syncSummary.assignment_analysis && (
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                      🤖 AI Assignment Analysis
                    </Typography>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="primary">Questions Identified:</Typography>
                          <Typography variant="body2">{syncSummary.assignment_analysis.questions_found} questions found</Typography>
                        </Box>
                        
                        {syncSummary.assignment_analysis.main_topics && syncSummary.assignment_analysis.main_topics.length > 0 && (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" color="primary">Main Topics:</Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                              {syncSummary.assignment_analysis.main_topics.map((topic, index) => (
                                <Chip key={index} label={topic} size="small" variant="outlined" />
                              ))}
                            </Box>
                          </Box>
                        )}
                        
                        {syncSummary.assignment_analysis.question_types && syncSummary.assignment_analysis.question_types.length > 0 && (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" color="primary">Question Types:</Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                              {syncSummary.assignment_analysis.question_types.map((type, index) => (
                                <Chip key={index} label={type} size="small" color="secondary" variant="outlined" />
                              ))}
                            </Box>
                          </Box>
                        )}
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="primary">Difficulty Level:</Typography>
                          <Chip 
                            label={syncSummary.assignment_analysis.difficulty_level || 'Medium'} 
                            color={
                              syncSummary.assignment_analysis.difficulty_level === 'easy' ? 'success' :
                              syncSummary.assignment_analysis.difficulty_level === 'hard' ? 'error' : 'warning'
                            }
                            size="small"
                          />
                        </Box>
                        
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="primary">AI Enhancements:</Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
                            {syncSummary.assignment_analysis.has_generated_rubric && (
                              <Chip icon={<CheckCircleIcon />} label="Custom Rubric Generated" size="small" color="success" />
                            )}
                            {syncSummary.assignment_analysis.has_answer_key && (
                              <Chip icon={<CheckCircleIcon />} label="Answer Key Created" size="small" color="success" />
                            )}
                            {syncSummary.assignment_analysis.has_test_cases && (
                              <Chip icon={<CheckCircleIcon />} label="Test Cases Generated" size="small" color="success" />
                            )}
                            {syncSummary.ocr_processing && syncSummary.ocr_processing.files_with_extracted_text > 0 && (
                              <Chip icon={<CheckCircleIcon />} label={`OCR: ${syncSummary.ocr_processing.files_with_extracted_text} files processed`} size="small" color="info" />
                            )}
                          </Box>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              )}
              
              {/* OCR Processing Statistics */}
              {syncSummary.ocr_processing && syncSummary.ocr_processing.total_files > 0 && (
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                      📷 OCR Processing Results
                    </Typography>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                          <Typography variant="h4">{syncSummary.ocr_processing.total_files}</Typography>
                          <Typography variant="body2">Total Files</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.main', color: 'success.contrastText' }}>
                          <Typography variant="h4">{syncSummary.ocr_processing.files_with_extracted_text}</Typography>
                          <Typography variant="body2">Text Extracted</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.main', color: 'info.contrastText' }}>
                          <Typography variant="h4">{syncSummary.ocr_processing.image_files_processed}</Typography>
                          <Typography variant="body2">Images</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'secondary.main', color: 'secondary.contrastText' }}>
                          <Typography variant="h4">{syncSummary.ocr_processing.document_files_processed}</Typography>
                          <Typography variant="body2">Documents</Typography>
                        </Paper>
                      </Grid>
                      {syncSummary.ocr_processing.total_extracted_characters > 0 && (
                        <Grid item xs={12}>
                          <Alert severity="info" sx={{ mt: 1 }}>
                            <Typography variant="body2">
                              <strong>Total text extracted:</strong> {syncSummary.ocr_processing.total_extracted_characters.toLocaleString()} characters
                              {syncSummary.ocr_processing.files_with_ai_analysis > 0 && 
                                ` • ${syncSummary.ocr_processing.files_with_ai_analysis} files enhanced with AI image analysis`
                              }
                            </Typography>
                          </Alert>
                        </Grid>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              )}
            </Box>
          )}
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Select submissions to grade ({selectedSubmissions.size} selected)
          </Typography>
            <Button
              variant="outlined"
              onClick={handleSelectAll}
              disabled={validSubmissions.length === 0}
            >
              {selectedSubmissions.size === validSubmissions.length ? 'Deselect All' : 'Select All'}
            </Button>
        </Box>
        
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedSubmissions.size > 0 && selectedSubmissions.size < validSubmissions.length}
                      checked={validSubmissions.length > 0 && selectedSubmissions.size === validSubmissions.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell>Student</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Submitted</TableCell>
                  <TableCell>Files</TableCell>
                  <TableCell>Sync Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedSubmissions.map((submission) => (
                  <TableRow key={submission.user_id}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedSubmissions.has(submission.user_id)}
                        onChange={() => handleSelectSubmission(submission.user_id)}
                        disabled={submission.sync_status !== 'synced'}
                      />
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {submission.user_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {submission.user_id}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={submission.workflow_state || 'Unknown'} 
                        color={submission.workflow_state === 'submitted' ? 'success' : 'default'}
                        size="small"
                      />
                      {submission.late && (
                        <Chip label="Late" color="warning" size="small" sx={{ ml: 1 }} />
                      )}
                    </TableCell>
                    <TableCell>
                      {submission.submitted_at ? 
                        new Date(submission.submitted_at).toLocaleString() : 
                        'Not submitted'
                      }
                    </TableCell>
                    <TableCell>
                      {submission.attachments ? submission.attachments.length : 0} files
                    </TableCell>
                    <TableCell>
                      <Chip 
                        icon={
                          submission.sync_status === 'synced' ? <CheckCircleIcon /> :
                          submission.sync_status === 'failed' ? <ErrorIcon /> :
                          submission.sync_status === 'no_files' ? <WarningIcon /> :
                          <ErrorIcon />
                        }
                        label={submission.sync_status}
                        color={
                          submission.sync_status === 'synced' ? 'success' :
                          submission.sync_status === 'failed' ? 'error' :
                          submission.sync_status === 'no_files' ? 'warning' :
                          'default'
                        }
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={validSubmissions.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(event, newPage) => setPage(newPage)}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
          />
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
            <Button 
              variant="outlined" 
              onClick={() => {
                setCurrentStep(2);
                setActiveView('sync');
              }}
            >
              Back to Sync
            </Button>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => {
                setCurrentStep(3);
                setActiveView('grade');
              }}
              disabled={selectedSubmissions.size === 0}
            >
              Continue to Grading ({selectedSubmissions.size} selected)
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  };

  // Render grading configuration screen
  // Render rubric review screen
  const renderRubricReviewScreen = () => (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          📋 Review AI-Generated Rubric & Answer Key
        </Typography>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Review and approve the AI-generated rubric and answer key before proceeding with grading.</strong> 
            These were created based on the assignment description and instructions from Canvas.
          </Typography>
        </Alert>

        {/* Assignment Overview */}
        {syncSummary?.assignment_details && (
          <Card sx={{ mb: 3, bgcolor: 'primary.50' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                📝 Assignment Analysis
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2"><strong>Assignment:</strong> {syncSummary.assignment_details.name}</Typography>
                  <Typography variant="body2"><strong>Total Points:</strong> {syncSummary.assignment_details.points_possible}</Typography>
                  <Typography variant="body2"><strong>Due Date:</strong> {formatDate(syncSummary.assignment_details.due_at)}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2"><strong>Topics Identified:</strong> {syncSummary.assignment_analysis?.main_topics?.join(', ') || 'General'}</Typography>
                  <Typography variant="body2"><strong>Question Types:</strong> {syncSummary.assignment_analysis?.question_types?.join(', ') || 'Mixed'}</Typography>
                  <Typography variant="body2"><strong>Difficulty Level:</strong> {syncSummary.assignment_analysis?.difficulty_level || 'Medium'}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        <Grid container spacing={3}>
          {/* Rubric Review */}
          <Grid item xs={12} lg={7}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6" sx={{ color: 'success.main' }}>
                    🎯 Generated Rubric
                  </Typography>
                  {reviewRubricData && (
                    <Chip label={`${reviewRubricData.total_points} points`} color="primary" />
                  )}
                </Box>

                {reviewRubricData ? (
                  <Box>
                    <Typography variant="body1" paragraph>
                      <strong>Description:</strong> {reviewRubricData.description}
                    </Typography>
                    
                    <Typography variant="subtitle1" gutterBottom>
                      Grading Criteria ({reviewRubricData.sections?.length || 0} sections):
                    </Typography>
                    
                    {reviewRubricData.sections?.map((section, index) => (
                      <Accordion key={index} sx={{ mb: 1 }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Box display="flex" justifyContent="space-between" width="100%" mr={2}>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {section.name}
                            </Typography>
                            <Chip label={`${section.max_points} pts`} size="small" />
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          {section.criteria?.map((criterion, critIndex) => (
                            <Box key={critIndex} sx={{ mb: 2 }}>
                              <Typography variant="body2" fontWeight="bold" gutterBottom>
                                {criterion.name} ({criterion.points} points)
                              </Typography>
                              <Typography variant="body2" color="text.secondary" paragraph>
                                {criterion.description}
                              </Typography>
                              
                              {criterion.grading_scale && (
                                <Grid container spacing={1}>
                                  {criterion.grading_scale.map((level, levelIndex) => (
                                    <Grid item xs={6} sm={3} key={levelIndex}>
                                      <Paper 
                                        sx={{ 
                                          p: 1, 
                                          bgcolor: level.level === 'Excellent' ? 'success.light' : 
                                                  level.level === 'Good' ? 'info.light' :
                                                  level.level === 'Satisfactory' ? 'warning.light' : 'error.light',
                                          color: 'text.primary'
                                        }}
                                      >
                                        <Typography variant="caption" fontWeight="bold" display="block">
                                          {level.level} ({level.points} pts)
                                        </Typography>
                                        <Typography variant="caption">
                                          {level.description}
                                        </Typography>
                                      </Paper>
                                    </Grid>
                                  ))}
                                </Grid>
                              )}
                            </Box>
                          ))}
                        </AccordionDetails>
                      </Accordion>
                    ))}
                    
                    <Box sx={{ mt: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Checkbox 
                        checked={rubricApproved}
                        onChange={(e) => setRubricApproved(e.target.checked)}
                        color="success"
                      />
                      <Typography variant="body2">
                        I approve this rubric for grading
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <Alert severity="warning">
                    Rubric data is being loaded...
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Answer Key Review */}
          <Grid item xs={12} lg={5}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: 'info.main' }}>
                  📚 Generated Answer Key
                </Typography>

                {reviewAnswerKey ? (
                  <Box>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50', maxHeight: 400, overflow: 'auto' }}>
                      <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                        {reviewAnswerKey}
                      </Typography>
                    </Paper>
                    
                    <Box sx={{ mt: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Checkbox 
                        checked={answerKeyApproved}
                        onChange={(e) => setAnswerKeyApproved(e.target.checked)}
                        color="success"
                      />
                      <Typography variant="body2">
                        I approve this answer key for grading reference
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <Alert severity="info">
                    No answer key was generated for this assignment. The rubric will be used as the primary grading guide.
                    <Box sx={{ mt: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Checkbox 
                        checked={answerKeyApproved}
                        onChange={(e) => setAnswerKeyApproved(e.target.checked)}
                        color="success"
                      />
                      <Typography variant="body2">
                        Proceed without answer key
                      </Typography>
                    </Box>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Action Buttons */}
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button 
            variant="outlined" 
            onClick={() => {
              setCurrentStep(2);
              setActiveView('sync');
            }}
          >
            ← Back to Sync
          </Button>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => reviewRubricData && openEditRubricDialog(reviewRubricData)}
              disabled={!reviewRubricData}
            >
              Edit Rubric Manually
            </Button>
            
            <Button
              variant="contained"
              size="large"
              onClick={() => {
                if (rubricApproved && (answerKeyApproved || !reviewAnswerKey)) {
                  setCurrentStep(4);
                  setActiveView('select');
                } else {
                  alert('Please approve both the rubric and answer key (or confirm proceeding without answer key) before continuing.');
                }
              }}
              disabled={!rubricApproved || (!answerKeyApproved && reviewAnswerKey)}
              sx={{
                bgcolor: (rubricApproved && (answerKeyApproved || !reviewAnswerKey)) ? 'success.main' : 'grey.400',
                '&:hover': {
                  bgcolor: (rubricApproved && (answerKeyApproved || !reviewAnswerKey)) ? 'success.dark' : 'grey.500'
                }
              }}
            >
              ✅ Approve & Continue to Selection
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const renderGradingScreen = () => (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          🚀 Ready to Grade Submissions
        </Typography>
        
        <Box sx={{ mb: 3 }}>
          <Alert severity="success">
            ✅ Selected {selectedSubmissions.size} submissions ready for AI grading with assignment-specific analysis.
          </Alert>
        </Box>
        
        {/* Grading Scale Display */}
        <Paper sx={{ p: 3, mb: 3, bgcolor: 'grey.50' }}>
          <Typography variant="h6" gutterBottom>
            Grading Scale
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={2}>
              <Box textAlign="center">
                <Typography variant="h6" color="success.main">A</Typography>
                <Typography variant="body2">90-100%</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={2}>
              <Box textAlign="center">
                <Typography variant="h6" color="info.main">B</Typography>
                <Typography variant="body2">80-89%</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={2}>
              <Box textAlign="center">
                <Typography variant="h6" color="warning.main">C</Typography>
                <Typography variant="body2">70-79%</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={2}>
              <Box textAlign="center">
                <Typography variant="h6" color="orange">D</Typography>
                <Typography variant="body2">60-69%</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={2}>
              <Box textAlign="center">
                <Typography variant="h6" color="error.main">F</Typography>
                <Typography variant="body2">0-59%</Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
        
        {/* Assignment Analysis Summary */}
        {syncSummary && syncSummary.assignment_analysis && (
          <Card sx={{ mb: 3, bgcolor: 'primary.50' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                🎯 Assignment-Specific Grading Setup
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Questions Identified:</strong> {syncSummary.assignment_analysis.questions_found}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Difficulty Level:</strong> {syncSummary.assignment_analysis.difficulty_level || 'Medium'}
                  </Typography>
                  {syncSummary.assignment_analysis.main_topics && syncSummary.assignment_analysis.main_topics.length > 0 && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2" sx={{ mb: 0.5 }}><strong>Topics:</strong></Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {syncSummary.assignment_analysis.main_topics.slice(0, 3).map((topic, index) => (
                          <Chip key={index} label={topic} size="small" variant="outlined" />
                        ))}
                        {syncSummary.assignment_analysis.main_topics.length > 3 && (
                          <Chip label={`+${syncSummary.assignment_analysis.main_topics.length - 3} more`} size="small" variant="outlined" />
                        )}
                      </Box>
                    </Box>
                  )}
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {syncSummary.assignment_analysis.has_generated_rubric && (
                      <Chip icon={<CheckCircleIcon />} label="✨ Custom Rubric Auto-Generated" color="success" />
                    )}
                    {syncSummary.assignment_analysis.has_answer_key && (
                      <Chip icon={<CheckCircleIcon />} label="📝 Answer Key Created" color="success" />
                    )}
                    {syncSummary.assignment_analysis.has_test_cases && (
                      <Chip icon={<CheckCircleIcon />} label="🧪 Test Cases Generated" color="success" />
                    )}
                    {syncSummary.ocr_processing && syncSummary.ocr_processing.files_with_extracted_text > 0 && (
                      <Chip icon={<CheckCircleIcon />} label={`🔍 OCR: ${syncSummary.ocr_processing.files_with_extracted_text} files processed`} color="info" />
                    )}
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: 'success.50' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: 'success.main', display: 'flex', alignItems: 'center' }}>
                  📋 Grading Rubric
                </Typography>
                {syncSummary?.assignment_analysis?.has_generated_rubric ? (
                  <>
                    <Alert severity="success" sx={{ mb: 2 }}>
                      🤖 AI has generated a custom rubric tailored to this assignment's specific requirements and content.
                    </Alert>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      The rubric includes criteria for: {syncSummary.assignment_analysis.main_topics?.slice(0, 2).join(', ')}
                      {syncSummary.assignment_analysis.main_topics?.length > 2 && ` and ${syncSummary.assignment_analysis.main_topics.length - 2} more topics`}
                    </Typography>
                  </>
                ) : (
                  <>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      📏 Using comprehensive default rubric covering technical accuracy, completeness, and analysis quality.
                    </Alert>
                  </>
                )}
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handlePreviewRubric}
                    disabled={loadingRubric}
                    startIcon={loadingRubric ? <CircularProgress size={16} /> : null}
                  >
                    👁️ Preview Rubric
                  </Button>
                <Button
                    variant="outlined"
                    size="small"
                  component={Link}
                  href="/rubric"
                    target="_blank"
                >
                    ✏️ Edit/Create Rubric
                </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography gutterBottom>Grading Strictness</Typography>
            <Slider
              value={strictness}
              onChange={(e, value) => setStrictness(value)}
              min={0}
              max={1}
              step={0.1}
              marks={[
                { value: 0, label: 'Lenient' },
                { value: 0.5, label: 'Balanced' },
                { value: 1, label: 'Strict' }
              ]}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
            />
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
          <Button 
            variant="outlined" 
            onClick={() => {
                setCurrentStep(4);
              setActiveView('select');
            }}
          >
            Back to Selection
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleGradeSubmissions}
            disabled={gradingInProgress || selectedSubmissions.size === 0}
            size="large"
            startIcon={gradingInProgress ? <CircularProgress size={20} /> : <GradeIcon />}
          >
            {gradingInProgress ? 'Grading...' : `Grade ${selectedSubmissions.size} Submissions`}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );

  // Render results screen
  const renderResultsScreen = () => {
    const successfulGrades = gradingResults.filter(r => r.status === 'graded');
    const averageGrade = successfulGrades.length > 0 ? 
      successfulGrades.reduce((sum, r) => sum + (r.percentage || 0), 0) / successfulGrades.length : 0;
    
    return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
            Grading Results
        </Typography>
          
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                <Typography variant="h4">{gradingResults.length}</Typography>
                <Typography variant="body2">Total Processed</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.main', color: 'success.contrastText' }}>
                <Typography variant="h4">{successfulGrades.length}</Typography>
                <Typography variant="body2">Successfully Graded</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.main', color: 'info.contrastText' }}>
                <Typography variant="h4">{averageGrade.toFixed(1)}%</Typography>
                <Typography variant="body2">Average Score</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.main', color: 'warning.contrastText' }}>
                <Typography variant="h4">{gradingResults.filter(r => r.status !== 'graded').length}</Typography>
                <Typography variant="body2">Failed/Errors</Typography>
              </Paper>
            </Grid>
          </Grid>
          
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Student</TableCell>
                  <TableCell>Grade</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Files</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {gradingResults.map((result) => (
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
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h6" 
                          color={result.percentage >= 80 ? 'success.main' : 
                                 result.percentage >= 60 ? 'warning.main' : 'error.main'}>
                          {result.percentage_display || `${result.percentage}%`}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          ({result.score_display || `${result.raw_score}/${result.total_points}`})
                        </Typography>
                      </Box>
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
                      {result.files_processed || 0} files processed
                    </TableCell>
                    <TableCell>
                          <Button 
                            size="small" 
                        onClick={() => {
                          setSelectedResult(result);
                          setResultsDialogOpen(true);
                        }}
                          >
                        View Details
                          </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
            <Button 
              variant="outlined" 
              onClick={() => {
                setCurrentStep(3);
                setActiveView('select');
              }}
            >
              Grade More Submissions
            </Button>
            <Box sx={{ display: 'flex', gap: 2 }}>
        <Button 
          variant="outlined" 
                color="secondary"
                startIcon={<FileDownloadIcon />}
                onClick={() => {
                  const resultsJson = JSON.stringify(gradingResults, null, 2);
                  const blob = new Blob([resultsJson], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `grading_results_${selectedAssignmentId}_${new Date().toISOString().split('T')[0]}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Export Results
        </Button>
        <Button 
          variant="contained" 
                color="primary"
                onClick={() => {
                  handlePostGrades();
                }}
              >
                Post Grades to Canvas
        </Button>
        <Button
              variant="outlined"
              color="primary"
              startIcon={<SaveIcon />}
              onClick={async () => {
                handleSaveResults();
              }}
            >
              Save Results
            </Button>
            </Box>
          </Box>
      </CardContent>
    </Card>
  );
  };

  // Step labels for enhanced workflow
  const steps = ['🔑 Connect', '📚 Course', '🔄 Sync', '📋 Review Rubric', '👥 Select', '🚀 Grade', '📊 Results'];

  return (
    <ProtectedRoute allowedRoles={['teacher', 'admin', 'grader']}>
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
          {/* Documentation */}
          <CanvasPageDocumentation />
          
      <Typography variant="h4" gutterBottom>
          🎯 Canvas AI Grading System
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Enhanced AI Workflow:</strong> Connect Canvas API → Select Course & Assignment → Auto-sync with OCR → Review AI-generated rubric & answer key → Grade submissions with approved rubric
        </Typography>
      </Alert>
      
        {/* Progress Stepper */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Stepper activeStep={currentStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>
        
        {/* Error Display */}
      {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
        {/* Main Content */}
        {activeView === 'connect' && renderConnectScreen()}
        {activeView === 'select-course' && renderCourseSelectionScreen()}
        {activeView === 'sync' && renderSyncScreen()}
        {activeView === 'review-rubric' && renderRubricReviewScreen()}
        {activeView === 'select' && renderSelectionScreen()}
        {activeView === 'grade' && renderGradingScreen()}
        {activeView === 'results' && renderResultsScreen()}
        
        {/* Enhanced Results Detail Dialog with Rubric Breakdown and Submission Content */}
        <Dialog
          open={resultsDialogOpen}
          onClose={() => setResultsDialogOpen(false)}
          maxWidth="lg"
          fullWidth
          PaperProps={{ sx: { height: '90vh' } }}
        >
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={2}>
              <GradeIcon />
              Detailed Grading Results - {selectedResult?.user_name}
              <Chip 
                label={selectedResult?.status} 
                color={selectedResult?.status === 'graded' ? 'success' : 'error'} 
                size="small" 
              />
            </Box>
          </DialogTitle>
          <DialogContent dividers sx={{ overflowY: 'auto' }}>
            {selectedResult && (
              <Box>
                {/* Overall Grade Summary */}
                <Paper sx={{ p: 3, mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={3}>
                      <Typography variant="h4" fontWeight="bold">
                        {selectedResult.percentage_display || `${selectedResult.percentage}%`}
                      </Typography>
                      <Typography variant="body2">Final Grade</Typography>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="h6">
                        {selectedResult.score_display || `${selectedResult.raw_score}/${selectedResult.total_points}`}
                      </Typography>
                      <Typography variant="body2">Points Earned</Typography>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="body1">
                        {selectedResult.files_processed || 0} files
                      </Typography>
                      <Typography variant="body2">Files Processed</Typography>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="body1">
                        {selectedResult.rubric_used || 'Default'}
                      </Typography>
                      <Typography variant="body2">Rubric Used</Typography>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Rubric Breakdown - Only show if available */}
                {selectedResult.rubric_breakdown && selectedResult.rubric_breakdown.length > 0 && (
                  <>
                    <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                      📋 Rubric-Based Score Breakdown
                    </Typography>
                    <TableContainer component={Paper} sx={{ mb: 3 }}>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>Criterion</strong></TableCell>
                            <TableCell align="center"><strong>Points Earned</strong></TableCell>
                            <TableCell align="center"><strong>Max Points</strong></TableCell>
                            <TableCell align="center"><strong>Percentage</strong></TableCell>
                            <TableCell><strong>Feedback</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedResult.rubric_breakdown.map((criterion, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <Typography variant="body2" fontWeight="bold">
                                  {criterion.criterion_name}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Typography 
                                  variant="body1" 
                                  color={criterion.points_awarded > 0 ? 'success.main' : 'error.main'}
                                  fontWeight="bold"
                                >
                                  {criterion.points_awarded}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body1">
                                  {criterion.max_points}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Typography 
                                  variant="body1"
                                  color={criterion.percentage >= 80 ? 'success.main' : 
                                         criterion.percentage >= 60 ? 'warning.main' : 'error.main'}
                                >
                                  {criterion.percentage?.toFixed(1)}%
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {criterion.feedback}
                                </Typography>
                                {criterion.evidence_found && criterion.evidence_found !== 'None identified' && (
                                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                    <strong>Evidence:</strong> {criterion.evidence_found}
                                  </Typography>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </>
                )}

                {/* Overall Feedback */}
                <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                  💬 Overall Feedback
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'grey.50', mb: 3 }}>
                  <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                    {selectedResult.feedback || 'No feedback available'}
                  </Typography>
                </Paper>

                {/* Submission Content Review */}
                {selectedResult.submission_content && (
                  <>
                    <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                      📄 Submission Content Review
                    </Typography>
                    <Paper sx={{ p: 2, bgcolor: 'info.light', mb: 3, maxHeight: '300px', overflow: 'auto' }}>
                      <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                        {selectedResult.submission_content}
                      </Typography>
                    </Paper>
                  </>
                )}

                {/* Individual Files */}
                {selectedResult.submission_files && selectedResult.submission_files.length > 0 && (
                  <>
                    <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                      📁 Individual Files ({selectedResult.submission_files.length})
                    </Typography>
                    {selectedResult.submission_files.map((file, index) => (
                      <Accordion key={index} sx={{ mb: 1 }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="subtitle2">
                            📎 {file.name}
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                            <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                              {file.preview}
                            </Typography>
                          </Paper>
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </>
                )}

                {/* Error or Status Information */}
                {selectedResult.status !== 'graded' && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Status:</strong> {selectedResult.status}
                      {selectedResult.status === 'no_files' && ' - No files were submitted by this student.'}
                      {selectedResult.status === 'no_readable_content' && ' - Files were submitted but no readable content could be extracted.'}
                      {selectedResult.status === 'error' && ' - An error occurred during grading.'}
                    </Typography>
                  </Alert>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setResultsDialogOpen(false)}>
              Close
            </Button>
            <Button 
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={() => {
                if (selectedResult) {
                  const resultJson = JSON.stringify(selectedResult, null, 2);
                  const blob = new Blob([resultJson], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `detailed_result_${selectedResult.user_name}_${selectedResult.user_id}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }
              }}
            >
              Export Details
            </Button>
          </DialogActions>
        </Dialog>

        {/* Rubric Preview Modal */}
        <Dialog
          open={rubricPreviewOpen}
          onClose={() => setRubricPreviewOpen(false)}
          maxWidth="lg"
          fullWidth
          PaperProps={{ sx: { height: '90vh' } }}
        >
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={2}>
              <VisibilityIcon />
              {previewRubricData?.name || 'Grading Rubric Preview'}
              {previewRubricData?.total_points && (
                <Chip label={`${previewRubricData.total_points} points`} color="primary" />
              )}
              {syncSummary?.assignment_analysis?.has_generated_rubric && (
                <Chip label="✨ AI Generated" color="success" size="small" />
              )}
            </Box>
          </DialogTitle>
          <DialogContent dividers sx={{ overflowY: 'auto' }}>
            {previewRubricData && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Description</Typography>
                  <Typography paragraph>{previewRubricData.description}</Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Grading Criteria ({previewRubricData.sections?.length || 0} sections)
                  </Typography>
                  
                  {previewRubricData.sections?.map((section, sectionIndex) => (
                    <Accordion key={sectionIndex} defaultExpanded>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box display="flex" alignItems="center" gap={2} width="100%">
                          <Typography variant="subtitle1" fontWeight="bold">
                            {section.name}
                          </Typography>
                          <Chip label={`${section.max_points} pts`} size="small" />
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        {section.criteria?.map((criterion, criterionIndex) => (
                          <Box key={criterionIndex} sx={{ mb: 3 }}>
                            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                              {criterion.name} ({criterion.points} points)
                            </Typography>
                            <Typography paragraph color="text.secondary">
                              {criterion.description}
                            </Typography>
                            
                            {criterion.grading_scale && criterion.grading_scale.length > 0 && (
                              <>
                                <Typography variant="body2" fontWeight="bold" gutterBottom>
                                  Performance Levels:
                                </Typography>
                                <Grid container spacing={1}>
                                  {criterion.grading_scale.map((level, levelIndex) => (
                                    <Grid item xs={12} sm={6} md={3} key={levelIndex}>
                                      <Paper 
                                        sx={{ 
                                          p: 2, 
                                          bgcolor: level.level === 'Excellent' ? 'success.light' : 
                                                  level.level === 'Good' ? 'info.light' :
                                                  level.level === 'Satisfactory' ? 'warning.light' : 'error.light',
                                          color: level.level === 'Excellent' ? 'success.contrastText' : 
                                                 level.level === 'Good' ? 'info.contrastText' :
                                                 level.level === 'Satisfactory' ? 'warning.contrastText' : 'error.contrastText'
                                        }}
                                      >
                                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                          <Typography variant="body2" fontWeight="bold">
                                            {level.level}
                                          </Typography>
                                          <Typography variant="body2" fontWeight="bold">
                                            {level.points} pts
                                          </Typography>
                                        </Box>
                                        <Typography variant="caption">
                                          {level.description}
                                        </Typography>
                                      </Paper>
                                    </Grid>
                                  ))}
                                </Grid>
                              </>
                            )}
                          </Box>
                        ))}
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Grid>
                
                <Grid item xs={12}>
                  <Paper sx={{ p: 2, bgcolor: 'info.light', color: 'info.contrastText' }}>
                    <Typography variant="body2">
                      <strong>Assignment:</strong> {syncSummary?.assignment_details?.name || 'N/A'} | 
                      <strong> Total Points:</strong> {previewRubricData.total_points} |
                      <strong> Topics Covered:</strong> {syncSummary?.assignment_analysis?.main_topics?.join(', ') || 'General'}
                      {syncSummary?.assignment_analysis?.has_generated_rubric && (
                        <><br/><strong>✨ This rubric was automatically generated by AI based on the assignment content and requirements.</strong></>
                      )}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRubricPreviewOpen(false)}>Close</Button>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => {
                setRubricPreviewOpen(false);
                previewRubricData && openEditRubricDialog(previewRubricData);
              }}
              disabled={!previewRubricData}
            >
              Edit Rubric
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                setRubricPreviewOpen(false);
                // Proceed to grading with this rubric
                handleGradeSubmissions();
              }}
              disabled={selectedSubmissions.size === 0}
            >
              Use This Rubric for Grading
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Rubric Dialog */}
        <Dialog
          open={editRubricDialogOpen}
          onClose={closeEditRubricDialog}
          maxWidth="lg"
          fullWidth
          PaperProps={{ sx: { height: '90vh' } }}
        >
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={2}>
              <EditIcon />
              Edit Rubric - {editingRubricData?.name || 'Canvas Assignment Rubric'}
              <Chip label={`${calculateTotalPoints() || 0} points`} color="primary" />
            </Box>
          </DialogTitle>
          <DialogContent dividers sx={{ overflowY: 'auto' }}>
            {editingRubricData && (
              <Box>
                <Tabs value={editRubricTab} onChange={(e, newValue) => setEditRubricTab(newValue)}>
                  <Tab label="Basic Info" />
                  <Tab label="Criteria" />
                  <Tab label="Preview" />
                </Tabs>

                {/* Tab 1: Basic Info */}
                {editRubricTab === 0 && (
                  <Box sx={{ p: 3 }}>
                    <Grid container spacing={3}>
                      <Grid item xs={12}>
                        <TextField
                          label="Rubric Name"
                          fullWidth
                          value={editingRubricData.name}
                          onChange={(e) => setEditingRubricData(prev => ({ ...prev, name: e.target.value }))}
                          margin="normal"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="Description"
                          fullWidth
                          multiline
                          rows={4}
                          value={editingRubricData.description}
                          onChange={(e) => setEditingRubricData(prev => ({ ...prev, description: e.target.value }))}
                          margin="normal"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Typography gutterBottom>Grading Strictness</Typography>
                        <Slider
                          value={editingRubricData.strictness || 0.5}
                          onChange={(e, value) => setEditingRubricData(prev => ({ ...prev, strictness: value }))}
                          min={0}
                          max={1}
                          step={0.1}
                          marks={[
                            { value: 0, label: 'Lenient' },
                            { value: 0.5, label: 'Balanced' },
                            { value: 1, label: 'Strict' }
                          ]}
                        />
                      </Grid>
                    </Grid>
                  </Box>
                )}

                {/* Tab 2: Criteria */}
                {editRubricTab === 1 && (
                  <Box sx={{ p: 3 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                      <Typography variant="h6">
                        Rubric Sections ({editingRubricData.sections?.length || 0})
                      </Typography>
                    </Box>

                    {editingRubricData.sections?.map((section, sectionIndex) => (
                      <Accordion key={sectionIndex} sx={{ mb: 2 }} defaultExpanded>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Box display="flex" alignItems="center" gap={2} width="100%">
                            <Typography variant="subtitle1" fontWeight="bold">
                              {section.name || `Section ${sectionIndex + 1}`}
                            </Typography>
                            <Chip label={`${section.max_points || 0} pts`} size="small" />
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                              <TextField
                                label="Section Name"
                                fullWidth
                                value={section.name}
                                onChange={(e) => {
                                  const newSections = [...editingRubricData.sections];
                                  newSections[sectionIndex].name = e.target.value;
                                  setEditingRubricData(prev => ({ ...prev, sections: newSections }));
                                }}
                              />
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <TextField
                                label="Max Points"
                                type="number"
                                fullWidth
                                value={section.max_points || 0}
                                onChange={(e) => {
                                  const newSections = [...editingRubricData.sections];
                                  newSections[sectionIndex].max_points = parseInt(e.target.value) || 0;
                                  setEditingRubricData(prev => ({ ...prev, sections: newSections }));
                                }}
                              />
                            </Grid>

                            <Grid item xs={12}>
                              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="subtitle2">
                                  Criteria ({section.criteria?.length || 0})
                                </Typography>
                                <Button
                                  size="small"
                                  startIcon={<AddCircleOutlineIcon />}
                                  onClick={() => addCriterionToSection(sectionIndex)}
                                >
                                  Add Criterion
                                </Button>
                              </Box>

                              {section.criteria?.map((criterion, criterionIndex) => (
                                <Accordion key={criterionIndex} sx={{ mb: 1 }}>
                                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Box display="flex" alignItems="center" gap={2} width="100%">
                                      <Typography variant="body2" fontWeight="bold">
                                        {criterion.name || `Criterion ${criterionIndex + 1}`}
                                      </Typography>
                                      <Chip label={`${criterion.points || 0} pts`} size="small" />
                                      <Box flexGrow={1} />
                                      <IconButton
                                        size="small"
                                        color="error"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeCriterionFromSection(sectionIndex, criterionIndex);
                                        }}
                                      >
                                        <RemoveCircleOutlineIcon />
                                      </IconButton>
                                    </Box>
                                  </AccordionSummary>
                                  <AccordionDetails>
                                    <Grid container spacing={2}>
                                      <Grid item xs={12} md={6}>
                                        <TextField
                                          label="Criterion Name"
                                          fullWidth
                                          size="small"
                                          value={criterion.name}
                                          onChange={(e) => updateCriterion(sectionIndex, criterionIndex, 'name', e.target.value)}
                                        />
                                      </Grid>
                                      <Grid item xs={12} md={6}>
                                        <TextField
                                          label="Points"
                                          type="number"
                                          fullWidth
                                          size="small"
                                          value={criterion.points}
                                          onChange={(e) => updateCriterion(sectionIndex, criterionIndex, 'points', parseInt(e.target.value) || 0)}
                                        />
                                      </Grid>
                                      <Grid item xs={12}>
                                        <TextField
                                          label="Description"
                                          fullWidth
                                          multiline
                                          rows={2}
                                          size="small"
                                          value={criterion.description}
                                          onChange={(e) => updateCriterion(sectionIndex, criterionIndex, 'description', e.target.value)}
                                        />
                                      </Grid>

                                      <Grid item xs={12}>
                                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                          <Typography variant="body2">Grading Levels</Typography>
                                          <Button
                                            size="small"
                                            onClick={() => addGradingLevel(sectionIndex, criterionIndex)}
                                          >
                                            Add Level
                                          </Button>
                                        </Box>

                                        {criterion.grading_scale?.map((level, levelIndex) => (
                                          <Grid container spacing={1} key={levelIndex} sx={{ mb: 1 }}>
                                            <Grid item xs={3}>
                                              <TextField
                                                label="Level"
                                                size="small"
                                                fullWidth
                                                value={level.level}
                                                onChange={(e) => updateGradingLevel(sectionIndex, criterionIndex, levelIndex, 'level', e.target.value)}
                                              />
                                            </Grid>
                                            <Grid item xs={2}>
                                              <TextField
                                                label="Points"
                                                type="number"
                                                size="small"
                                                fullWidth
                                                value={level.points}
                                                onChange={(e) => updateGradingLevel(sectionIndex, criterionIndex, levelIndex, 'points', parseInt(e.target.value) || 0)}
                                              />
                                            </Grid>
                                            <Grid item xs={6}>
                                              <TextField
                                                label="Description"
                                                size="small"
                                                fullWidth
                                                value={level.description}
                                                onChange={(e) => updateGradingLevel(sectionIndex, criterionIndex, levelIndex, 'description', e.target.value)}
                                              />
                                            </Grid>
                                            <Grid item xs={1}>
                                              <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => removeGradingLevel(sectionIndex, criterionIndex, levelIndex)}
                                              >
                                                <DeleteIcon />
                                              </IconButton>
                                            </Grid>
                                          </Grid>
                                        ))}
                                      </Grid>
                                    </Grid>
                                  </AccordionDetails>
                                </Accordion>
                              ))}
                            </Grid>
                          </Grid>
                        </AccordionDetails>
                      </Accordion>
                    ))}

                    {(!editingRubricData.sections || editingRubricData.sections.length === 0) && (
                      <Paper sx={{ p: 4, textAlign: 'center' }}>
                        <Typography variant="h6" gutterBottom>No sections available</Typography>
                        <Typography color="text.secondary" paragraph>
                          This rubric doesn't have editable sections yet.
                        </Typography>
                      </Paper>
                    )}
                  </Box>
                )}

                {/* Tab 3: Preview */}
                {editRubricTab === 2 && (
                  <Box sx={{ p: 3 }}>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 3 }}>
                          <Typography variant="h6" gutterBottom>Rubric Summary</Typography>
                          <Typography><strong>Name:</strong> {editingRubricData.name}</Typography>
                          <Typography><strong>Total Points:</strong> {calculateTotalPoints()}</Typography>
                          <Typography><strong>Sections Count:</strong> {editingRubricData.sections?.length || 0}</Typography>
                          <Typography><strong>Strictness:</strong> {Math.round((editingRubricData.strictness || 0.5) * 100)}%</Typography>
                        </Paper>
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 3 }}>
                          <Typography variant="h6" gutterBottom>Point Distribution</Typography>
                          {editingRubricData.sections?.map((section, index) => (
                            <Box key={index} display="flex" justifyContent="space-between" mb={1}>
                              <Typography variant="body2">{section.name}</Typography>
                              <Typography variant="body2" fontWeight="bold">{section.max_points || 0} pts</Typography>
                            </Box>
                          ))}
                        </Paper>
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={closeEditRubricDialog} startIcon={<CancelIcon />}>
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={saveEditedRubric}
              startIcon={<SaveIcon />}
              disabled={savingRubric}
            >
              {savingRubric ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
    </ProtectedRoute>
  );
};

export default CanvasPage; 