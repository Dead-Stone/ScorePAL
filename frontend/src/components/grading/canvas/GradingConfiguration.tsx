/**
 * Grading Configuration Component
 */

import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Button,
  Chip,
} from '@mui/material';
import { Grade as GradeIcon } from '@mui/icons-material';

interface GradingConfigurationProps {
  rubrics: any[];
  rubricId: string;
  strictness: number;
  selectedSubmissions: number[];
  grading: boolean;
  onRubricChange: (rubricId: string) => void;
  onStrictnessChange: (value: number) => void;
  onGrade: () => void;
}

export const GradingConfiguration: React.FC<GradingConfigurationProps> = ({
  rubrics,
  rubricId,
  strictness,
  selectedSubmissions,
  grading,
  onRubricChange,
  onStrictnessChange,
  onGrade,
}) => {
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={3}>
          <GradeIcon />
          <Typography variant="h6">Grading Configuration</Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth>
            <InputLabel>Rubric</InputLabel>
            <Select
              value={rubricId}
              onChange={(e) => onRubricChange(e.target.value)}
              label="Rubric"
            >
              <MenuItem value="">Select a rubric</MenuItem>
              {rubrics.map((rubric) => (
                <MenuItem key={rubric.id} value={rubric.id}>
                  {rubric.name} ({rubric.total_points} points)
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Grading Strictness
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Adjust how strict the AI grading should be (0.0 = lenient, 1.0 = strict)
          </Typography>
          <Box sx={{ px: 2, py: 2 }}>
            <Slider
              value={strictness}
              onChange={(e, newValue) => onStrictnessChange(newValue as number)}
              min={0}
              max={1}
              step={0.1}
              marks={[
                { value: 0, label: 'Lenient' },
                { value: 0.5, label: 'Moderate' },
                { value: 1, label: 'Strict' },
              ]}
              valueLabelDisplay="auto"
            />
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
              Current: {Math.round(strictness * 100)}% strict
            </Typography>
          </Box>
        </Box>

        {selectedSubmissions.length > 0 && (
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              size="large"
              onClick={onGrade}
              disabled={grading || !rubricId}
              sx={{ mt: 2 }}
            >
              {grading ? 'Grading...' : `Grade ${selectedSubmissions.length} Submission(s)`}
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
