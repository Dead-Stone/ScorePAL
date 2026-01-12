/**
 * All Results Tab Component
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
  TableSortLabel,
  IconButton,
  Tooltip,
  Box,
  Pagination,
  Grid,
  Card,
  CardContent,
  Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Result, SortField, SortOrder, ViewMode } from './types';
import { formatDate } from './utils';
import { GradeChip } from './GradeChip';

interface AllResultsTabProps {
  results: Result[];
  viewMode: ViewMode;
  sortField: SortField;
  sortOrder: SortOrder;
  page: number;
  resultsPerPage: number;
  onSort: (field: SortField) => void;
  onPageChange: (page: number) => void;
  onViewResult: (result: Result) => void;
}

export const AllResultsTab: React.FC<AllResultsTabProps> = ({
  results,
  viewMode,
  sortField,
  sortOrder,
  page,
  resultsPerPage,
  onSort,
  onPageChange,
  onViewResult,
}) => {
  const paginatedResults = results.slice(
    (page - 1) * resultsPerPage,
    page * resultsPerPage
  );

  const handleSort = (field: SortField) => {
    onSort(field);
  };

  if (viewMode === 'cards') {
    return (
      <>
        <Grid container spacing={2}>
          {paginatedResults.map((result) => (
            <Grid item xs={12} sm={6} md={4} key={result.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        {result.student_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {result.assignment_name || result.assignment_id}
                      </Typography>
                    </Box>
                    <GradeChip grade={result.grade_letter} label={result.grade_letter} />
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h5">
                      {result.score}/{result.total_points}
                    </Typography>
                    <Chip
                      size="small"
                      label={`${result.percentage.toFixed(1)}%`}
                      color={result.percentage >= 70 ? 'success' : result.percentage >= 50 ? 'warning' : 'error'}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(result.graded_at)}
                  </Typography>
                  <Box mt={2}>
                    <Tooltip title="View Details">
                      <IconButton size="small" onClick={() => onViewResult(result)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        <Box display="flex" justifyContent="center" py={2}>
          <Pagination
            count={Math.ceil(results.length / resultsPerPage)}
            page={page}
            onChange={(e, p) => onPageChange(p)}
            color="primary"
          />
        </Box>
      </>
    );
  }

  return (
    <>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'student_name'}
                  direction={sortField === 'student_name' ? sortOrder : 'asc'}
                  onClick={() => handleSort('student_name')}
                >
                  Student Name
                </TableSortLabel>
              </TableCell>
              <TableCell>Assignment</TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={sortField === 'percentage'}
                  direction={sortField === 'percentage' ? sortOrder : 'asc'}
                  onClick={() => handleSort('percentage')}
                >
                  Score
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={sortField === 'grade_letter'}
                  direction={sortField === 'grade_letter' ? sortOrder : 'asc'}
                  onClick={() => handleSort('grade_letter')}
                >
                  Grade
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'graded_at'}
                  direction={sortField === 'graded_at' ? sortOrder : 'asc'}
                  onClick={() => handleSort('graded_at')}
                >
                  Graded At
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedResults.map((result) => (
              <TableRow key={result.id} hover>
                <TableCell>
                  <Typography fontWeight="medium">{result.student_name}</Typography>
                </TableCell>
                <TableCell>{result.assignment_name || result.assignment_id}</TableCell>
                <TableCell align="center">
                  <Chip 
                    size="small"
                    label={`${result.percentage.toFixed(1)}%`}
                    color={result.percentage >= 70 ? 'success' : result.percentage >= 50 ? 'warning' : 'error'}
                  />
                </TableCell>
                <TableCell align="center">
                  <GradeChip grade={result.grade_letter} label={result.grade_letter} size="small" />
                </TableCell>
                <TableCell>{formatDate(result.graded_at)}</TableCell>
                <TableCell align="center">
                  <Tooltip title="View Details">
                    <IconButton size="small" onClick={() => onViewResult(result)}>
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Box display="flex" justifyContent="center" py={2}>
        <Pagination
          count={Math.ceil(results.length / resultsPerPage)}
          page={page}
          onChange={(e, p) => onPageChange(p)}
          color="primary"
        />
      </Box>
    </>
  );
};
