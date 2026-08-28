/**
 * Recent Gradings Table Component
 */

import React from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';

interface RecentGradingsTableProps {
  recentGradings: any[];
}

export const RecentGradingsTable: React.FC<RecentGradingsTableProps> = ({
  recentGradings,
}) => {
  if (recentGradings.length === 0) return null;

  return (
    <Card sx={{ mb: 3 }}>
      <CardHeader title="Recent Gradings" />
      <CardContent>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>Student</strong></TableCell>
                <TableCell><strong>Assignment</strong></TableCell>
                <TableCell align="right"><strong>Score</strong></TableCell>
                <TableCell align="right"><strong>Grade</strong></TableCell>
                <TableCell><strong>Date</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentGradings.slice(0, 10).map((grading, index) => (
                <TableRow key={index} hover>
                  <TableCell>{grading.student_name || 'Unknown'}</TableCell>
                  <TableCell>{grading.assignment_name || grading.assignment_id}</TableCell>
                  <TableCell align="right">
                    <Chip
                      label={`${(grading.percentage || 0).toFixed(1)}%`}
                      size="small"
                      color={
                        (grading.percentage || 0) >= 80
                          ? 'success'
                          : (grading.percentage || 0) >= 60
                          ? 'warning'
                          : 'error'
                      }
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Chip
                      label={grading.grade_letter || 'N/A'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(grading.graded_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};
