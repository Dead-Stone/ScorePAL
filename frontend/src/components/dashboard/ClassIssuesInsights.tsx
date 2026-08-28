/**
 * ClassIssuesInsights - Component for identifying class-wide issues and patterns
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 */

import React from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  Box,
  Typography,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Grid,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PeopleIcon from '@mui/icons-material/People';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface Student {
  id: number;
  name: string;
  email?: string;
  overall_percentage?: number;
  total_points?: number;
  total_possible?: number;
  graded_count?: number;
  submissions_count?: number;
  assignments?: Array<{
    assignment_id: number;
    assignment_name: string;
    score: number;
    points_possible: number;
    percentage: number;
  }>;
}

interface ClassIssuesInsightsProps {
  students: Student[];
}

export const ClassIssuesInsights: React.FC<ClassIssuesInsightsProps> = ({ students }) => {
  // Calculate insights
  const insights = React.useMemo(() => {
    const totalStudents = students.length;
    if (totalStudents === 0) return null;

    // Students by performance level
    const struggling = students.filter(
      (s) => s.overall_percentage !== undefined && s.overall_percentage < 70
    );
    const atRisk = students.filter(
      (s) => s.overall_percentage !== undefined && s.overall_percentage >= 70 && s.overall_percentage < 80
    );
    const excelling = students.filter(
      (s) => s.overall_percentage !== undefined && s.overall_percentage >= 90
    );

    // Calculate average performance
    const studentsWithGrades = students.filter(
      (s) => s.overall_percentage !== undefined && typeof s.overall_percentage === 'number'
    );
    const averageGrade =
      studentsWithGrades.length > 0
        ? studentsWithGrades.reduce((sum, s) => sum + (s.overall_percentage ?? 0), 0) /
          studentsWithGrades.length
        : null;

    // Find common problem areas (assignments with low average scores)
    const assignmentScores: Record<number, { name: string; scores: number[] }> = {};
    students.forEach((student) => {
      student.assignments?.forEach((assignment) => {
        if (assignment.percentage !== null && assignment.percentage !== undefined) {
          if (!assignmentScores[assignment.assignment_id]) {
            assignmentScores[assignment.assignment_id] = {
              name: assignment.assignment_name,
              scores: [],
            };
          }
          assignmentScores[assignment.assignment_id].scores.push(assignment.percentage);
        }
      });
    });

    const problemAssignments = Object.entries(assignmentScores)
      .map(([id, data]) => ({
        id: parseInt(id),
        name: data.name,
        averageScore:
          data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length,
        studentCount: data.scores.length,
      }))
      .filter((a) => a.averageScore < 70)
      .sort((a, b) => a.averageScore - b.averageScore)
      .slice(0, 5);

    // Submission issues
    const missingSubmissions = students.filter(
      (s) =>
        s.submissions_count !== undefined &&
        s.graded_count !== undefined &&
        s.submissions_count > s.graded_count
    );

    // Students with no grades
    const ungraded = students.filter((s) => s.overall_percentage === undefined);

    return {
      totalStudents,
      struggling: struggling.length,
      atRisk: atRisk.length,
      excelling: excelling.length,
      averageGrade,
      problemAssignments,
      missingSubmissions: missingSubmissions.length,
      ungraded: ungraded.length,
      strugglingStudents: struggling.slice(0, 5),
      atRiskStudents: atRisk.slice(0, 5),
    };
  }, [students]);

  if (!insights) {
    return (
      <Card>
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            No student data available for insights.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Class Performance Insights"
        subheader="Identify common issues and patterns across the class"
      />
      <CardContent>
        <Grid container spacing={3}>
          {/* Summary Statistics */}
          <Grid item xs={12}>
            <Box display="flex" gap={2} flexWrap="wrap">
              <Chip
                icon={<WarningIcon />}
                label={`${insights.struggling} Struggling (<70%)`}
                color="error"
                variant="outlined"
              />
              <Chip
                icon={<TrendingDownIcon />}
                label={`${insights.atRisk} At Risk (70-79%)`}
                color="warning"
                variant="outlined"
              />
              <Chip
                icon={<CheckCircleIcon />}
                label={`${insights.excelling} Excelling (≥90%)`}
                color="success"
                variant="outlined"
              />
              {insights.averageGrade !== null && (
                <Chip
                  label={`Class Average: ${insights.averageGrade.toFixed(1)}%`}
                  color="primary"
                  variant="outlined"
                />
              )}
            </Box>
          </Grid>

          {/* Struggling Students */}
          {insights.struggling > 0 && (
            <Grid item xs={12} md={6}>
              <Alert severity="error" icon={<WarningIcon />}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  {insights.struggling} Student{insights.struggling !== 1 ? 's' : ''} Struggling
                  (Below 70%)
                </Typography>
                <List dense>
                  {insights.strugglingStudents.map((student) => (
                    <ListItem key={student.id}>
                      <ListItemIcon>
                        <PeopleIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={student.name}
                        secondary={
                          student.overall_percentage !== undefined
                            ? `${student.overall_percentage.toFixed(1)}%`
                            : 'No grade'
                        }
                      />
                    </ListItem>
                  ))}
                  {insights.struggling > 5 && (
                    <ListItem>
                      <ListItemText
                        primary={`...and ${insights.struggling - 5} more`}
                        primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                      />
                    </ListItem>
                  )}
                </List>
              </Alert>
            </Grid>
          )}

          {/* At-Risk Students */}
          {insights.atRisk > 0 && (
            <Grid item xs={12} md={6}>
              <Alert severity="warning" icon={<TrendingDownIcon />}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  {insights.atRisk} Student{insights.atRisk !== 1 ? 's' : ''} At Risk (70-79%)
                </Typography>
                <List dense>
                  {insights.atRiskStudents.map((student) => (
                    <ListItem key={student.id}>
                      <ListItemIcon>
                        <PeopleIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={student.name}
                        secondary={
                          student.overall_percentage !== undefined
                            ? `${student.overall_percentage.toFixed(1)}%`
                            : 'No grade'
                        }
                      />
                    </ListItem>
                  ))}
                  {insights.atRisk > 5 && (
                    <ListItem>
                      <ListItemText
                        primary={`...and ${insights.atRisk - 5} more`}
                        primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                      />
                    </ListItem>
                  )}
                </List>
              </Alert>
            </Grid>
          )}

          {/* Problem Assignments */}
          {insights.problemAssignments.length > 0 && (
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Problem Assignments (Low Average Scores)
              </Typography>
              <List>
                {insights.problemAssignments.map((assignment) => (
                  <ListItem key={assignment.id}>
                    <ListItemIcon>
                      <AssignmentIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={assignment.name}
                      secondary={`Average: ${assignment.averageScore.toFixed(1)}% (${assignment.studentCount} students)`}
                    />
                    <Chip
                      label={`${assignment.averageScore.toFixed(1)}%`}
                      color="error"
                      size="small"
                    />
                  </ListItem>
                ))}
              </List>
            </Grid>
          )}

          {/* Submission Issues */}
          {insights.missingSubmissions > 0 && (
            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="body2">
                  {insights.missingSubmissions} student
                  {insights.missingSubmissions !== 1 ? 's have' : ' has'} submitted work that
                  hasn't been graded yet.
                </Typography>
              </Alert>
            </Grid>
          )}

          {/* Ungraded Students */}
          {insights.ungraded > 0 && (
            <Grid item xs={12}>
              <Alert severity="warning">
                <Typography variant="body2">
                  {insights.ungraded} student{insights.ungraded !== 1 ? 's' : ''} have no grades
                  yet.
                </Typography>
              </Alert>
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
};

