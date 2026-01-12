/**
 * Results Overview Tab - Shows list of students
 */

import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  InputAdornment,
  Button,
  Tooltip,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { GradingResults } from './types';
import { getScoreColor, getGradeColor } from './utils';

interface ResultsOverviewTabProps {
  results: GradingResults;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onStudentSelect: (studentName: string) => void;
  onTabChange: (tab: number) => void;
}

export const ResultsOverviewTab: React.FC<ResultsOverviewTabProps> = ({
  results,
  searchQuery,
  onSearchChange,
  onStudentSelect,
  onTabChange,
}) => {
  const filteredStudents = React.useMemo(() => {
    if (!results.student_results) return [];
    
    const students = Object.entries(results.student_results);
    if (!searchQuery) return students;
    
    const query = searchQuery.toLowerCase();
    return students.filter(([name]) => name.toLowerCase().includes(query));
  }, [results.student_results, searchQuery]);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Student Results
            </Typography>
            
            {results.summary_stats && (
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Average Score
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {(results.summary_stats.average_score * 100).toFixed(1)}%
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Highest Score
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="success.main">
                    {(results.summary_stats.highest_score * 100).toFixed(1)}%
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Lowest Score
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="error.main">
                    {(results.summary_stats.lowest_score * 100).toFixed(1)}%
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Passing Rate
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {results.summary_stats.submission_count > 0
                      ? ((results.summary_stats.passing_count / results.summary_stats.submission_count) * 100).toFixed(1)
                      : 0}%
                  </Typography>
                </Grid>
              </Grid>
            )}
            
            <TextField
              fullWidth
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Student Name</strong></TableCell>
                    <TableCell align="right"><strong>Score</strong></TableCell>
                    <TableCell align="right"><strong>Percentage</strong></TableCell>
                    <TableCell align="center"><strong>Grade</strong></TableCell>
                    <TableCell align="center"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map(([name, student]) => (
                      <TableRow key={name} hover>
                        <TableCell>
                          <Typography fontWeight="medium">{name}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          {student.score} / {student.total}
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={`${student.percentage.toFixed(1)}%`}
                            color={getScoreColor(student.percentage)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={student.grade_letter}
                            sx={{ bgcolor: getGradeColor(student.grade_letter), color: 'white' }}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="View Details">
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => {
                                onStudentSelect(name);
                                onTabChange(1);
                              }}
                            >
                              View
                            </Button>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography variant="body1" color="text.secondary" py={2}>
                          {results.student_results ? 
                            "No students found matching your search" : 
                            "This appears to be a single student submission"
                          }
                        </Typography>
                        {!results.student_results && results.student_name && (
                          <Button 
                            variant="contained" 
                            color="primary"
                            onClick={() => onTabChange(1)}
                            sx={{ mt: 1 }}
                          >
                            View {results.student_name}'s Results
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};
