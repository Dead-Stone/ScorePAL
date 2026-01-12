/**
 * Upload Files Step Component
 */

import React from 'react';
import {
  Box,
  Grid,
  TextField,
  Paper,
  Typography,
  Alert,
  Button,
} from '@mui/material';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';

interface UploadFilesStepProps {
  studentName: string;
  assignmentName: string;
  questionPaper: File | null;
  submission: File | null;
  answerKey: File | null;
  error: string;
  onStudentNameChange: (value: string) => void;
  onAssignmentNameChange: (value: string) => void;
  onQuestionPaperChange: (file: File | null) => void;
  onSubmissionChange: (file: File | null) => void;
  onAnswerKeyChange: (file: File | null) => void;
  onNext: () => void;
}

export const UploadFilesStep: React.FC<UploadFilesStepProps> = ({
  studentName,
  assignmentName,
  questionPaper,
  submission,
  answerKey,
  error,
  onStudentNameChange,
  onAssignmentNameChange,
  onQuestionPaperChange,
  onSubmissionChange,
  onAnswerKeyChange,
  onNext,
}) => {
  const questionPaperDropzone = useDropzone({
    onDrop: (acceptedFiles) => {
      onQuestionPaperChange(acceptedFiles[0] || null);
    },
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg'],
    },
    multiple: false,
  });

  const submissionDropzone = useDropzone({
    onDrop: (acceptedFiles) => {
      onSubmissionChange(acceptedFiles[0] || null);
    },
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg'],
    },
    multiple: false,
  });

  const answerKeyDropzone = useDropzone({
    onDrop: (acceptedFiles) => {
      onAnswerKeyChange(acceptedFiles[0] || null);
    },
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg'],
    },
    multiple: false,
  });

  return (
    <>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField
            label="Student Name"
            fullWidth
            value={studentName}
            onChange={(e) => onStudentNameChange(e.target.value)}
            required
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Assignment Name"
            fullWidth
            value={assignmentName}
            onChange={(e) => onAssignmentNameChange(e.target.value)}
            required
            margin="normal"
          />
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper
            {...questionPaperDropzone.getRootProps()}
            sx={{
              p: 3,
              border: '2px dashed',
              borderColor: questionPaper ? 'success.main' : 'grey.300',
              textAlign: 'center',
              cursor: 'pointer',
              '&:hover': { borderColor: 'primary.main' },
            }}
          >
            <input {...questionPaperDropzone.getInputProps()} />
            <CloudUploadIcon sx={{ fontSize: 40, mb: 1, color: 'primary.main' }} />
            <Typography variant="body2">
              {questionPaper ? questionPaper.name : 'Question Paper (Required)'}
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper
            {...submissionDropzone.getRootProps()}
            sx={{
              p: 3,
              border: '2px dashed',
              borderColor: submission ? 'success.main' : 'grey.300',
              textAlign: 'center',
              cursor: 'pointer',
              '&:hover': { borderColor: 'primary.main' },
            }}
          >
            <input {...submissionDropzone.getInputProps()} />
            <CloudUploadIcon sx={{ fontSize: 40, mb: 1, color: 'primary.main' }} />
            <Typography variant="body2">
              {submission ? submission.name : 'Student Submission (Required)'}
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper
            {...answerKeyDropzone.getRootProps()}
            sx={{
              p: 3,
              border: '2px dashed',
              borderColor: answerKey ? 'success.main' : 'grey.300',
              textAlign: 'center',
              cursor: 'pointer',
              '&:hover': { borderColor: 'primary.main' },
            }}
          >
            <input {...answerKeyDropzone.getInputProps()} />
            <CloudUploadIcon sx={{ fontSize: 40, mb: 1, color: 'primary.main' }} />
            <Typography variant="body2">
              {answerKey ? answerKey.name : 'Answer Key (Optional)'}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
      
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      
      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button onClick={onNext} variant="contained">
          Next
        </Button>
      </Box>
    </>
  );
};
