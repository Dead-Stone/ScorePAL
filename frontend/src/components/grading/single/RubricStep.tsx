/**
 * Rubric Selection/Generation Step Component
 */

import React from 'react';
import {
  Box,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Grid,
  TextField,
  Button,
  Card,
  CardContent,
  Typography,
  Chip,
  List,
  ListItem,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  AutoAwesome as AutoAwesomeIcon,
  Save as SaveIcon,
} from '@mui/icons-material';

interface RubricStepProps {
  rubricMode: 'select' | 'generate';
  rubricId: string;
  rubrics: any[];
  loadingRubrics: boolean;
  questionPaper: File | null;
  rubricNotes: string;
  totalPoints: string;
  generatedRubric: any;
  isGeneratingRubric: boolean;
  error: string;
  onRubricModeChange: (mode: 'select' | 'generate') => void;
  onRubricIdChange: (id: string) => void;
  onRubricNotesChange: (notes: string) => void;
  onTotalPointsChange: (points: string) => void;
  onGenerateRubric: () => void;
  onSaveGeneratedRubric: () => void;
  onUseGeneratedRubric: () => void;
  onBack: () => void;
  onNext: () => void;
}

export const RubricStep: React.FC<RubricStepProps> = ({
  rubricMode,
  rubricId,
  rubrics,
  loadingRubrics,
  questionPaper,
  rubricNotes,
  totalPoints,
  generatedRubric,
  isGeneratingRubric,
  error,
  onRubricModeChange,
  onRubricIdChange,
  onRubricNotesChange,
  onTotalPointsChange,
  onGenerateRubric,
  onSaveGeneratedRubric,
  onUseGeneratedRubric,
  onBack,
  onNext,
}) => {
  return (
    <>
      <Tabs 
        value={rubricMode} 
        onChange={(e, newValue) => onRubricModeChange(newValue)}
        sx={{ mb: 3 }}
      >
        <Tab label="Select Existing" value="select" />
        <Tab label="Generate AI Rubric" value="generate" icon={<AutoAwesomeIcon />} iconPosition="start" />
      </Tabs>

      {rubricMode === 'select' ? (
        <FormControl fullWidth margin="normal">
          <InputLabel>Rubric</InputLabel>
          <Select
            value={rubricId}
            onChange={(e) => onRubricIdChange(e.target.value)}
            label="Rubric"
            disabled={loadingRubrics}
          >
            <MenuItem value="">Select a rubric</MenuItem>
            {rubrics.map((rubric) => (
              <MenuItem key={rubric.id} value={rubric.id}>
                {rubric.name} ({rubric.total_points} points)
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : (
        <>
          <Alert severity="info" sx={{ mb: 2 }}>
            Generate an AI-powered rubric based on your question paper and additional notes.
          </Alert>
          
          {!questionPaper && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Please upload a question paper in Step 1 to generate a rubric.
            </Alert>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Total Points"
                type="number"
                fullWidth
                value={totalPoints}
                onChange={(e) => onTotalPointsChange(e.target.value)}
                margin="normal"
                inputProps={{ min: 1, max: 1000 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Additional Notes / Context (Optional)"
                fullWidth
                multiline
                rows={4}
                value={rubricNotes}
                onChange={(e) => onRubricNotesChange(e.target.value)}
                margin="normal"
                placeholder="Add any specific requirements, grading criteria, or context for the rubric..."
                helperText="Provide additional context to help the AI generate a more accurate rubric"
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              onClick={onGenerateRubric}
              disabled={!questionPaper || isGeneratingRubric}
              startIcon={isGeneratingRubric ? <CircularProgress size={20} /> : <AutoAwesomeIcon />}
            >
              {isGeneratingRubric ? 'Generating...' : 'Generate Rubric'}
            </Button>
          </Box>

          {generatedRubric && (
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    Generated Rubric
                  </Typography>
                  <Chip 
                    label={`${generatedRubric.total_points || totalPoints} points`} 
                    color="primary" 
                  />
                </Box>
                
                <List>
                  {generatedRubric.criteria?.map((criterion: any, index: number) => (
                    <ListItem key={index} sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                      <Box display="flex" justifyContent="space-between" width="100%" mb={1}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {criterion.name}
                        </Typography>
                        <Chip 
                          label={`${criterion.max_points} pts`} 
                          size="small" 
                          color="primary"
                        />
                      </Box>
                      {criterion.description && (
                        <Typography variant="body2" color="text.secondary">
                          {criterion.description}
                        </Typography>
                      )}
                      {index < generatedRubric.criteria.length - 1 && <Divider sx={{ width: '100%', mt: 1 }} />}
                    </ListItem>
                  ))}
                </List>

                <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<SaveIcon />}
                    onClick={onSaveGeneratedRubric}
                  >
                    Save Rubric
                  </Button>
                  <Button
                    variant="contained"
                    onClick={onUseGeneratedRubric}
                  >
                    Use This Rubric
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}
        </>
      )}
      
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      
      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button onClick={onBack}>Back</Button>
        <Button 
          onClick={onNext} 
          variant="contained"
          disabled={
            (rubricMode === 'select' && !rubricId) || 
            (rubricMode === 'generate' && !generatedRubric && !rubricId)
          }
        >
          Next
        </Button>
      </Box>
    </>
  );
};
