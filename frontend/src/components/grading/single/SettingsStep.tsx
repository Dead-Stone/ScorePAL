/**
 * Settings Configuration Step Component
 */

import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Slider,
  Button,
  Chip,
  Alert,
} from '@mui/material';

interface SettingsStepProps {
  strictness: number;
  selectedModel: any;
  onStrictnessChange: (value: number) => void;
  onModelSelect: () => void;
  onBack: () => void;
  onNext: () => void;
}

export const SettingsStep: React.FC<SettingsStepProps> = ({
  strictness,
  selectedModel,
  onStrictnessChange,
  onModelSelect,
  onBack,
  onNext,
}) => {
  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
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
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                AI Model Selection
              </Typography>
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={onModelSelect}
                  sx={{ minWidth: 200 }}
                >
                  {selectedModel ? 'Change AI Model' : 'Select AI Model'}
                </Button>
                {selectedModel && (
                  <Chip
                    label={`${selectedModel.provider} - ${selectedModel.model_name}`}
                    color="primary"
                    variant="outlined"
                  />
                )}
              </Box>
              {!selectedModel && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  No AI model selected. The system will use your default configuration.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button onClick={onBack}>Back</Button>
        <Button onClick={onNext} variant="contained">
          Next
        </Button>
      </Box>
    </>
  );
};
