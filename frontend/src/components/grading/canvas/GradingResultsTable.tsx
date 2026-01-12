/**
 * Grading Results Table Component
 */

import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Button,
} from '@mui/material';
import { CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { GradingResult } from './types';

interface GradingResultsTableProps {
  results: GradingResult[];
  savedCount: number;
  onHide: () => void;
}

export const GradingResultsTable: React.FC<GradingResultsTableProps> = ({
  results,
  savedCount,
  onHide,
}) => {
  const getGradeLetter = (percentage: number): string => {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  };

  const getGradeColor = (percentage: number): 'success' | 'info' | 'warning' | 'error' => {
    if (percentage >= 90) return 'success';
    if (percentage >= 80) return 'info';
    if (percentage >= 70) return 'warning';
    return 'error';
  };

  if (results.length === 0) return null;

  return (
    <Card sx={{ mt: 3 }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6">Grading Results</Typography>
          {savedCount > 0 && (
            <Chip
              icon={<CheckCircleIcon />}
              label={`${savedCount} saved`}
              color="success"
              size="small"
            />
          )}
        </Box>
        <Alert severity="success" sx={{ mb: 2 }}>
          Results have been saved to the database.
        </Alert>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>Student</strong></TableCell>
                <TableCell align="right"><strong>Score</strong></TableCell>
                <TableCell align="right"><strong>Percentage</strong></TableCell>
                <TableCell align="center"><strong>Grade</strong></TableCell>
                <TableCell align="center"><strong>Status</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {results
                .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
                .map((result, index) => {
                  const percentage = result.percentage || 0;
                  const gradeLetter = getGradeLetter(percentage);
                  const gradeColor = getGradeColor(percentage);
                  return (
                    <TableRow key={index} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2" fontWeight="medium">
                            {result.user_name || `User ${result.user_id}`}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium">
                          {result.raw_score !== undefined ? `${result.raw_score}/${result.total_points || 100}` : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${percentage.toFixed(1)}%`}
                          size="small"
                          color={gradeColor}
                          sx={{ fontWeight: 'bold' }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={gradeLetter}
                          size="small"
                          color={gradeColor}
                          variant="outlined"
                          sx={{ fontWeight: 'bold', minWidth: 40 }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={result.status === 'graded' ? 'Graded' : result.status || 'Unknown'}
                          size="small"
                          color={result.status === 'graded' ? 'success' : 'default'}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>
        <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button onClick={onHide} variant="outlined">
            Hide Results
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};
