/**
 * RubricForm - Form component for creating/editing rubrics
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 */

import React from 'react';
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
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

interface GradingCriteria {
  name: string;
  description: string;
  max_points: number;
  weight?: number;
  levels?: any[];
}

interface RubricFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (formData: any) => void;
  editingRubric?: any;
}

export const RubricForm: React.FC<RubricFormProps> = ({
  open,
  onClose,
  onSave,
  editingRubric,
}) => {
  const [formData, setFormData] = React.useState({
    name: '',
    description: '',
    criteria: [] as GradingCriteria[],
    strictness: 0.5,
  });

  React.useEffect(() => {
    if (editingRubric) {
      setFormData({
        name: editingRubric.name,
        description: editingRubric.description || '',
        criteria: editingRubric.criteria,
        strictness: editingRubric.strictness || 0.5,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        criteria: [],
        strictness: 0.5,
      });
    }
  }, [editingRubric, open]);

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

  const totalPoints = formData.criteria.reduce((sum, c) => sum + c.max_points, 0);

  const handleSave = () => {
    if (!formData.name || formData.criteria.length === 0) {
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{editingRubric ? 'Edit Rubric' : 'Create New Rubric'}</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          label="Rubric Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          margin="normal"
          required
        />
        <TextField
          fullWidth
          label="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          margin="normal"
          multiline
          rows={2}
        />
        <FormControl fullWidth margin="normal">
          <InputLabel>Strictness</InputLabel>
          <Select
            value={formData.strictness}
            onChange={(e) => setFormData({ ...formData, strictness: e.target.value as number })}
            label="Strictness"
          >
            <MenuItem value={0.1}>Very Lenient (0.1)</MenuItem>
            <MenuItem value={0.3}>Lenient (0.3)</MenuItem>
            <MenuItem value={0.5}>Moderate (0.5)</MenuItem>
            <MenuItem value={0.7}>Strict (0.7)</MenuItem>
            <MenuItem value={1.0}>Very Strict (1.0)</MenuItem>
          </Select>
        </FormControl>

        <Divider sx={{ my: 2 }} />

        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Criteria</Typography>
          <Button startIcon={<AddIcon />} onClick={addCriterion} size="small">
            Add Criterion
          </Button>
        </Box>

        {formData.criteria.map((criterion, index) => (
          <Paper key={index} sx={{ p: 2, mb: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
              <Typography variant="subtitle2">Criterion {index + 1}</Typography>
              <IconButton
                size="small"
                color="error"
                onClick={() => removeCriterion(index)}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
            <TextField
              fullWidth
              label="Criterion Name"
              value={criterion.name}
              onChange={(e) => updateCriterion(index, 'name', e.target.value)}
              margin="dense"
              required
            />
            <TextField
              fullWidth
              label="Description"
              value={criterion.description}
              onChange={(e) => updateCriterion(index, 'description', e.target.value)}
              margin="dense"
              multiline
              rows={2}
            />
            <TextField
              fullWidth
              type="number"
              label="Max Points"
              value={criterion.max_points}
              onChange={(e) => updateCriterion(index, 'max_points', parseFloat(e.target.value) || 0)}
              margin="dense"
              required
              inputProps={{ min: 0, step: 0.5 }}
            />
          </Paper>
        ))}

        {formData.criteria.length > 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Total Points: <strong>{totalPoints}</strong>
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!formData.name || formData.criteria.length === 0}
        >
          {editingRubric ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

