/**
 * StudentComparison - Component to show student performance comparisons
 * Shows rankings, percentiles, and performance trends
 */

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Paper,
  Grid,
  Avatar,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import PersonIcon from '@mui/icons-material/Person';

interface Student {
  id: number;
  name: string;
  sortable_name?: string;
  total_points?: number;
  total_possible?: number;
  current_score?: number;
  overall_percentage?: number;
  submissions_count?: number;
  graded_count?: number;
  email?: string;
  avatar_url?: string;
}

interface StudentComparisonProps {
  students: Student[];
  loading?: boolean;
}

export const StudentComparison: React.FC<StudentComparisonProps> = ({ students, loading }) => {
  if (loading) {
    return (
      <Card>
        <CardContent>
          <LinearProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
            Loading student data...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (!students || students.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="body2" color="text.secondary" align="center">
            No student data available
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // Calculate statistics - use overall_percentage if available, otherwise calculate from points
  const studentsWithScores = students
    .map(student => {
      let percentage = student.overall_percentage;
      
      // If no overall_percentage, calculate from total_points and total_possible
      if (percentage == null && student.total_points != null && student.total_possible != null && student.total_possible > 0) {
        // Check if total_points looks like a percentage (<= 100 when total_possible is much larger)
        if (student.total_points <= 100 && student.total_possible > 100) {
          // total_points is likely a percentage, use it directly
          percentage = student.total_points;
        } else {
          // Calculate percentage from actual points
          percentage = (student.total_points / student.total_possible) * 100;
        }
      }
      
      // Fallback to current_score if available
      if (percentage == null && student.current_score != null) {
        percentage = student.current_score;
      }
      
      return {
        ...student,
        calculatedPercentage: percentage,
      };
    })
    .filter(s => s.calculatedPercentage != null && s.calculatedPercentage !== undefined);
  
  const scores = studentsWithScores.map(s => s.calculatedPercentage || 0);
  const average = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
  const minScore = scores.length > 0 ? Math.min(...scores) : 0;

  // Sort students by score (descending)
  const sortedStudents = [...studentsWithScores].sort((a, b) => {
    const scoreA = a.calculatedPercentage || 0;
    const scoreB = b.calculatedPercentage || 0;
    return scoreB - scoreA;
  });

  // Calculate percentile for each student
  const studentsWithPercentile = sortedStudents.map((student, index) => {
    const percentile = sortedStudents.length > 1 
      ? Math.round(((sortedStudents.length - index) / sortedStudents.length) * 100)
      : 100;
    const score = student.calculatedPercentage || 0;
    const aboveAverage = score >= average;
    return {
      ...student,
      percentile,
      rank: index + 1,
      aboveAverage,
      displayScore: score,
    };
  });

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 80) return 'info';
    if (score >= 70) return 'warning';
    return 'error';
  };

  const getPercentileColor = (percentile: number) => {
    if (percentile >= 90) return 'success';
    if (percentile >= 75) return 'info';
    if (percentile >= 50) return 'default';
    if (percentile >= 25) return 'warning';
    return 'error';
  };

  return (
    <Card sx={{ boxShadow: 2 }}>
      <CardHeader 
        title="Student Performance Rankings"
        subheader={studentsWithScores.length > 0 
          ? `Sorted by overall score • ${studentsWithScores.length} of ${students.length} students with scores`
          : 'No scores available yet'
        }
        sx={{
              bgcolor: 'grey.50',
              borderBottom: 1,
              borderColor: 'divider',
              pb: 1.5
            }}
        titleTypographyProps={{ variant: 'h6', fontSize: '1rem', fontWeight: 600 }}
        subheaderTypographyProps={{ variant: 'body2', fontSize: '0.875rem' }}
        action={
          studentsWithScores.length > 0 && (
            <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
              <Box display="flex" alignItems="center" gap={0.5}>
                <Typography variant="caption" color="text.secondary">Avg:</Typography>
                <Chip 
                  label={`${average.toFixed(1)}%`} 
                  size="small" 
                  color="primary"
                  sx={{ height: 24, fontWeight: 'bold' }}
                />
              </Box>
              <Box display="flex" alignItems="center" gap={0.5}>
                <Typography variant="caption" color="text.secondary">High:</Typography>
                <Chip 
                  label={`${maxScore.toFixed(1)}%`} 
                  size="small" 
                  color="success"
                  sx={{ height: 24, fontWeight: 'bold' }}
                />
              </Box>
              <Box display="flex" alignItems="center" gap={0.5}>
                <Typography variant="caption" color="text.secondary">Low:</Typography>
                <Chip 
                  label={`${minScore.toFixed(1)}%`} 
                  size="small" 
                  color="error"
                  sx={{ height: 24, fontWeight: 'bold' }}
                />
              </Box>
            </Box>
          )
        }
      />
      <CardContent sx={{ p: 0 }}>
            <TableContainer>
              <Table size="small" sx={{ '& .MuiTableCell-root': { py: 1 } }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ width: 60, fontWeight: 600 }}>Rank</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Student</TableCell>
                    <TableCell align="right" sx={{ width: 100, fontWeight: 600 }}>Score</TableCell>
                    <TableCell align="right" sx={{ width: 100, fontWeight: 600 }}>Percentile</TableCell>
                    <TableCell align="right" sx={{ width: 120, fontWeight: 600 }}>Points</TableCell>
                    <TableCell align="center" sx={{ width: 100, fontWeight: 600 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {studentsWithPercentile.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          No student scores available yet. Scores will appear after grading assignments.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    studentsWithPercentile.map((student) => (
                    <TableRow key={student.id} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <Chip
                            label={student.rank}
                            size="small"
                            color={student.rank <= 3 ? 'primary' : 'default'}
                            variant={student.rank <= 3 ? 'filled' : 'outlined'}
                            sx={{ 
                              minWidth: 32, 
                              height: 24,
                              fontWeight: 'bold',
                              fontSize: '0.75rem'
                            }}
                          />
                          {student.aboveAverage ? (
                            <TrendingUpIcon fontSize="small" color="success" sx={{ fontSize: 16 }} />
                          ) : (
                            <TrendingDownIcon fontSize="small" color="error" sx={{ fontSize: 16 }} />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Avatar
                            src={student.avatar_url}
                            alt={student.name}
                            sx={{ width: 28, height: 28, fontSize: '0.75rem' }}
                          >
                            {(student.name || student.sortable_name || `Student ${student.id}`).charAt(0).toUpperCase()}
                          </Avatar>
                          <Typography variant="body2" fontWeight="medium" noWrap sx={{ maxWidth: 200 }}>
                            {student.name || student.sortable_name || `Student ${student.id}`}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${(student.displayScore || 0).toFixed(1)}%`}
                          color={getScoreColor(student.displayScore || 0) as any}
                          size="small"
                          sx={{ height: 24, fontWeight: 'medium' }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${student.percentile}th`}
                          color={getPercentileColor(student.percentile) as any}
                          size="small"
                          variant="outlined"
                          sx={{ height: 24 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {(() => {
                            if (student.total_points == null || student.total_possible == null) {
                              return 'N/A';
                            }
                            // Check if total_points is actually a percentage
                            let actualPoints = student.total_points;
                            if (student.total_points <= 100 && student.total_possible > 100 && student.displayScore != null) {
                              // Calculate actual points from percentage
                              actualPoints = (student.displayScore / 100) * student.total_possible;
                            }
                            return `${actualPoints.toFixed(1)} / ${student.total_possible.toFixed(0)}`;
                          })()}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {student.graded_count === student.submissions_count ? (
                          <Chip 
                            label="Complete" 
                            color="success" 
                            size="small"
                            sx={{ height: 24 }}
                          />
                        ) : (
                          <Chip 
                            label={`${student.graded_count || 0}/${student.submissions_count || 0}`}
                            color="warning"
                            size="small"
                            sx={{ height: 24 }}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
  );
};


