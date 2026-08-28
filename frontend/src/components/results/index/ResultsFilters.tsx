/**
 * Results Filters Component
 */

import React from 'react';
import {
  Paper,
  Box,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { AssignmentGroup, SortField, SortOrder, ViewMode } from './types';

interface ResultsFiltersProps {
  searchTerm: string;
  selectedAssignment: string;
  gradeFilter: string;
  dateRange: 'all' | '7days' | '30days' | '90days';
  scoreRange: string;
  resultType: 'all' | 'single' | 'batch' | 'canvas';
  assignmentGroups: AssignmentGroup[];
  filteredResultsCount: number;
  onSearchChange: (value: string) => void;
  onAssignmentChange: (value: string) => void;
  onGradeFilterChange: (value: string) => void;
  onDateRangeChange: (value: 'all' | '7days' | '30days' | '90days') => void;
  onScoreRangeChange: (value: string) => void;
  onResultTypeChange: (value: 'all' | 'single' | 'batch' | 'canvas') => void;
}

export const ResultsFilters: React.FC<ResultsFiltersProps> = ({
  searchTerm,
  selectedAssignment,
  gradeFilter,
  dateRange,
  scoreRange,
  resultType,
  assignmentGroups,
  filteredResultsCount,
  onSearchChange,
  onAssignmentChange,
  onGradeFilterChange,
  onDateRangeChange,
  onScoreRangeChange,
  onResultTypeChange,
}) => {
  return (
    <Paper sx={{ p: 2 }}>
      <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
        <TextField
          placeholder="Search students or assignments..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          size="small"
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
          }}
          sx={{ minWidth: 250, flexGrow: 1 }}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Assignment</InputLabel>
          <Select
            value={selectedAssignment}
            onChange={(e) => onAssignmentChange(e.target.value)}
            label="Assignment"
          >
            <MenuItem value="all">All Assignments</MenuItem>
            {assignmentGroups.map(g => (
              <MenuItem key={g.assignment_id} value={g.assignment_id}>
                {g.assignment_name || g.assignment_id}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Grade</InputLabel>
          <Select
            value={gradeFilter}
            onChange={(e) => onGradeFilterChange(e.target.value)}
            label="Grade"
          >
            <MenuItem value="all">All Grades</MenuItem>
            {['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'].map(g => (
              <MenuItem key={g} value={g}>{g}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Period</InputLabel>
          <Select
            value={dateRange}
            onChange={(e) => onDateRangeChange(e.target.value as any)}
            label="Period"
          >
            <MenuItem value="all">All Time</MenuItem>
            <MenuItem value="7days">Last 7 Days</MenuItem>
            <MenuItem value="30days">Last 30 Days</MenuItem>
            <MenuItem value="90days">Last 90 Days</MenuItem>
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary">
          {filteredResultsCount} results
        </Typography>
      </Box>
    </Paper>
  );
};
