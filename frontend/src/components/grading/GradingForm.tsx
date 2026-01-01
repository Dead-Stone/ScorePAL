/**
 * GradingForm - Form component for single submission grading
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 */

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  IconButton,
  Slider,
  CircularProgress,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useDropzone } from 'react-dropzone';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InfoIcon from '@mui/icons-material/Info';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

const DropzoneContainer = styled('div')(({ theme }) => ({
  border: `2px dashed ${theme.palette.primary.main}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(4),
  textAlign: 'center',
  cursor: 'pointer',
  marginTop: theme.spacing(2),
  backgroundColor: theme.palette.background.default,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

interface GradingFormProps {
  formData: {
    studentName: string;
    assignmentName: string;
    questionPaper: File | null;
    submission: File | null;
    answerKey: File | null;
  };
  strictness: number;
  isLoading: boolean;
  onFormChange: (field: string, value: any) => void;
  onStrictnessChange: (value: number) => void;
  onSubmit: () => void;
  onInfoClick: () => void;
}

export const GradingForm: React.FC<GradingFormProps> = ({
  formData,
  strictness,
  isLoading,
  onFormChange,
  onStrictnessChange,
  onSubmit,
  onInfoClick,
}) => {
  const questionPaperDropzone = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
    onDrop: acceptedFiles => {
      if (acceptedFiles.length > 0) {
        onFormChange('questionPaper', acceptedFiles[0]);
      }
    },
  });

  const submissionDropzone = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    onDrop: acceptedFiles => {
      if (acceptedFiles.length > 0) {
        onFormChange('submission', acceptedFiles[0]);
      }
    },
  });

  const answerKeyDropzone = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    onDrop: acceptedFiles => {
      if (acceptedFiles.length > 0) {
        onFormChange('answerKey', acceptedFiles[0]);
      }
    },
  });

  return (
    <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        Grade Submission
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Upload a question paper and student submission to get AI-powered grading.
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <TextField
            label="Student Name"
            fullWidth
            value={formData.studentName}
            onChange={(e) => onFormChange('studentName', e.target.value)}
            required
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Assignment Name"
            fullWidth
            value={formData.assignmentName}
            onChange={(e) => onFormChange('assignmentName', e.target.value)}
            required
            margin="normal"
          />
        </Grid>

        <Grid item xs={12}>
          <Typography variant="subtitle2" gutterBottom>
            Grading Strictness
            <IconButton size="small" onClick={onInfoClick}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Typography>
          <Box sx={{ px: 2 }}>
            <Slider
              value={strictness}
              min={0}
              max={1}
              step={0.1}
              marks={[
                { value: 0, label: 'Lenient' },
                { value: 0.5, label: 'Moderate' },
                { value: 1, label: 'Strict' },
              ]}
              onChange={(_, value) => onStrictnessChange(value as number)}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
            />
          </Box>
        </Grid>

        <Grid item xs={12} md={4}>
          <Typography variant="subtitle2" gutterBottom>
            Question Paper (Required)
          </Typography>
          <DropzoneContainer {...questionPaperDropzone.getRootProps()}>
            <input {...questionPaperDropzone.getInputProps()} />
            <CloudUploadIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="body2">
              {formData.questionPaper
                ? `Selected: ${formData.questionPaper.name}`
                : 'Drag and drop or click to select (PDF/DOCX)'}
            </Typography>
          </DropzoneContainer>
        </Grid>

        <Grid item xs={12} md={4}>
          <Typography variant="subtitle2" gutterBottom>
            Student Submission (Required)
          </Typography>
          <DropzoneContainer {...submissionDropzone.getRootProps()}>
            <input {...submissionDropzone.getInputProps()} />
            <CloudUploadIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="body2">
              {formData.submission
                ? `Selected: ${formData.submission.name}`
                : 'Drag and drop or click to select (PDF/DOCX/TXT)'}
            </Typography>
          </DropzoneContainer>
        </Grid>

        <Grid item xs={12} md={4}>
          <Typography variant="subtitle2" gutterBottom>
            Answer Key (Optional)
          </Typography>
          <DropzoneContainer {...answerKeyDropzone.getRootProps()}>
            <input {...answerKeyDropzone.getInputProps()} />
            <CloudUploadIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="body2">
              {formData.answerKey
                ? `Selected: ${formData.answerKey.name}`
                : 'Drag and drop or click to select (PDF/DOCX/TXT)'}
            </Typography>
          </DropzoneContainer>
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              size="large"
              onClick={onSubmit}
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} /> : <PlayArrowIcon />}
              sx={{ px: 4, py: 1.5 }}
            >
              {isLoading ? 'Processing...' : 'Grade Submission'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

