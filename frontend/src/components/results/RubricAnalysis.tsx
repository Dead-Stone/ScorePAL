/**
 * Rubric Analysis Component
 */

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import { CriterionScore } from './types';
import { ScoreBar } from './ScoreBar';

interface RubricAnalysisProps {
  criteriaScores: CriterionScore[];
}

export const RubricAnalysis: React.FC<RubricAnalysisProps> = ({ criteriaScores }) => {
  const safeCriteriaScores = Array.isArray(criteriaScores) ? criteriaScores : [];
  const totalPoints = safeCriteriaScores.reduce((sum, c) => sum + c.points, 0);
  const totalMaxPoints = safeCriteriaScores.reduce((sum, c) => sum + c.max_points, 0);
  const overallPercentage = totalMaxPoints > 0 ? (totalPoints / totalMaxPoints) * 100 : 0;
  
  const excellentCriteria = safeCriteriaScores.filter(c => (c.points / c.max_points) * 100 >= 80).length;
  const goodCriteria = safeCriteriaScores.filter(c => {
    const pct = (c.points / c.max_points) * 100;
    return pct >= 60 && pct < 80;
  }).length;
  const needsImprovementCriteria = safeCriteriaScores.filter(c => (c.points / c.max_points) * 100 < 60).length;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Rubric-Based Assessment
        </Typography>
        
        <Box mb={3}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Performance by Criterion
          </Typography>
          <Box display="flex" gap={1} flexWrap="wrap">
            {safeCriteriaScores.map((criterion, index) => {
              const percentage = (criterion.points / criterion.max_points) * 100;
              return (
                <Chip
                  key={index}
                  label={`${criterion.name}: ${criterion.points}/${criterion.max_points}`}
                  color={percentage >= 80 ? 'success' : percentage >= 60 ? 'warning' : 'error'}
                  variant="outlined"
                  size="small"
                />
              );
            })}
          </Box>
        </Box>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Rubric Criterion</strong></TableCell>
                <TableCell align="center"><strong>Score</strong></TableCell>
                <TableCell align="center"><strong>Performance</strong></TableCell>
                <TableCell><strong>Detailed Feedback</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {safeCriteriaScores.map((criterion, index) => {
                const percentage = (criterion.points / criterion.max_points) * 100;
                return (
                  <TableRow key={index}>
                    <TableCell component="th" scope="row">
                      <Typography fontWeight="medium">{criterion.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Max: {criterion.max_points} points
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {criterion.points}/{criterion.max_points}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {percentage.toFixed(1)}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Box>
                        <ScoreBar value={percentage} />
                        <Typography variant="caption" color="text.secondary">
                          {percentage >= 80 ? 'Excellent' : 
                           percentage >= 60 ? 'Good' : 
                           percentage >= 40 ? 'Fair' : 'Needs Improvement'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                        {criterion.feedback || 'No specific feedback provided for this criterion.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        
        <Box mt={3} p={2} bgcolor="grey.50" borderRadius={1}>
          <Typography variant="subtitle2" gutterBottom>
            Rubric Performance Summary
          </Typography>
          <Box display="flex" gap={2} flexWrap="wrap">
            <Chip 
              label={`Overall: ${overallPercentage.toFixed(1)}%`}
              color={overallPercentage >= 80 ? 'success' : overallPercentage >= 60 ? 'warning' : 'error'}
              variant="filled"
            />
            <Chip label={`Excellent: ${excellentCriteria}`} color="success" size="small" />
            <Chip label={`Good: ${goodCriteria}`} color="warning" size="small" />
            <Chip label={`Needs Improvement: ${needsImprovementCriteria}`} color="error" size="small" />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
