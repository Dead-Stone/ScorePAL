/**
 * Course Statistics Table Component
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
  Box,
  CircularProgress,
  Chip,
  LinearProgress,
  Typography,
} from '@mui/material';
import { CourseStats } from './types';

interface CourseStatisticsTableProps {
  courseStats: CourseStats[];
  selectedCourseId: number | null;
  loadingStats: boolean;
}

export const CourseStatisticsTable: React.FC<CourseStatisticsTableProps> = ({
  courseStats,
  selectedCourseId,
  loadingStats,
}) => {
  const accessibleCourseStats = courseStats.filter(s => 
    s.total_submissions >= 0 && s.total_graded >= 0
  );

  const displayStats = selectedCourseId
    ? accessibleCourseStats.filter(s => s.course_id === selectedCourseId)
    : accessibleCourseStats;

  if (accessibleCourseStats.length === 0) return null;

  return (
    <Card sx={{ mb: 3 }}>
      <CardHeader
        title="Course Statistics"
        subheader={selectedCourseId ? "Selected course details" : "All courses you're grading for"}
      />
      <CardContent>
        {loadingStats ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Course</strong></TableCell>
                  <TableCell align="right"><strong>Students</strong></TableCell>
                  <TableCell align="right"><strong>Assignments</strong></TableCell>
                  <TableCell align="right"><strong>Submissions</strong></TableCell>
                  <TableCell align="right"><strong>Graded</strong></TableCell>
                  <TableCell align="right"><strong>Pending</strong></TableCell>
                  <TableCell align="right"><strong>Avg Score</strong></TableCell>
                  <TableCell align="right"><strong>Progress</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayStats.map((stats) => {
                  const progress = stats.total_submissions > 0 
                    ? (stats.total_graded / stats.total_submissions) * 100 
                    : 0;
                  return (
                    <TableRow key={stats.course_id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {stats.course_code}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {stats.course_name}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{stats.students_count}</TableCell>
                      <TableCell align="right">{stats.total_assignments}</TableCell>
                      <TableCell align="right">{stats.total_submissions}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={stats.total_graded}
                          size="small"
                          color="success"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={stats.pending_grading}
                          size="small"
                          color={stats.pending_grading > 0 ? "warning" : "default"}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {stats.average_score !== null ? (
                          <Chip
                            label={`${stats.average_score.toFixed(1)}%`}
                            size="small"
                            color={stats.average_score >= 80 ? 'success' : stats.average_score >= 60 ? 'warning' : 'error'}
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">N/A</Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Box display="flex" alignItems="center" gap={1}>
                          <LinearProgress
                            variant="determinate"
                            value={progress}
                            sx={{ width: 60, height: 8, borderRadius: 1 }}
                            color={progress >= 80 ? 'success' : progress >= 50 ? 'warning' : 'error'}
                          />
                          <Typography variant="body2" color="text.secondary">
                            {progress.toFixed(0)}%
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
};
