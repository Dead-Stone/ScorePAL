/**
 * Assignment Comparisons Table Component
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
  Typography,
} from '@mui/material';

interface AssignmentComparisonsTableProps {
  assignmentGroups: [string, any[]][];
}

export const AssignmentComparisonsTable: React.FC<AssignmentComparisonsTableProps> = ({
  assignmentGroups,
}) => {
  if (assignmentGroups.length === 0) return null;

  return (
    <Card sx={{ mb: 3 }}>
      <CardHeader
        title="Assignment Comparisons"
        subheader="Performance across different assignments"
      />
      <CardContent>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>Assignment</strong></TableCell>
                <TableCell align="right"><strong>Graded</strong></TableCell>
                <TableCell align="right"><strong>Avg Score</strong></TableCell>
                <TableCell align="right"><strong>High</strong></TableCell>
                <TableCell align="right"><strong>Low</strong></TableCell>
                <TableCell align="center"><strong>Range</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assignmentGroups.map(([assignment, gradings]) => {
                const scores = gradings.map(g => g.percentage || 0);
                const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
                const high = scores.length > 0 ? Math.max(...scores) : 0;
                const low = scores.length > 0 ? Math.min(...scores) : 0;
                const range = high - low;

                return (
                  <TableRow key={assignment} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {assignment}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{gradings.length}</TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`${avg.toFixed(1)}%`}
                        size="small"
                        color={avg >= 80 ? 'success' : avg >= 60 ? 'warning' : 'error'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="success.main" fontWeight="bold">
                        {high.toFixed(1)}%
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="error.main" fontWeight="bold">
                        {low.toFixed(1)}%
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${range.toFixed(1)}%`}
                        size="small"
                        variant="outlined"
                        color={range > 30 ? 'warning' : 'default'}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};
