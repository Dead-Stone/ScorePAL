/**
 * ScorePAL - AI-Powered Academic Grading Assistant
 * Rubric Management & Creation Interface
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
  Button,
  Card,
  CardContent,
  CardActions,
  TextField,
  Divider,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Snackbar,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Fab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Tab,
  Tabs,
  Tooltip,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AssistantIcon from '@mui/icons-material/Assistant';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';

// Configure axios
axios.defaults.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
axios.defaults.headers.common['Accept'] = 'application/json';
axios.defaults.headers.post['Content-Type'] = 'application/json';

// Types
interface GradingScale {
  level: string;
  points: number;
  description: string;
}

interface Criterion {
  name: string;
  description: string;
  max_points: number;
  weight?: number;
  levels?: GradingScale[];
}

interface Rubric {
  id: string;
  name: string;
  description: string;
  criteria: Criterion[];
  total_points: number;
  strictness?: number;
  created_at: string;
  updated_at: string;
}

// Styled components
const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'relative',
  overflow: 'visible',
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: `0 16px 40px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.15)'}`,
    '&::before': {
      opacity: 1,
    }
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
    opacity: 0,
    transition: 'opacity 0.3s ease',
  }
}));

const StyledFab = styled(Fab)(({ theme }) => ({
  position: 'fixed',
  bottom: theme.spacing(3),
  right: theme.spacing(3),
  zIndex: 1000,
}));

const TabPanel = (props: any) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`rubric-tabpanel-${index}`}
      aria-labelledby={`rubric-tab-${index}`}
      style={{ minHeight: 0, height: '100%' }}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const RubricPage = () => {
  const router = useRouter();
  
  // State management
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning',
  });
  
  // Dialog states
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedRubric, setSelectedRubric] = useState<Rubric | null>(null);
  const [dialogTab, setDialogTab] = useState(0);
  
  // Form states
  const [generationParams, setGenerationParams] = useState({
    name: '',
    context: '',
    question: ''
  });
  
  const [editFormData, setEditFormData] = useState<Partial<Rubric>>({
    name: '',
    description: '',
    criteria: [],
    strictness: 0.5
  });
  
  // Fetch rubrics on mount
  useEffect(() => {
    fetchRubrics();
  }, []);
  
  const fetchRubrics = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/rubrics');
      if (response.data && response.data.rubrics) {
        setRubrics(response.data.rubrics);
      }
    } catch (err) {
      console.error('Error fetching rubrics:', err);
      showNotification('Failed to load rubrics', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const showNotification = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setNotification({ open: true, message, severity });
  };
  
  const handleGenerateRubric = async () => {
    try {
      if (!generationParams.name || !generationParams.context) {
        showNotification('Please fill in all required fields', 'error');
        return;
      }
      
      setGenerating(true);
      const response = await axios.post('/generate-rubric', generationParams);
      
      if (response.data && response.data.status === 'success') {
        setRubrics(prev => [...prev, response.data.rubric]);
        setGenerateDialogOpen(false);
        setGenerationParams({ name: '', context: '', question: '' });
        showNotification('Rubric generated successfully!', 'success');
      }
    } catch (err) {
      console.error('Error generating rubric:', err);
      showNotification('Failed to generate rubric. Please try again.', 'error');
    } finally {
      setGenerating(false);
    }
  };
  
  const handleCreateRubric = async () => {
    try {
      if (!editFormData.name || !editFormData.description || !editFormData.criteria?.length) {
        showNotification('Please fill in all required fields and add at least one criterion', 'error');
        return;
      }
      
      setSaving(true);
      const response = await axios.post('/rubrics', editFormData);
      
      if (response.data && response.data.status === 'success') {
        setRubrics(prev => [...prev, response.data.rubric]);
        setCreateDialogOpen(false);
        resetEditForm();
        showNotification('Rubric created successfully!', 'success');
      }
    } catch (err) {
      console.error('Error creating rubric:', err);
      showNotification('Failed to create rubric. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };
  
  const handleUpdateRubric = async () => {
    try {
      if (!selectedRubric || !editFormData.name || !editFormData.description) {
        showNotification('Please fill in all required fields', 'error');
        return;
      }
      
      setSaving(true);
      const updateData = {
        ...editFormData,
        id: selectedRubric.id
      };
      
      const response = await axios.put(`/rubrics/${selectedRubric.id}`, updateData);
      
      if (response.data && response.data.status === 'success') {
        setRubrics(prev => prev.map(r => 
          r.id === selectedRubric.id ? response.data.rubric : r
        ));
        setEditDialogOpen(false);
        setSelectedRubric(null);
        resetEditForm();
        showNotification('Rubric updated successfully!', 'success');
      }
    } catch (err) {
      console.error('Error updating rubric:', err);
      showNotification('Failed to update rubric. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };
  
  const handleDeleteRubric = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this rubric? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await axios.delete(`/rubrics/${id}`);
      if (response.data && response.data.status === 'success') {
        setRubrics(prev => prev.filter(rubric => rubric.id !== id));
        showNotification('Rubric deleted successfully', 'success');
      }
    } catch (err) {
      console.error('Error deleting rubric:', err);
      showNotification('Failed to delete rubric', 'error');
    }
  };
  
  const openEditDialog = (rubric: Rubric) => {
    setSelectedRubric(rubric);
    setEditFormData({
      name: rubric.name,
      description: rubric.description,
      criteria: [...rubric.criteria],
      strictness: rubric.strictness || 0.5
    });
    setEditDialogOpen(true);
    setDialogTab(0);
  };
  
  const openViewDialog = (rubric: Rubric) => {
    setSelectedRubric(rubric);
    setViewDialogOpen(true);
  };
  
  const openCreateDialog = () => {
    resetEditForm();
    setCreateDialogOpen(true);
    setDialogTab(0);
  };
  
  const resetEditForm = () => {
    setEditFormData({
      name: '',
      description: '',
      criteria: [],
      strictness: 0.5
    });
  };
  
  const addCriterion = () => {
    const newCriterion: Criterion = {
      name: '',
      description: '',
      max_points: 10,
      weight: 1.0,
      levels: [
        { level: 'Excellent', points: 10, description: 'Outstanding work' },
        { level: 'Good', points: 8, description: 'Strong work' },
        { level: 'Satisfactory', points: 6, description: 'Acceptable work' },
        { level: 'Poor', points: 4, description: 'Needs improvement' }
      ]
    };
    setEditFormData(prev => ({
      ...prev,
      criteria: [...(prev.criteria || []), newCriterion]
    }));
  };
  
  const removeCriterion = (index: number) => {
    setEditFormData(prev => ({
      ...prev,
      criteria: prev.criteria?.filter((_, i) => i !== index) || []
    }));
  };
  
  const updateCriterion = (index: number, field: string, value: any) => {
    setEditFormData(prev => ({
      ...prev,
      criteria: prev.criteria?.map((criterion, i) => 
        i === index ? { ...criterion, [field]: value } : criterion
      ) || []
    }));
  };
  
  const addGradingLevel = (criterionIndex: number) => {
    const newLevel: GradingScale = {
      level: '',
      points: 0,
      description: ''
    };
    
    setEditFormData(prev => ({
      ...prev,
      criteria: prev.criteria?.map((criterion, i) => 
        i === criterionIndex 
          ? { ...criterion, levels: [...(criterion.levels || []), newLevel] }
          : criterion
      ) || []
    }));
  };
  
  const removeGradingLevel = (criterionIndex: number, levelIndex: number) => {
    setEditFormData(prev => ({
      ...prev,
      criteria: prev.criteria?.map((criterion, i) => 
        i === criterionIndex 
          ? { ...criterion, levels: criterion.levels?.filter((_, li) => li !== levelIndex) || [] }
          : criterion
      ) || []
    }));
  };
  
  const updateGradingLevel = (criterionIndex: number, levelIndex: number, field: string, value: any) => {
    setEditFormData(prev => ({
      ...prev,
      criteria: prev.criteria?.map((criterion, i) => 
        i === criterionIndex 
          ? { 
              ...criterion, 
              levels: criterion.levels?.map((level, li) => 
                li === levelIndex ? { ...level, [field]: value } : level
              ) || []
            }
          : criterion
      ) || []
    }));
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const getTotalPoints = () => {
    return editFormData.criteria?.reduce((sum, criterion) => sum + criterion.max_points, 0) || 0;
  };
  
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h3" component="h1" gutterBottom fontWeight="bold" 
          sx={{ 
            background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
            backgroundClip: 'text',
            textFillColor: 'transparent',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          Rubric Management
        </Typography>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Create, edit, and manage comprehensive grading rubrics for your assignments
        </Typography>
      </Box>
      
      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'primary.main', color: 'primary.contrastText' }}>
            <Typography variant="h4" fontWeight="bold">{rubrics.length}</Typography>
            <Typography variant="body2">Total Rubrics</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'secondary.main', color: 'secondary.contrastText' }}>
            <Typography variant="h4" fontWeight="bold">
              {Math.round(rubrics.reduce((sum, r) => sum + r.total_points, 0) / rubrics.length) || 0}
            </Typography>
            <Typography variant="body2">Avg Points</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'success.main', color: 'success.contrastText' }}>
            <Typography variant="h4" fontWeight="bold">
              {Math.round(rubrics.reduce((sum, r) => sum + r.criteria.length, 0) / rubrics.length) || 0}
            </Typography>
            <Typography variant="body2">Avg Criteria</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'warning.main', color: 'warning.contrastText' }}>
            <Typography variant="h4" fontWeight="bold">
              {rubrics.filter(r => r.total_points >= 100).length}
            </Typography>
            <Typography variant="body2">100+ Point Rubrics</Typography>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Action Buttons */}
      <Box display="flex" gap={2} mb={4} flexWrap="wrap">
        <Button
          variant="contained"
          size="large"
          startIcon={<AssistantIcon />}
          onClick={() => setGenerateDialogOpen(true)}
          sx={{ 
            background: 'linear-gradient(45deg, #FF6B6B, #FF8E53)',
            '&:hover': { background: 'linear-gradient(45deg, #FF5252, #FF7043)' }
          }}
        >
          Generate with AI
        </Button>
        <Button
          variant="outlined"
          size="large"
          startIcon={<AddIcon />}
          onClick={openCreateDialog}
        >
          Create Manually
        </Button>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          component={Link}
          href="/"
        >
          Back to Home
        </Button>
      </Box>
      
      {/* Main Content */}
      {loading ? (
        <Box display="flex" flexDirection="column" alignItems="center" my={8}>
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography variant="h6" color="text.secondary">Loading rubrics...</Typography>
        </Box>
      ) : rubrics.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            No rubrics found
          </Typography>
          <Typography color="text.secondary" paragraph>
            Get started by creating your first rubric using AI generation or manual creation.
          </Typography>
          <Box mt={3} display="flex" gap={2} justifyContent="center">
            <Button
              variant="contained"
              startIcon={<AssistantIcon />}
              onClick={() => setGenerateDialogOpen(true)}
            >
              Generate with AI
            </Button>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={openCreateDialog}
            >
              Create Manually
            </Button>
          </Box>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {rubrics.map((rubric) => (
            <Grid item xs={12} sm={6} lg={4} key={rubric.id}>
              <StyledCard>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Typography variant="h6" gutterBottom fontWeight="bold" noWrap sx={{ maxWidth: '70%' }}>
                      {rubric.name}
                    </Typography>
                    <Chip 
                      label={`${rubric.total_points} pts`} 
                      color="primary" 
                      size="small"
                      sx={{ fontWeight: 'bold' }}
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" paragraph sx={{ 
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {rubric.description}
                  </Typography>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Criteria ({rubric.criteria.length})
                    </Typography>
                    <Chip 
                      label={`${(rubric.strictness || 0.5) * 100}% strict`}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                  
                  <List dense disablePadding>
                    {rubric.criteria.slice(0, 3).map((criterion, index) => (
                      <ListItem key={index} disablePadding sx={{ py: 0.5 }}>
                        <ListItemText
                          primary={criterion.name}
                          secondary={`${criterion.max_points} points`}
                          primaryTypographyProps={{ variant: 'body2', fontWeight: 'medium' }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                      </ListItem>
                    ))}
                    
                    {rubric.criteria.length > 3 && (
                      <ListItem disablePadding sx={{ py: 0.5 }}>
                        <ListItemText
                          primary={`+${rubric.criteria.length - 3} more criteria`}
                          primaryTypographyProps={{ variant: 'body2', color: 'text.secondary', fontStyle: 'italic' }}
                        />
                      </ListItem>
                    )}
                  </List>
                </CardContent>
                
                <CardActions sx={{ justifyContent: 'space-between', p: 2, pt: 0 }}>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(rubric.created_at)}
                  </Typography>
                  
                  <Box>
                    <Tooltip title="View Details">
                      <IconButton 
                        size="small" 
                        color="info"
                        onClick={() => openViewDialog(rubric)}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Rubric">
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => openEditDialog(rubric)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Rubric">
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleDeleteRubric(rubric.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardActions>
              </StyledCard>
            </Grid>
          ))}
        </Grid>
      )}
      
      {/* Floating Action Button */}
      <StyledFab
        color="primary"
        aria-label="add"
        onClick={openCreateDialog}
      >
        <AddIcon />
      </StyledFab>

      {/* AI Generation Dialog */}
      <Dialog
        open={generateDialogOpen}
        onClose={() => !generating && setGenerateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(45deg, #FF6B6B, #FF8E53)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <AssistantIcon />
          Generate Rubric with AI
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3, overflowY: 'auto' }}>
          <Typography variant="body2" color="text.secondary" paragraph>
            Let our AI assistant create a detailed grading rubric based on your specific requirements and context.
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                label="Rubric Name"
                fullWidth
                value={generationParams.name}
                onChange={(e) => setGenerationParams(prev => ({ ...prev, name: e.target.value }))}
                required
                disabled={generating}
                variant="outlined"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Question Paper / Assignment Details (Optional)"
                fullWidth
                multiline
                rows={4}
                value={generationParams.question}
                onChange={(e) => setGenerationParams(prev => ({ ...prev, question: e.target.value }))}
                disabled={generating}
                variant="outlined"
                placeholder="Paste your question paper or assignment details here for more accurate rubric generation..."
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Context and Requirements"
                fullWidth
                multiline
                rows={6}
                value={generationParams.context}
                onChange={(e) => setGenerationParams(prev => ({ ...prev, context: e.target.value }))}
                required
                disabled={generating}
                variant="outlined"
                placeholder="Describe what you want to evaluate (e.g., 'Create a comprehensive rubric for a programming assignment with 100 total points that evaluates code structure, functionality, documentation, and best practices')"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => setGenerateDialogOpen(false)} 
            disabled={generating}
            size="large"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            size="large"
            startIcon={generating ? <CircularProgress size={20} /> : <CheckCircleIcon />}
            onClick={handleGenerateRubric}
            disabled={generating}
            sx={{
              background: 'linear-gradient(45deg, #FF6B6B, #FF8E53)',
              '&:hover': { background: 'linear-gradient(45deg, #FF5252, #FF7043)' }
            }}
          >
            {generating ? 'Generating...' : 'Generate Rubric'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog
        open={createDialogOpen || editDialogOpen}
        onClose={() => {
          if (!saving) {
            setCreateDialogOpen(false);
            setEditDialogOpen(false);
            setSelectedRubric(null);
            resetEditForm();
          }
        }}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { height: '90vh' } }}
      >
        <DialogTitle>
          {createDialogOpen ? 'Create New Rubric' : `Edit: ${selectedRubric?.name}`}
        </DialogTitle>
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={dialogTab} onChange={(e, newValue) => setDialogTab(newValue)}>
            <Tab label="Basic Info" />
            <Tab label="Criteria" />
            <Tab label="Review" />
          </Tabs>
        </Box>
        
        <DialogContent dividers sx={{ p: 0, overflowY: 'auto', maxHeight: '65vh' }}>
          <TabPanel value={dialogTab} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  label="Rubric Name"
                  fullWidth
                  value={editFormData.name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  disabled={saving}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Description"
                  fullWidth
                  multiline
                  rows={4}
                  value={editFormData.description}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                  required
                  disabled={saving}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Typography gutterBottom>Grading Strictness</Typography>
                <Slider
                  value={editFormData.strictness || 0.5}
                  onChange={(e, value) => setEditFormData(prev => ({ ...prev, strictness: value as number }))}
                  min={0}
                  max={1}
                  step={0.1}
                  marks={[
                    { value: 0, label: 'Lenient' },
                    { value: 0.5, label: 'Balanced' },
                    { value: 1, label: 'Strict' }
                  ]}
                  disabled={saving}
                />
              </Grid>
            </Grid>
          </TabPanel>
          
          <TabPanel value={dialogTab} index={1}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6">
                Criteria ({editFormData.criteria?.length || 0})
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddCircleOutlineIcon />}
                onClick={addCriterion}
                disabled={saving}
              >
                Add Criterion
              </Button>
            </Box>
            
            {editFormData.criteria?.map((criterion, index) => (
              <Accordion key={index} sx={{ mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box display="flex" alignItems="center" gap={2} width="100%">
                    <Typography variant="subtitle1" fontWeight="bold">
                      {criterion.name || `Criterion ${index + 1}`}
                    </Typography>
                    <Chip label={`${criterion.max_points} pts`} size="small" />
                    <Box flexGrow={1} />
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCriterion(index);
                      }}
                      disabled={saving}
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
                        value={criterion.name}
                        onChange={(e) => updateCriterion(index, 'name', e.target.value)}
                        required
                        disabled={saving}
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        label="Max Points"
                        type="number"
                        fullWidth
                        value={criterion.max_points}
                        onChange={(e) => updateCriterion(index, 'max_points', parseInt(e.target.value) || 0)}
                        required
                        disabled={saving}
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        label="Weight"
                        type="number"
                        fullWidth
                        value={criterion.weight || 1}
                        onChange={(e) => updateCriterion(index, 'weight', parseFloat(e.target.value) || 1)}
                        inputProps={{ step: 0.1 }}
                        disabled={saving}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="Description"
                        fullWidth
                        multiline
                        rows={2}
                        value={criterion.description}
                        onChange={(e) => updateCriterion(index, 'description', e.target.value)}
                        disabled={saving}
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="subtitle2">Grading Levels</Typography>
                        <Button
                          size="small"
                          onClick={() => addGradingLevel(index)}
                          disabled={saving}
                        >
                          Add Level
                        </Button>
                      </Box>
                      
                      {criterion.levels?.map((level, levelIndex) => (
                        <Grid container spacing={1} key={levelIndex} sx={{ mb: 1 }}>
                          <Grid item xs={3}>
                            <TextField
                              label="Level"
                              size="small"
                              fullWidth
                              value={level.level}
                              onChange={(e) => updateGradingLevel(index, levelIndex, 'level', e.target.value)}
                              disabled={saving}
                            />
                          </Grid>
                          <Grid item xs={2}>
                            <TextField
                              label="Points"
                              type="number"
                              size="small"
                              fullWidth
                              value={level.points}
                              onChange={(e) => updateGradingLevel(index, levelIndex, 'points', parseInt(e.target.value) || 0)}
                              disabled={saving}
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <TextField
                              label="Description"
                              size="small"
                              fullWidth
                              value={level.description}
                              onChange={(e) => updateGradingLevel(index, levelIndex, 'description', e.target.value)}
                              disabled={saving}
                            />
                          </Grid>
                          <Grid item xs={1}>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => removeGradingLevel(index, levelIndex)}
                              disabled={saving}
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
            
            {!editFormData.criteria?.length && (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>No criteria added yet</Typography>
                <Typography color="text.secondary" paragraph>
                  Add your first criterion to get started
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddCircleOutlineIcon />}
                  onClick={addCriterion}
                >
                  Add First Criterion
                </Button>
              </Paper>
            )}
          </TabPanel>
          
          <TabPanel value={dialogTab} index={2}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>Rubric Summary</Typography>
                  <Typography><strong>Name:</strong> {editFormData.name}</Typography>
                  <Typography><strong>Total Points:</strong> {getTotalPoints()}</Typography>
                  <Typography><strong>Criteria Count:</strong> {editFormData.criteria?.length || 0}</Typography>
                  <Typography><strong>Strictness:</strong> {Math.round((editFormData.strictness || 0.5) * 100)}%</Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>Point Distribution</Typography>
                  {editFormData.criteria?.map((criterion, index) => (
                    <Box key={index} display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">{criterion.name}</Typography>
                      <Typography variant="body2" fontWeight="bold">{criterion.max_points} pts</Typography>
                    </Box>
                  ))}
                </Paper>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Full Description</Typography>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography>{editFormData.description}</Typography>
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>
        </DialogContent>
        
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => {
              setCreateDialogOpen(false);
              setEditDialogOpen(false);
              setSelectedRubric(null);
              resetEditForm();
            }}
            disabled={saving}
            size="large"
          >
            Cancel
          </Button>
          
          {dialogTab > 0 && (
            <Button
              onClick={() => setDialogTab(dialogTab - 1)}
              disabled={saving}
              size="large"
            >
              Previous
            </Button>
          )}
          
          {dialogTab < 2 ? (
            <Button
              variant="outlined"
              onClick={() => setDialogTab(dialogTab + 1)}
              disabled={saving}
              size="large"
            >
              Next
            </Button>
          ) : (
            <Button
              variant="contained"
              size="large"
              startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
              onClick={createDialogOpen ? handleCreateRubric : handleUpdateRubric}
              disabled={saving || !editFormData.name || !editFormData.description}
            >
              {saving ? 'Saving...' : (createDialogOpen ? 'Create Rubric' : 'Update Rubric')}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <VisibilityIcon />
            {selectedRubric?.name}
            <Chip label={`${selectedRubric?.total_points} points`} />
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ overflowY: 'auto' }}>
          {selectedRubric && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Description</Typography>
                <Typography paragraph>{selectedRubric.description}</Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Criteria ({selectedRubric.criteria.length})
                </Typography>
                
                {selectedRubric.criteria.map((criterion, index) => (
                  <Accordion key={index}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box display="flex" alignItems="center" gap={2} width="100%">
                        <Typography variant="subtitle1" fontWeight="bold">
                          {criterion.name}
                        </Typography>
                        <Chip label={`${criterion.max_points} pts`} size="small" />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography paragraph>{criterion.description}</Typography>
                      
                      {criterion.levels && criterion.levels.length > 0 && (
                        <>
                          <Typography variant="subtitle2" gutterBottom>Grading Levels:</Typography>
                          {criterion.levels.map((level, levelIndex) => (
                            <Box key={levelIndex} sx={{ mb: 1, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                              <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Typography variant="body2" fontWeight="bold">
                                  {level.level}
                                </Typography>
                                <Typography variant="body2" fontWeight="bold">
                                  {level.points} points
                                </Typography>
                              </Box>
                              <Typography variant="body2" color="text.secondary">
                                {level.description}
                              </Typography>
                            </Box>
                          ))}
                        </>
                      )}
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Grid>
              
              <Grid item xs={12}>
                <Paper sx={{ p: 2, bgcolor: 'info.light', color: 'info.contrastText' }}>
                  <Typography variant="body2">
                    <strong>Created:</strong> {formatDate(selectedRubric.created_at)} | 
                    <strong> Updated:</strong> {formatDate(selectedRubric.updated_at)} |
                    <strong> Strictness:</strong> {Math.round((selectedRubric.strictness || 0.5) * 100)}%
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          {selectedRubric && (
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => {
                setViewDialogOpen(false);
                openEditDialog(selectedRubric);
              }}
            >
              Edit Rubric
            </Button>
          )}
        </DialogActions>
      </Dialog>
      
      {/* Notification */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setNotification(prev => ({ ...prev, open: false }))}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default RubricPage; 