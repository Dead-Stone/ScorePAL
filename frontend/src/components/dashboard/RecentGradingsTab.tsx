/**
 * RecentGradingsTab - Enhanced recent gradings tab with filters, search, and export
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Paper,
  Typography,
  CircularProgress,
  Pagination,
} from '@mui/material';
import Link from 'next/link';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import FilterListIcon from '@mui/icons-material/FilterList';
import RefreshIcon from '@mui/icons-material/Refresh';
import GradeIcon from '@mui/icons-material/Grade';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PeopleIcon from '@mui/icons-material/People';
import { StatsCard } from '../cards/StatsCard';

interface Grading {
  id?: string;
  assignment_id?: string;
  assignment_name?: string;
  student_name?: string;
  student_id?: string;
  score?: number;
  max_score?: number;
  percentage?: number;
  grade_letter?: string;
  graded_at?: string;
}

interface RecentGradingsTabProps {
  gradings: Grading[];
  loading: boolean;
  onRefresh?: () => void;
}

export const RecentGradingsTab: React.FC<RecentGradingsTabProps> = ({
  gradings,
  loading,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // Get unique assignments for filter
  const assignments = useMemo(() => {
    const unique = new Set(gradings.map(g => g.assignment_name || g.assignment_id).filter(Boolean));
    return Array.from(unique);
  }, [gradings]);

  // Filter and search gradings
  const filteredGradings = useMemo(() => {
    return gradings.filter(grading => {
      // Search filter
      const matchesSearch = !searchTerm || 
        (grading.student_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (grading.assignment_name || grading.assignment_id || '').toLowerCase().includes(searchTerm.toLowerCase());

      // Assignment filter
      const matchesAssignment = assignmentFilter === 'all' ||
        (grading.assignment_name || grading.assignment_id) === assignmentFilter;

      // Grade filter
      const matchesGrade = gradeFilter === 'all' ||
        (gradeFilter === 'A' && (grading.percentage || 0) >= 90) ||
        (gradeFilter === 'B' && (grading.percentage || 0) >= 80 && (grading.percentage || 0) < 90) ||
        (gradeFilter === 'C' && (grading.percentage || 0) >= 70 && (grading.percentage || 0) < 80) ||
        (gradeFilter === 'D' && (grading.percentage || 0) >= 60 && (grading.percentage || 0) < 70) ||
        (gradeFilter === 'F' && (grading.percentage || 0) < 60);

      return matchesSearch && matchesAssignment && matchesGrade;
    });
  }, [gradings, searchTerm, assignmentFilter, gradeFilter]);

  // Pagination
  const paginatedGradings = useMemo(() => {
    const startIndex = (page - 1) * itemsPerPage;
    return filteredGradings.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredGradings, page]);

  const totalPages = Math.ceil(filteredGradings.length / itemsPerPage);

  // Calculate statistics
  const stats = useMemo(() => {
    if (gradings.length === 0) {
      return {
        total: 0,
        average: 0,
        assignments: 0,
        students: 0,
      };
    }

    return {
      total: gradings.length,
      average: gradings.reduce((sum, r) => sum + (r.percentage || 0), 0) / gradings.length,
      assignments: new Set(gradings.map(r => r.assignment_id || r.assignment_name)).size,
      students: new Set(gradings.map(r => r.student_name || r.student_id)).size,
    };
  }, [gradings]);

  // Export to CSV
  const handleExport = () => {
    const headers = ['Student', 'Assignment', 'Score', 'Percentage', 'Grade', 'Graded At'];
    const rows = filteredGradings.map(g => [
      g.student_name || 'Unknown',
      g.assignment_name || g.assignment_id || 'N/A',
      `${g.score || 0}/${g.max_score || 100}`,
      `${(g.percentage || 0).toFixed(1)}%`,
      g.grade_letter || 'N/A',
      g.graded_at ? new Date(g.graded_at).toLocaleString() : 'N/A',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gradings_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (gradings.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <GradeIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          No recent gradings
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Start grading assignments to see them here.
        </Typography>
        <Button
          component={Link}
          href="/grade"
          variant="contained"
          startIcon={<GradeIcon />}
        >
          Start Grading
        </Button>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Total Graded"
            value={stats.total}
            icon={<GradeIcon sx={{ fontSize: 40 }} />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Average Score"
            value={`${stats.average.toFixed(1)}%`}
            icon={<TrendingUpIcon sx={{ fontSize: 40 }} />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Assignments"
            value={stats.assignments}
            icon={<AssignmentIcon sx={{ fontSize: 40 }} />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Students"
            value={stats.students}
            icon={<PeopleIcon sx={{ fontSize: 40 }} />}
            color="warning"
          />
        </Grid>
      </Grid>

      {/* Filters and Actions */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by student or assignment..."
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
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
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
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
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
          </Grid>
          <Grid item xs={12} md={2}>
            <Box display="flex" gap={1}>
              <Tooltip title="Export to CSV">
                <IconButton onClick={handleExport} color="primary">
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
              {onRefresh && (
                <Tooltip title="Refresh">
                  <IconButton onClick={onRefresh} color="primary">
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Grid>
        </Grid>
        {filteredGradings.length !== gradings.length && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Showing {filteredGradings.length} of {gradings.length} gradings
          </Typography>
        )}
      </Paper>

      {/* Gradings Table */}
      <Card>
        <CardHeader
          title="Recent Gradings"
          action={
            <Button
              component={Link}
              href="/results"
              variant="outlined"
              size="small"
            >
              View All
            </Button>
          }
        />
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Student</TableCell>
                <TableCell>Assignment</TableCell>
                <TableCell align="right">Score</TableCell>
                <TableCell align="right">Percentage</TableCell>
                <TableCell align="center">Grade</TableCell>
                <TableCell>Graded At</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedGradings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                      No gradings match your filters
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedGradings.map((grading) => (
                  <TableRow key={grading.id || `${grading.assignment_id}-${grading.student_name}`} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {grading.student_name || 'Unknown'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {grading.assignment_name || grading.assignment_id || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {grading.score !== undefined && grading.max_score !== undefined
                        ? `${grading.score}/${grading.max_score}`
                        : 'N/A'}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="medium">
                        {grading.percentage !== undefined ? `${grading.percentage.toFixed(1)}%` : 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={grading.grade_letter || 'N/A'}
                        color={
                          (grading.percentage || 0) >= 90 ? 'success' :
                          (grading.percentage || 0) >= 80 ? 'info' :
                          (grading.percentage || 0) >= 70 ? 'warning' : 'error'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {grading.graded_at
                          ? new Date(grading.graded_at).toLocaleString()
                          : 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {grading.id && (
                        <Button
                          size="small"
                          component={Link}
                          href={`/results/${grading.id}`}
                        >
                          View
                        </Button>
                      )}
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
      </Card>
    </Box>
  );
};

