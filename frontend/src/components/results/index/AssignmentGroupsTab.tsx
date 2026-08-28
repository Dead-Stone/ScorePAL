/**
 * Assignment Groups Tab Component
 */

import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Chip,
  IconButton,
  Collapse,
  Box,
  LinearProgress,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { AssignmentGroup, Result } from './types';
import { formatDate } from './utils';
import { GradeChip } from './GradeChip';

const AssignmentCard = styled(Card)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius * 2,
  overflow: 'hidden',
  transition: 'all 0.2s ease',
  '&:hover': {
    boxShadow: theme.shadows[6],
  },
}));

interface AssignmentGroupsTabProps {
  assignmentGroups: AssignmentGroup[];
  expandedGroups: string[];
  onToggleGroup: (assignmentId: string) => void;
  onViewResult: (result: Result) => void;
}

export const AssignmentGroupsTab: React.FC<AssignmentGroupsTabProps> = ({
  assignmentGroups,
  expandedGroups,
  onToggleGroup,
  onViewResult,
}) => {
  return (
    <Grid container spacing={3}>
      {assignmentGroups.map((group) => {
        const isExpanded = expandedGroups.includes(group.assignment_id);
        const passRate = group.count > 0 ? (group.passing_count / group.count) * 100 : 0;
        
        return (
          <Grid item xs={12} key={group.assignment_id}>
            <AssignmentCard>
              <CardHeader
                title={
                  <Box display="flex" alignItems="center" gap={2}>
                    <Typography variant="h6">
                      {group.assignment_name || group.assignment_id}
                    </Typography>
                    <Chip label={`${group.count} submissions`} size="small" />
                  </Box>
                }
                subheader={`Last graded: ${formatDate(group.latest_graded)}`}
                action={
                  <IconButton onClick={() => onToggleGroup(group.assignment_id)}>
                    {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                }
              />
              <CardContent>
                <Grid container spacing={2} mb={2}>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Average</Typography>
                    <Typography variant="h6">{group.average_score.toFixed(1)}%</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Highest</Typography>
                    <Typography variant="h6" color="success.main">
                      {group.highest_score.toFixed(1)}%
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Lowest</Typography>
                    <Typography variant="h6" color="error.main">
                      {group.lowest_score.toFixed(1)}%
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Pass Rate</Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      <LinearProgress
                        variant="determinate"
                        value={passRate}
                        sx={{ flexGrow: 1, height: 8, borderRadius: 1 }}
                        color={passRate >= 70 ? 'success' : passRate >= 50 ? 'warning' : 'error'}
                      />
                      <Typography variant="body2">{passRate.toFixed(0)}%</Typography>
                    </Box>
                  </Grid>
                </Grid>
                
                <Collapse in={isExpanded}>
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Student Results
                    </Typography>
                    <Grid container spacing={1}>
                      {group.results.map((result) => (
                        <Grid item xs={12} sm={6} md={4} key={result.id}>
                          <Card variant="outlined" sx={{ p: 1 }}>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Box>
                                <Typography variant="body2" fontWeight="medium">
                                  {result.student_name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {result.percentage.toFixed(1)}%
                                </Typography>
                              </Box>
                              <Box display="flex" gap={1} alignItems="center">
                                <GradeChip grade={result.grade_letter} label={result.grade_letter} size="small" />
                                <IconButton
                                  size="small"
                                  onClick={() => onViewResult(result)}
                                >
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            </Box>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                </Collapse>
              </CardContent>
            </AssignmentCard>
          </Grid>
        );
      })}
    </Grid>
  );
};
