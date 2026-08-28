/**
 * Mistakes Table Component
 */

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { Mistake } from './types';

interface MistakesTableProps {
  mistakes: Record<string, Mistake>;
}

export const MistakesTable: React.FC<MistakesTableProps> = ({ mistakes }) => {
  const mistakeEntries = Object.entries(mistakes).filter(
    ([_, mistake]) => mistake && (mistake.deductions !== undefined || mistake.description)
  );

  if (mistakeEntries.length === 0) return null;

  const getRecommendation = (mistake: Mistake): string => {
    const issue = mistake.description || mistake.reasons || '';
    if (issue.toLowerCase().includes('missing')) {
      return 'Include this element in future submissions';
    } else if (issue.toLowerCase().includes('unclear') || issue.toLowerCase().includes('vague')) {
      return 'Provide more specific and detailed explanations';
    } else if (issue.toLowerCase().includes('incorrect')) {
      return 'Review the correct approach or concept';
    } else {
      return 'Focus on improving clarity and completeness';
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Areas for Improvement
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Specific areas where the student can improve based on rubric criteria
        </Typography>
        
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Rubric Area</strong></TableCell>
                <TableCell><strong>Issue Identified</strong></TableCell>
                <TableCell><strong>Impact on Score</strong></TableCell>
                <TableCell><strong>Recommendation</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mistakeEntries.map(([section, mistake], index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Typography fontWeight="medium">{section}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {mistake.description || mistake.reasons || 'Specific issue not detailed'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {mistake.deductions !== undefined && mistake.deductions > 0 ? (
                      <Typography color="error" fontWeight="medium">
                        -{mistake.deductions} points
                      </Typography>
                    ) : (
                      <Typography color="warning" variant="body2">
                        Minor impact
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {getRecommendation(mistake)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};
