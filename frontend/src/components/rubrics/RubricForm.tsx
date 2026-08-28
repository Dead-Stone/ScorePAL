/**
 * RubricForm - Form component for creating/editing rubrics with AI generation
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Paper,
  IconButton,
  Alert,
  Divider,
  CircularProgress,
  Chip,
  Collapse,
  Tooltip,
  Slider,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import apiClient from '@/utils/apiClient';
import { extractErrorMessage } from '@/utils/errorUtils';

interface GradingCriteria {
  name: string;
  description: string;
  max_points: number;
  weight?: number;
  levels?: { name: string; points: number; description: string }[];
}

interface RubricFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (formData: any) => void;
  editingRubric?: any;
  questionText?: string;  // Optional question text to use for rubric generation
}

const RUBRIC_TEMPLATES = [
  { id: 'essay', name: 'Essay/Paper', description: 'Content, organization, grammar, citations' },
  { id: 'programming', name: 'Programming Assignment', description: 'Functionality, code quality, documentation' },
  { id: 'presentation', name: 'Presentation', description: 'Content, delivery, visuals, engagement' },
  { id: 'lab_report', name: 'Lab Report', description: 'Methodology, analysis, conclusions' },
  { id: 'project', name: 'Group Project', description: 'Collaboration, deliverables, innovation' },
  { id: 'custom', name: 'Custom', description: 'Describe your own assignment type' },
];

export const RubricForm: React.FC<RubricFormProps> = ({
  open,
  onClose,
  onSave,
  editingRubric,
  questionText,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    criteria: [] as GradingCriteria[],
    strictness: 0.5,
  });
  
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiConfig, setAiConfig] = useState({
    assignmentType: 'essay',
    customDescription: '',
    totalPoints: 100,
    criteriaCount: 5,
    includeDetailedLevels: true,
  });
  const [expandedCriteria, setExpandedCriteria] = useState<number[]>([]);

  React.useEffect(() => {
    if (editingRubric) {
      setFormData({
        name: editingRubric.name,
        description: editingRubric.description || '',
        criteria: editingRubric.criteria,
        strictness: editingRubric.strictness || 0.5,
      });
      setShowAiPanel(false);
    } else {
      setFormData({
        name: '',
        description: '',
        criteria: [],
        strictness: 0.5,
      });
      setShowAiPanel(true);
    }
  }, [editingRubric, open]);

  const generateRubricWithAI = async () => {
    setAiGenerating(true);
    setAiError(null);
    
    try {
      const template = RUBRIC_TEMPLATES.find(t => t.id === aiConfig.assignmentType);
      const prompt = aiConfig.assignmentType === 'custom' 
        ? aiConfig.customDescription 
        : `${template?.name}: ${template?.description}`;
      
      const response = await apiClient.post('/api/rubrics/generate', {
        assignment_type: aiConfig.assignmentType,
        description: prompt,
        total_points: aiConfig.totalPoints,
        criteria_count: aiConfig.criteriaCount,
        include_levels: aiConfig.includeDetailedLevels,
        question: questionText || undefined,  // Include question text if available
      });
      
      if (response.data?.rubric) {
        const generatedRubric = response.data.rubric;
        setFormData({
          name: generatedRubric.name || `${template?.name} Rubric`,
          description: generatedRubric.description || prompt,
          criteria: generatedRubric.criteria || [],
          strictness: 0.5,
        });
        setShowAiPanel(false);
      }
    } catch (err: any) {
      console.error('AI rubric generation error:', err);
      setAiError(extractErrorMessage(err, 'Failed to generate rubric. Please try again.'));
      
      // Generate a fallback rubric based on template
      generateFallbackRubric();
    } finally {
      setAiGenerating(false);
    }
  };

  const generateFallbackRubric = () => {
    const template = RUBRIC_TEMPLATES.find(t => t.id === aiConfig.assignmentType);
    const pointsPerCriteria = Math.floor(aiConfig.totalPoints / aiConfig.criteriaCount);
    
    let criteria: GradingCriteria[] = [];
    
    switch (aiConfig.assignmentType) {
      case 'essay':
        criteria = [
          { name: 'Thesis & Argument', description: 'Clear thesis with well-developed supporting arguments', max_points: pointsPerCriteria },
          { name: 'Content & Analysis', description: 'Depth of analysis and use of evidence', max_points: pointsPerCriteria },
          { name: 'Organization', description: 'Logical flow and paragraph structure', max_points: pointsPerCriteria },
          { name: 'Writing Quality', description: 'Grammar, spelling, and style', max_points: pointsPerCriteria },
          { name: 'Citations & Sources', description: 'Proper use of sources and citation format', max_points: pointsPerCriteria },
        ];
        break;
      case 'programming':
        criteria = [
          { name: 'Functionality', description: 'Program works correctly and meets requirements', max_points: pointsPerCriteria },
          { name: 'Code Quality', description: 'Clean, readable, and well-organized code', max_points: pointsPerCriteria },
          { name: 'Efficiency', description: 'Optimal algorithms and resource usage', max_points: pointsPerCriteria },
          { name: 'Documentation', description: 'Comments, README, and code documentation', max_points: pointsPerCriteria },
          { name: 'Testing', description: 'Test coverage and edge case handling', max_points: pointsPerCriteria },
        ];
        break;
      case 'presentation':
        criteria = [
          { name: 'Content Knowledge', description: 'Demonstrates understanding of the topic', max_points: pointsPerCriteria },
          { name: 'Organization', description: 'Clear structure with introduction, body, and conclusion', max_points: pointsPerCriteria },
          { name: 'Delivery', description: 'Speaking skills, pace, and engagement', max_points: pointsPerCriteria },
          { name: 'Visual Aids', description: 'Quality and effectiveness of slides/visuals', max_points: pointsPerCriteria },
          { name: 'Q&A Handling', description: 'Ability to answer questions and discuss topic', max_points: pointsPerCriteria },
        ];
        break;
      case 'lab_report':
        criteria = [
          { name: 'Introduction & Hypothesis', description: 'Clear purpose and testable hypothesis', max_points: pointsPerCriteria },
          { name: 'Methodology', description: 'Detailed and reproducible procedures', max_points: pointsPerCriteria },
          { name: 'Data & Analysis', description: 'Accurate data collection and analysis', max_points: pointsPerCriteria },
          { name: 'Results & Discussion', description: 'Interpretation and scientific reasoning', max_points: pointsPerCriteria },
          { name: 'Conclusion', description: 'Summary of findings and future directions', max_points: pointsPerCriteria },
        ];
        break;
      case 'project':
        criteria = [
          { name: 'Project Planning', description: 'Clear goals, timeline, and milestones', max_points: pointsPerCriteria },
          { name: 'Deliverables', description: 'Quality and completeness of work products', max_points: pointsPerCriteria },
          { name: 'Innovation', description: 'Creativity and problem-solving approach', max_points: pointsPerCriteria },
          { name: 'Collaboration', description: 'Team communication and coordination', max_points: pointsPerCriteria },
          { name: 'Presentation', description: 'Final presentation and documentation', max_points: pointsPerCriteria },
        ];
        break;
      default:
        criteria = Array.from({ length: aiConfig.criteriaCount }, (_, i) => ({
          name: `Criterion ${i + 1}`,
          description: 'Add description for this criterion',
          max_points: pointsPerCriteria,
        }));
    }
    
    // Add levels if requested
    if (aiConfig.includeDetailedLevels) {
      criteria = criteria.map(c => ({
        ...c,
        levels: [
          { name: 'Excellent', points: c.max_points, description: 'Exceeds expectations' },
          { name: 'Good', points: Math.round(c.max_points * 0.8), description: 'Meets expectations' },
          { name: 'Satisfactory', points: Math.round(c.max_points * 0.6), description: 'Basic requirements met' },
          { name: 'Needs Improvement', points: Math.round(c.max_points * 0.4), description: 'Below expectations' },
          { name: 'Unsatisfactory', points: 0, description: 'Does not meet requirements' },
        ],
      }));
    }
    
    setFormData({
      name: `${template?.name || 'Custom'} Rubric`,
      description: template?.description || aiConfig.customDescription,
      criteria: criteria.slice(0, aiConfig.criteriaCount),
      strictness: 0.5,
    });
    setShowAiPanel(false);
  };

  const addCriterion = () => {
    setFormData({
      ...formData,
      criteria: [
        ...formData.criteria,
        {
          name: '',
          description: '',
          max_points: 10,
          weight: 1.0,
        },
      ],
    });
  };

  const updateCriterion = (index: number, field: string, value: any) => {
    const updated = [...formData.criteria];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, criteria: updated });
  };

  const removeCriterion = (index: number) => {
    setFormData({
      ...formData,
      criteria: formData.criteria.filter((_, i) => i !== index),
    });
  };

  const toggleCriteriaExpand = (index: number) => {
    setExpandedCriteria(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const duplicateCriterion = (index: number) => {
    const criterionToCopy = { ...formData.criteria[index], name: `${formData.criteria[index].name} (Copy)` };
    const updated = [...formData.criteria];
    updated.splice(index + 1, 0, criterionToCopy);
    setFormData({ ...formData, criteria: updated });
  };

  const totalPoints = formData.criteria.reduce((sum, c) => sum + c.max_points, 0);

  const handleSave = () => {
    if (!formData.name || formData.criteria.length === 0) {
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {editingRubric ? 'Edit Rubric' : 'Create New Rubric'}
          </Typography>
          {!editingRubric && (
            <Button
              variant={showAiPanel ? "contained" : "outlined"}
              size="small"
              startIcon={<AutoAwesomeIcon />}
              onClick={() => setShowAiPanel(!showAiPanel)}
              sx={{ borderRadius: 2 }}
            >
              AI Generate
            </Button>
          )}
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {/* AI Generation Panel */}
        <Collapse in={showAiPanel && !editingRubric}>
          <Paper 
            sx={{ 
              p: 3, 
              mb: 3, 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: 2,
            }}
          >
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <AutoAwesomeIcon />
              <Typography variant="h6">AI Rubric Generator</Typography>
            </Box>
            
            <Typography variant="body2" sx={{ mb: 3, opacity: 0.9 }}>
              Let AI create a professional rubric based on your assignment type
              {questionText && (
                <Chip 
                  label="Using question text" 
                  size="small" 
                  sx={{ 
                    ml: 1, 
                    bgcolor: 'rgba(255,255,255,0.3)', 
                    color: 'white',
                    fontSize: '0.7rem',
                    height: 20
                  }} 
                />
              )}
            </Typography>
            
            <Box display="flex" flexWrap="wrap" gap={1} mb={3}>
              {RUBRIC_TEMPLATES.map(template => (
                <Chip
                  key={template.id}
                  label={template.name}
                  onClick={() => setAiConfig({ ...aiConfig, assignmentType: template.id })}
                  color={aiConfig.assignmentType === template.id ? 'secondary' : 'default'}
                  sx={{ 
                    bgcolor: aiConfig.assignmentType === template.id ? 'white' : 'rgba(255,255,255,0.2)',
                    color: aiConfig.assignmentType === template.id ? '#764ba2' : 'white',
                    '&:hover': { bgcolor: aiConfig.assignmentType === template.id ? 'white' : 'rgba(255,255,255,0.3)' },
                  }}
                />
              ))}
            </Box>
            
            {aiConfig.assignmentType === 'custom' && (
              <TextField
                fullWidth
                multiline
                rows={2}
                placeholder="Describe your assignment type and requirements..."
                value={aiConfig.customDescription}
                onChange={(e) => setAiConfig({ ...aiConfig, customDescription: e.target.value })}
                sx={{ 
                  mb: 2,
                  '& .MuiOutlinedInput-root': { 
                    bgcolor: 'rgba(255,255,255,0.9)', 
                    borderRadius: 1,
                  }
                }}
              />
            )}
            
            <Box display="flex" gap={2} flexWrap="wrap" mb={2}>
              <Box flex={1} minWidth={150}>
                <Typography variant="body2" sx={{ mb: 1, opacity: 0.9 }}>Total Points</Typography>
                <TextField
                  type="number"
                  size="small"
                  value={aiConfig.totalPoints}
                  onChange={(e) => setAiConfig({ ...aiConfig, totalPoints: parseInt(e.target.value) || 100 })}
                  inputProps={{ min: 10, max: 1000 }}
                  sx={{ 
                    width: '100%',
                    '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.9)', borderRadius: 1 }
                  }}
                />
              </Box>
              <Box flex={1} minWidth={150}>
                <Typography variant="body2" sx={{ mb: 1, opacity: 0.9 }}>Criteria Count</Typography>
                <TextField
                  type="number"
                  size="small"
                  value={aiConfig.criteriaCount}
                  onChange={(e) => setAiConfig({ ...aiConfig, criteriaCount: parseInt(e.target.value) || 5 })}
                  inputProps={{ min: 2, max: 10 }}
                  sx={{ 
                    width: '100%',
                    '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.9)', borderRadius: 1 }
                  }}
                />
              </Box>
            </Box>
            
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <Chip
                label="Include Performance Levels"
                onClick={() => setAiConfig({ ...aiConfig, includeDetailedLevels: !aiConfig.includeDetailedLevels })}
                color={aiConfig.includeDetailedLevels ? 'secondary' : 'default'}
                sx={{ 
                  bgcolor: aiConfig.includeDetailedLevels ? 'white' : 'rgba(255,255,255,0.2)',
                  color: aiConfig.includeDetailedLevels ? '#764ba2' : 'white',
                }}
              />
            </Box>
            
            {aiError && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {aiError} Using template instead.
              </Alert>
            )}
            
            <Button
              fullWidth
              variant="contained"
              onClick={generateRubricWithAI}
              disabled={aiGenerating || (aiConfig.assignmentType === 'custom' && !aiConfig.customDescription)}
              sx={{ 
                bgcolor: 'white', 
                color: '#764ba2',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
                py: 1.5,
              }}
              startIcon={aiGenerating ? <CircularProgress size={20} /> : <AutoAwesomeIcon />}
            >
              {aiGenerating ? 'Generating...' : 'Generate Rubric'}
            </Button>
          </Paper>
        </Collapse>

        {/* Standard Form */}
        <TextField
          fullWidth
          label="Rubric Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          margin="normal"
          required
          placeholder="e.g., CS101 Final Project Rubric"
        />
        <TextField
          fullWidth
          label="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          margin="normal"
          multiline
          rows={2}
          placeholder="Describe when to use this rubric..."
        />
        
        <Box sx={{ mt: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>Grading Strictness</Typography>
          <Slider
            value={formData.strictness}
            onChange={(_, value) => setFormData({ ...formData, strictness: value as number })}
            min={0}
            max={1}
            step={0.1}
            marks={[
              { value: 0, label: 'Lenient' },
              { value: 0.5, label: 'Moderate' },
              { value: 1, label: 'Strict' },
            ]}
            valueLabelDisplay="auto"
            valueLabelFormat={(v) => `${Math.round(v * 100)}%`}
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h6">Criteria</Typography>
            <Typography variant="caption" color="text.secondary">
              {formData.criteria.length} criteria • {totalPoints} total points
            </Typography>
          </Box>
          <Button startIcon={<AddIcon />} onClick={addCriterion} variant="outlined" size="small">
            Add Criterion
          </Button>
        </Box>

        {formData.criteria.length === 0 && (
          <Paper 
            sx={{ 
              p: 4, 
              textAlign: 'center', 
              bgcolor: 'grey.50',
              border: '2px dashed',
              borderColor: 'grey.300',
            }}
          >
            <Typography color="text.secondary" gutterBottom>
              No criteria added yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Use AI to generate criteria or add them manually
            </Typography>
            <Button 
              startIcon={<AutoAwesomeIcon />} 
              onClick={() => setShowAiPanel(true)}
              variant="contained"
              size="small"
            >
              Generate with AI
            </Button>
          </Paper>
        )}

        {formData.criteria.map((criterion, index) => (
          <Paper 
            key={index} 
            sx={{ 
              p: 2, 
              mb: 2, 
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Box display="flex" alignItems="center" gap={1}>
                <Chip 
                  label={`${criterion.max_points} pts`} 
                  size="small" 
                  color="primary"
                  variant="outlined"
                />
                <Typography variant="subtitle2">
                  {criterion.name || `Criterion ${index + 1}`}
                </Typography>
              </Box>
              <Box>
                <Tooltip title="Duplicate">
                  <IconButton size="small" onClick={() => duplicateCriterion(index)}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={expandedCriteria.includes(index) ? "Collapse" : "Expand"}>
                  <IconButton size="small" onClick={() => toggleCriteriaExpand(index)}>
                    {expandedCriteria.includes(index) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton size="small" color="error" onClick={() => removeCriterion(index)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            
            <TextField
              fullWidth
              label="Criterion Name"
              value={criterion.name}
              onChange={(e) => updateCriterion(index, 'name', e.target.value)}
              margin="dense"
              size="small"
              required
            />
            
            <Collapse in={expandedCriteria.includes(index) || !criterion.name}>
              <TextField
                fullWidth
                label="Description"
                value={criterion.description}
                onChange={(e) => updateCriterion(index, 'description', e.target.value)}
                margin="dense"
                size="small"
                multiline
                rows={2}
              />
              <Box display="flex" gap={2} mt={1}>
                <TextField
                  type="number"
                  label="Max Points"
                  value={criterion.max_points}
                  onChange={(e) => updateCriterion(index, 'max_points', parseFloat(e.target.value) || 0)}
                  margin="dense"
                  size="small"
                  required
                  inputProps={{ min: 0, step: 0.5 }}
                  sx={{ width: 120 }}
                />
                <TextField
                  type="number"
                  label="Weight"
                  value={criterion.weight || 1.0}
                  onChange={(e) => updateCriterion(index, 'weight', parseFloat(e.target.value) || 1.0)}
                  margin="dense"
                  size="small"
                  inputProps={{ min: 0.1, max: 5, step: 0.1 }}
                  sx={{ width: 100 }}
                />
              </Box>
              
              {criterion.levels && criterion.levels.length > 0 && (
                <Box mt={2}>
                  <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                    Performance Levels
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={1}>
                    {criterion.levels.map((level, li) => (
                      <Chip
                        key={li}
                        label={`${level.name}: ${level.points}pts`}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Collapse>
          </Paper>
        ))}

        {formData.criteria.length > 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <span>Total Points: <strong>{totalPoints}</strong></span>
              <span>{formData.criteria.length} criteria</span>
            </Box>
          </Alert>
        )}
      </DialogContent>
      
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!formData.name || formData.criteria.length === 0}
        >
          {editingRubric ? 'Update Rubric' : 'Create Rubric'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
