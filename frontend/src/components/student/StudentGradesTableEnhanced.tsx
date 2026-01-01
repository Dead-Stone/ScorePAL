/**
 * StudentGradesTableEnhanced - Enhanced grades table with filters, search, and export
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 */

import React, { useState, useMemo } from 'react';
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
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Button,
  Pagination,
} from '@mui/material';
import Link from 'next/link';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import FilterListIcon from '@mui/icons-material/FilterList';

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

interface StudentGradesTableEnhancedProps {
  results: Result[];
}

export const StudentGradesTableEnhanced: React.FC<StudentGradesTableEnhancedProps> = ({ results }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState('all');
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // Get unique assignments for filter
  const assignments = useMemo(() => {
    const unique = new Set(results.map(r => r.assignment_name || r.assignment_id).filter(Boolean));
    return Array.from(unique);
  }, [results]);

  // Filter and search results
  const filteredResults = useMemo(() => {
    return results.filter(result => {
      // Search filter
      const matchesSearch = !searchTerm || 
        (result.assignment_name || result.assignment_id || '').toLowerCase().includes(searchTerm.toLowerCase());

      // Assignment filter
      const matchesAssignment = assignmentFilter === 'all' ||
        (result.assignment_name || result.assignment_id) === assignmentFilter;

      // Grade filter
      const matchesGrade = gradeFilter === 'all' ||
        (gradeFilter === 'A' && result.percentage >= 90) ||
        (gradeFilter === 'B' && result.percentage >= 80 && result.percentage < 90) ||
        (gradeFilter === 'C' && result.percentage >= 70 && result.percentage < 80) ||
        (gradeFilter === 'D' && result.percentage >= 60 && result.percentage < 70) ||
        (gradeFilter === 'F' && result.percentage < 60);

      return matchesSearch && matchesAssignment && matchesGrade;
    });
  }, [results, searchTerm, assignmentFilter, gradeFilter]);

  // Pagination
  const paginatedResults = useMemo(() => {
    const startIndex = (page - 1) * itemsPerPage;
    return filteredResults.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredResults, page]);

  const totalPages = Math.ceil(filteredResults.length / itemsPerPage);

  // Export to CSV
  const handleExport = () => {
    const headers = ['Assignment', 'Score', 'Percentage', 'Grade', 'Graded Date'];
    const rows = filteredResults.map(r => [
      r.assignment_name || r.assignment_id,
      `${r.score.toFixed(1)} / ${r.total_points.toFixed(0)}`,
      `${r.percentage.toFixed(1)}%`,
      r.grade_letter,
      new Date(r.graded_at).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my_grades_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

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
    <Box>
      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
          <TextField
            size="small"
            placeholder="Search assignments..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ flexGrow: 1, minWidth: 200 }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Assignment</InputLabel>
            <Select
              value={assignmentFilter}
              label="Assignment"
              onChange={(e) => {
                setAssignmentFilter(e.target.value);
                setPage(1);
              }}
            >
              <MenuItem value="all">All Assignments</MenuItem>
              {assignments.map((assignment) => (
                <MenuItem key={assignment} value={assignment}>
                  {assignment}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Grade</InputLabel>
            <Select
              value={gradeFilter}
              label="Grade"
              onChange={(e) => {
                setGradeFilter(e.target.value);
                setPage(1);
              }}
            >
              <MenuItem value="all">All Grades</MenuItem>
              <MenuItem value="A">A (90-100%)</MenuItem>
              <MenuItem value="B">B (80-89%)</MenuItem>
              <MenuItem value="C">C (70-79%)</MenuItem>
              <MenuItem value="D">D (60-69%)</MenuItem>
              <MenuItem value="F">F (&lt;60%)</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Export to CSV">
            <IconButton onClick={handleExport} color="primary">
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        </Box>
        {filteredResults.length !== results.length && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Showing {filteredResults.length} of {results.length} grades
          </Typography>
        )}
      </Paper>

      {/* Table */}
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
            {paginatedResults.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                    No grades match your filters
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedResults.map((result) => (
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
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" p={2}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Box>
      )}
    </Box>
  );
};

