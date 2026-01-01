/**
 * GraderDashboard - Comprehensive grader view with toggle between perspectives
 * Shows comparisons, statistics, and grading insights
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Grid,
  Chip,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  CompareArrows as CompareArrowsIcon,
  BarChart as BarChartIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';
import { StudentComparison } from './StudentComparison';

interface GraderDashboardProps {
  recentGradings: any[];
  students?: any[];
  loading?: boolean;
}

export const GraderDashboard: React.FC<GraderDashboardProps> = ({
  recentGradings,
  students = [],
  loading = false,
}) => {
  const [graderPerspective, setGraderPerspective] = useState(false);

  // Calculate grader statistics
  const graderStats = React.useMemo(() => {
    if (!recentGradings.length) return null;

    const totalGraded = recentGradings.length;
    const avgTime = 0; // Would calculate from actual data
    const avgScore = recentGradings.reduce((sum, g) => sum + (g.percentage || 0), 0) / totalGraded;
    const consistency = 0; // Would calculate variance
    const assignments = new Set(recentGradings.map(g => g.assignment_id)).size;

    return {
      totalGraded,
      avgTime,
      avgScore,
      consistency,
      assignments,
    };
  }, [recentGradings]);

  // Group gradings by assignment for comparison
  const assignmentGroups = React.useMemo(() => {
    const groups = new Map<string, any[]>();
    recentGradings.forEach((grading) => {
      const key = grading.assignment_id || grading.assignment_name || 'Unknown';
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(grading);
    });
    return Array.from(groups.entries());
  }, [recentGradings]);

  if (loading) {
    return (
      <Box>
        <LinearProgress />
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
          Loading grader dashboard...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Toggle Switch */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" fontWeight="bold">
          Grader Dashboard
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={graderPerspective}
              onChange={(e) => setGraderPerspective(e.target.checked)}
              color="primary"
            />
          }
          label={
            <Box display="flex" alignItems="center" gap={1}>
              <CompareArrowsIcon fontSize="small" />
              <Typography variant="body2">Grader Perspective</Typography>
            </Box>
          }
        />
      </Box>

      {graderPerspective ? (
        /* Grader Perspective View - Compact comparisons */
        <Grid container spacing={2}>
          {/* Grader Performance Stats */}
          {graderStats && (
            <>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Total Graded
                        </Typography>
                        <Typography variant="h4" fontWeight="bold">
                          {graderStats.totalGraded}
                        </Typography>
                      </Box>
                      <AssignmentIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.3 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Avg Score Given
                        </Typography>
                        <Typography variant="h4" fontWeight="bold" color="success.main">
                          {graderStats.avgScore.toFixed(1)}%
                        </Typography>
                      </Box>
                      <TrendingUpIcon sx={{ fontSize: 40, color: 'success.main', opacity: 0.3 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Assignments
                        </Typography>
                        <Typography variant="h4" fontWeight="bold">
                          {graderStats.assignments}
                        </Typography>
                      </Box>
                      <BarChartIcon sx={{ fontSize: 40, color: 'info.main', opacity: 0.3 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Consistency
                        </Typography>
                        <Typography variant="h4" fontWeight="bold" color="warning.main">
                          High
                        </Typography>
                      </Box>
                      <SpeedIcon sx={{ fontSize: 40, color: 'warning.main', opacity: 0.3 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </>
          )}

          {/* Assignment Comparisons - Compact */}
          <Grid item xs={12}>
            <Card>
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
                        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                        const high = Math.max(...scores);
                        const low = Math.min(...scores);
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
          </Grid>

          {/* Student Comparison - Compact */}
          {students.length > 0 && (
            <Grid item xs={12}>
              <StudentComparison students={students} loading={false} />
            </Grid>
          )}
        </Grid>
      ) : (
        /* Standard View - Recent Gradings */
        <Grid container spacing={2}>
          {recentGradings.length === 0 ? (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box textAlign="center" py={4}>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No gradings yet
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Start grading assignments to see your dashboard
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ) : (
            <>
              {/* Quick Stats */}
              {graderStats && (
                <Grid item xs={12}>
                  <Card>
                    <CardHeader title="Your Grading Overview" />
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid item xs={6} sm={3}>
                          <Box textAlign="center">
                            <Typography variant="h4" fontWeight="bold" color="primary">
                              {graderStats.totalGraded}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Total Graded
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Box textAlign="center">
                            <Typography variant="h4" fontWeight="bold" color="success.main">
                              {graderStats.avgScore.toFixed(1)}%
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Average Score
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Box textAlign="center">
                            <Typography variant="h4" fontWeight="bold">
                              {graderStats.assignments}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Assignments
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Box textAlign="center">
                            <Typography variant="h4" fontWeight="bold" color="info.main">
                              {students.length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Students
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {/* Recent Gradings Table */}
              <Grid item xs={12}>
                <Card>
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
              </Grid>
            </>
          )}
        </Grid>
      )}
    </Box>
  );
};


