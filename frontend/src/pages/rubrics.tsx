import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Fab,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Collapse,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  Assessment as RubricIcon,
  School as CourseIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  AutoAwesome as AIIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
} from '@mui/icons-material';

interface Rubric {
  id: string;
  name: string;
  description: string;
  course_id?: string;
  criteria: RubricCriteria[];
  total_points: number;
  created_at: string;
  updated_at: string;
}

interface RubricCriteria {
  name: string;
  description: string;
  max_points: number;
  weight: number;
  levels: RubricLevel[];
}

interface RubricLevel {
  level: string;
  points: number;
  description: string;
}

const RubricManagement: React.FC = () => {
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRubric, setSelectedRubric] = useState<Rubric | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuRubricId, setMenuRubricId] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Form state for new/edit rubric
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    course_id: '',
    criteria: [
      {
        name: 'Content Understanding',
        description: 'Demonstrates understanding of the core concepts',
        max_points: 25,
        weight: 1.0,
        levels: [
          { level: 'Excellent', points: 25, description: 'Exceptional understanding' },
          { level: 'Good', points: 20, description: 'Strong understanding' },
          { level: 'Satisfactory', points: 15, description: 'Adequate understanding' },
          { level: 'Needs Improvement', points: 10, description: 'Limited understanding' },
          { level: 'Unsatisfactory', points: 5, description: 'Minimal understanding' },
        ],
      },
    ] as RubricCriteria[],
  });

  // AI Generation form state
  const [aiFormData, setAiFormData] = useState({
    question: '',
    description: '',
    course_id: '',
    assignment_type: 'essay',
    point_scale: 100,
  });

  // Load rubrics on component mount
  useEffect(() => {
    loadRubrics();
  }, []);

  const loadRubrics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/rubrics');
      const data = await response.json();
      
      if (data.status === 'success') {
        setRubrics(data.rubrics);
      } else {
        setAlert({ type: 'error', message: 'Failed to load rubrics' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Network error loading rubrics' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setFormData({
      name: '',
      description: '',
      course_id: '',
      criteria: [
        {
          name: 'Content Understanding',
          description: 'Demonstrates understanding of the core concepts',
          max_points: 25,
          weight: 1.0,
          levels: [
            { level: 'Excellent', points: 25, description: 'Exceptional understanding' },
            { level: 'Good', points: 20, description: 'Strong understanding' },
            { level: 'Satisfactory', points: 15, description: 'Adequate understanding' },
            { level: 'Needs Improvement', points: 10, description: 'Limited understanding' },
            { level: 'Unsatisfactory', points: 5, description: 'Minimal understanding' },
          ],
        },
      ],
    });
    setSelectedRubric(null);
    setIsEditing(false);
    setDialogOpen(true);
  };

  const handleCreateWithAI = () => {
    setAiFormData({
      question: '',
      description: '',
      course_id: '',
      assignment_type: 'essay',
      point_scale: 100,
    });
    setAiDialogOpen(true);
  };

  const handleGenerateWithAI = async () => {
    if (!aiFormData.question.trim()) {
      setAlert({ type: 'error', message: 'Please enter a question or assignment prompt' });
      return;
    }

    setAiLoading(true);
    try {
      const response = await fetch('/api/rubrics/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(aiFormData),
      });

      const data = await response.json();

      if (data.status === 'success') {
        setFormData({
          name: data.rubric.name,
          description: data.rubric.description,
          course_id: aiFormData.course_id,
          criteria: data.rubric.criteria,
        });
        setAiDialogOpen(false);
        setDialogOpen(true);
        setAlert({ type: 'success', message: 'Rubric generated successfully! You can now review and edit it.' });
      } else {
        setAlert({ type: 'error', message: data.message || 'Failed to generate rubric' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Network error generating rubric' });
    } finally {
      setAiLoading(false);
    }
  };

  const handleEdit = (rubric: Rubric) => {
    setFormData({
      name: rubric.name,
      description: rubric.description,
      course_id: rubric.course_id || '',
      criteria: rubric.criteria,
    });
    setSelectedRubric(rubric);
    setIsEditing(true);
    setDialogOpen(true);
    setAnchorEl(null);
  };

  const handleDelete = async (rubricId: string) => {
    if (!confirm('Are you sure you want to delete this rubric?')) return;

    try {
      const response = await fetch(`/api/rubrics/${rubricId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.status === 'success') {
        setAlert({ type: 'success', message: 'Rubric deleted successfully' });
        loadRubrics();
      } else {
        setAlert({ type: 'error', message: 'Failed to delete rubric' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Network error deleting rubric' });
    }
    setAnchorEl(null);
  };

  const handleSave = async () => {
    try {
      const url = isEditing ? `/api/rubrics/${selectedRubric?.id}` : '/api/rubrics';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.status === 'success') {
        setAlert({ 
          type: 'success', 
          message: `Rubric ${isEditing ? 'updated' : 'created'} successfully` 
        });
        setDialogOpen(false);
        loadRubrics();
      } else {
        setAlert({ type: 'error', message: data.message || 'Failed to save rubric' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Network error saving rubric' });
    }
  };

  const addCriterion = () => {
    setFormData(prev => ({
      ...prev,
      criteria: [
        ...prev.criteria,
        {
          name: 'New Criterion',
          description: 'Description for new criterion',
          max_points: 25,
          weight: 1.0,
          levels: [
            { level: 'Excellent', points: 25, description: 'Excellent performance' },
            { level: 'Good', points: 20, description: 'Good performance' },
            { level: 'Satisfactory', points: 15, description: 'Satisfactory performance' },
            { level: 'Needs Improvement', points: 10, description: 'Needs improvement' },
            { level: 'Unsatisfactory', points: 5, description: 'Unsatisfactory performance' },
          ],
        },
      ],
    }));
  };

  const removeCriterion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      criteria: prev.criteria.filter((_, i) => i !== index),
    }));
  };

  const updateCriterion = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      criteria: prev.criteria.map((criterion, i) => 
        i === index ? { ...criterion, [field]: value } : criterion
      ),
    }));
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, rubricId: string) => {
    setAnchorEl(event.currentTarget);
    setMenuRubricId(rubricId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuRubricId(null);
  };

  const toggleCardExpansion = (rubricId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rubricId)) {
        newSet.delete(rubricId);
      } else {
        newSet.add(rubricId);
      }
      return newSet;
    });
  };

  const calculateTotalPoints = (criteria: RubricCriteria[]) => {
    return criteria.reduce((total, criterion) => total + criterion.max_points, 0);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        {/* Header content removed */}
      </Box>

      {/* Alert */}
      {alert && (
        <Alert 
          severity={alert.type} 
          sx={{ mb: 3 }}
          onClose={() => setAlert(null)}
        >
          {alert.message}
        </Alert>
      )}

      {/* Action Buttons */}
      <Box sx={{ mb: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateNew}
          size="large"
        >
          Create Rubric
        </Button>
        <Button
          variant="outlined"
          startIcon={<AIIcon />}
          onClick={handleCreateWithAI}
          size="large"
          sx={{
            borderColor: 'primary.main',
            color: 'primary.main',
            '&:hover': {
              borderColor: 'primary.dark',
              backgroundColor: 'primary.main',
              color: 'white',
            },
          }}
        >
          Generate with AI
        </Button>
      </Box>

      {/* Rubrics Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <Typography>Loading rubrics...</Typography>
        </Box>
      ) : rubrics.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', bgcolor: 'grey.50' }}>
          <RubricIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No rubrics found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create your first rubric manually or use AI to generate one automatically
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateNew}>
              Create Rubric
            </Button>
            <Button variant="outlined" startIcon={<AIIcon />} onClick={handleCreateWithAI}>
              Generate with AI
            </Button>
          </Box>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {rubrics.map((rubric) => (
            <Grid item xs={12} md={6} lg={4} key={rubric.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" component="h3" fontWeight={600}>
                      {rubric.name}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, rubric.id)}
                    >
                      <MoreIcon />
                    </IconButton>
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {rubric.description}
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    {rubric.course_id && (
                      <Chip
                        icon={<CourseIcon />}
                        label={rubric.course_id}
                        size="small"
                        variant="outlined"
                      />
                    )}
                    <Chip
                      label={`${rubric.criteria.length} criteria`}
                      size="small"
                      color="primary"
                    />
                    <Chip
                      label={`${calculateTotalPoints(rubric.criteria)} points`}
                      size="small"
                      color="secondary"
                    />
                  </Box>

                  <Collapse in={expandedCards.has(rubric.id)}>
                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'grey.200' }}>
                      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                        Criteria:
                      </Typography>
                      <List dense>
                        {rubric.criteria.map((criterion, index) => (
                          <ListItem key={index} sx={{ px: 0, py: 0.5 }}>
                            <ListItemText
                              primary={criterion.name}
                              secondary={`${criterion.max_points} points`}
                              primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                              secondaryTypographyProps={{ variant: 'caption' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  </Collapse>
                </CardContent>

                <CardActions sx={{ px: 2, pb: 2 }}>
                  <Button
                    size="small"
                    startIcon={expandedCards.has(rubric.id) ? <CollapseIcon /> : <ExpandIcon />}
                    onClick={() => toggleCardExpansion(rubric.id)}
                  >
                    {expandedCards.has(rubric.id) ? 'Less' : 'Details'}
                  </Button>
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => handleEdit(rubric)}
                  >
                    Edit
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          const rubric = rubrics.find(r => r.id === menuRubricId);
          if (rubric) handleEdit(rubric);
        }}>
          <EditIcon sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={() => {
          if (menuRubricId) handleDelete(menuRubricId);
        }} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* AI Generation Dialog */}
      <Dialog open={aiDialogOpen} onClose={() => setAiDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AIIcon color="primary" />
          Generate Rubric with AI
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Provide the assignment question and description to generate a comprehensive rubric automatically.
          </Typography>
          
          <TextField
            fullWidth
            label="Assignment Question/Prompt"
            multiline
            rows={3}
            value={aiFormData.question}
            onChange={(e) => setAiFormData(prev => ({ ...prev, question: e.target.value }))}
            sx={{ mb: 3 }}
            placeholder="Enter the main question or prompt for the assignment..."
          />

          <TextField
            fullWidth
            label="Assignment Description"
            multiline
            rows={4}
            value={aiFormData.description}
            onChange={(e) => setAiFormData(prev => ({ ...prev, description: e.target.value }))}
            sx={{ mb: 3 }}
            placeholder="Provide additional context about the assignment, learning objectives, requirements..."
          />

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Course ID (Optional)"
                value={aiFormData.course_id}
                onChange={(e) => setAiFormData(prev => ({ ...prev, course_id: e.target.value }))}
                placeholder="e.g., CS101, MATH200"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Assignment Type"
                value={aiFormData.assignment_type}
                onChange={(e) => setAiFormData(prev => ({ ...prev, assignment_type: e.target.value }))}
                SelectProps={{ native: true }}
              >
                <option value="essay">Essay</option>
                <option value="project">Project</option>
                <option value="presentation">Presentation</option>
                <option value="lab">Lab Report</option>
                <option value="homework">Homework</option>
                <option value="quiz">Quiz/Exam</option>
                <option value="other">Other</option>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setAiDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleGenerateWithAI}
            disabled={aiLoading || !aiFormData.question.trim()}
            startIcon={<AIIcon />}
          >
            {aiLoading ? 'Generating...' : 'Generate Rubric'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {isEditing ? 'Edit Rubric' : 'Create New Rubric'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            {/* Basic Info */}
            <TextField
              label="Rubric Name"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />

            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />

            <TextField
              label="Course ID (Optional)"
              fullWidth
              value={formData.course_id}
              onChange={(e) => setFormData(prev => ({ ...prev, course_id: e.target.value }))}
              helperText="Associate this rubric with a specific course"
            />

            <Divider />

            {/* Criteria */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Grading Criteria</Typography>
                <Button startIcon={<AddIcon />} onClick={addCriterion}>
                  Add Criterion
                </Button>
              </Box>

              {formData.criteria.map((criterion, index) => (
                <Paper key={index} sx={{ p: 3, mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1">
                      Criterion {index + 1}
                    </Typography>
                    {formData.criteria.length > 1 && (
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => removeCriterion(index)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Criterion Name"
                        fullWidth
                        value={criterion.name}
                        onChange={(e) => updateCriterion(index, 'name', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        label="Max Points"
                        type="number"
                        fullWidth
                        value={criterion.max_points}
                        onChange={(e) => updateCriterion(index, 'max_points', parseInt(e.target.value) || 0)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        label="Weight"
                        type="number"
                        fullWidth
                        value={criterion.weight}
                        onChange={(e) => updateCriterion(index, 'weight', parseFloat(e.target.value) || 1.0)}
                        inputProps={{ step: 0.1, min: 0.1 }}
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
                      />
                    </Grid>
                  </Grid>

                  {/* Performance Levels */}
                  <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                    Performance Levels
                  </Typography>
                  {criterion.levels.map((level, levelIndex) => (
                    <Box key={levelIndex} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <TextField
                        label="Level"
                        size="small"
                        value={level.level}
                        onChange={(e) => {
                          const newLevels = [...criterion.levels];
                          newLevels[levelIndex] = { ...level, level: e.target.value };
                          updateCriterion(index, 'levels', newLevels);
                        }}
                        sx={{ minWidth: 120 }}
                      />
                      <TextField
                        label="Points"
                        type="number"
                        size="small"
                        value={level.points}
                        onChange={(e) => {
                          const newLevels = [...criterion.levels];
                          newLevels[levelIndex] = { ...level, points: parseInt(e.target.value) || 0 };
                          updateCriterion(index, 'levels', newLevels);
                        }}
                        sx={{ width: 80 }}
                      />
                      <TextField
                        label="Description"
                        size="small"
                        value={level.description}
                        onChange={(e) => {
                          const newLevels = [...criterion.levels];
                          newLevels[levelIndex] = { ...level, description: e.target.value };
                          updateCriterion(index, 'levels', newLevels);
                        }}
                        fullWidth
                      />
                    </Box>
                  ))}
                </Paper>
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} startIcon={<CancelIcon />}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            startIcon={<SaveIcon />}
            disabled={!formData.name}
          >
            {isEditing ? 'Update' : 'Create'} Rubric
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add rubric"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={handleCreateNew}
      >
        <AddIcon />
      </Fab>
    </Container>
  );
};

export default RubricManagement; 