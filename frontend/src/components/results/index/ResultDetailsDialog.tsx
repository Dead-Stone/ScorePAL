/**
 * Result Details Dialog Component
 */

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Grid,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import { Result } from './types';
import { formatDate } from './utils';
import { GradeChip } from './GradeChip';

interface ResultDetailsDialogProps {
  open: boolean;
  result: Result | null;
  onClose: () => void;
}

export const ResultDetailsDialog: React.FC<ResultDetailsDialogProps> = ({
  open,
  result,
  onClose,
}) => {
  if (!result) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">{result.student_name}</Typography>
          <GradeChip grade={result.grade_letter} label={result.grade_letter} />
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">Assignment</Typography>
            <Typography fontWeight="medium">
              {result.assignment_name || result.assignment_id}
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">Score</Typography>
            <Typography fontWeight="medium">
              {result.score}/{result.total_points}
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">Percentage</Typography>
            <Typography fontWeight="medium">
              {result.percentage.toFixed(1)}%
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">Graded At</Typography>
            <Typography fontWeight="medium">
              {formatDate(result.graded_at)}
            </Typography>
          </Grid>
        </Grid>
        
        {result.overall_feedback && (
          <Box mt={3}>
            <Typography variant="subtitle2" gutterBottom>Overall Feedback</Typography>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="body2">{result.overall_feedback}</Typography>
            </Paper>
          </Box>
        )}
        
        {result.rubric_scores && result.rubric_scores.length > 0 && (
          <Box mt={3}>
            <Typography variant="subtitle2" gutterBottom>Rubric Breakdown</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Criterion</TableCell>
                    <TableCell align="center">Score</TableCell>
                    <TableCell>Feedback</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {result.rubric_scores.map((rubric, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{rubric.criterion}</TableCell>
                      <TableCell align="center">
                        <Chip 
                          size="small"
                          label={`${rubric.score}/${rubric.max_score}`}
                          color={rubric.score >= rubric.max_score * 0.7 ? 'success' : 'warning'}
                        />
                      </TableCell>
                      <TableCell>{rubric.feedback}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
