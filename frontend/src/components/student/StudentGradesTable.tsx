/**
 * StudentGradesTable - Table component for displaying student grades
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 */

import React from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Box,
  Alert,
} from '@mui/material';
import Link from 'next/link';
import AssignmentIcon from '@mui/icons-material/Assignment';

interface Result {
  id: string;
  assignment_id: string;
  assignment_name?: string;
  score: number;
  total_points: number;
  percentage: number;
  grade_letter: string;
  graded_at: string;
}

interface StudentGradesTableProps {
  results: Result[];
}

export const StudentGradesTable: React.FC<StudentGradesTableProps> = ({ results }) => {
  if (results.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <AssignmentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          No grades yet
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Your graded assignments will appear here once they're processed.
        </Typography>
      </Paper>
    );
  }

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'success';
    if (percentage >= 80) return 'info';
    if (percentage >= 70) return 'warning';
    return 'error';
  };

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Assignment</TableCell>
            <TableCell align="right">Score</TableCell>
            <TableCell align="right">Percentage</TableCell>
            <TableCell align="center">Grade</TableCell>
            <TableCell>Graded Date</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {results.map((result) => (
            <TableRow key={result.id} hover>
              <TableCell>
                <Typography variant="body2" fontWeight="medium">
                  {result.assignment_name || result.assignment_id}
                </Typography>
              </TableCell>
              <TableCell align="right">
                {result.score.toFixed(1)} / {result.total_points.toFixed(0)}
              </TableCell>
              <TableCell align="right">
                <Typography
                  variant="body2"
                  fontWeight="bold"
                  color={`${getGradeColor(result.percentage)}.main`}
                >
                  {result.percentage.toFixed(1)}%
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Chip
                  label={result.grade_letter}
                  color={getGradeColor(result.percentage) as any}
                  size="small"
                />
              </TableCell>
              <TableCell>
                {new Date(result.graded_at).toLocaleDateString()}
              </TableCell>
              <TableCell align="center">
                <Link href={`/results/${result.id}`} prefetch={true}>
                  <Chip label="View Details" size="small" clickable />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

