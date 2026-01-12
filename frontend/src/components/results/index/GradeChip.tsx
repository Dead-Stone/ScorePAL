/**
 * Grade Chip Component
 */

import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import { styled, alpha } from '@mui/material/styles';

const StyledGradeChip = styled(Chip)<{ grade: string }>(({ theme, grade }) => {
  const colors: Record<string, string> = {
    'A+': theme.palette.success.dark,
    'A': theme.palette.success.main,
    'A-': theme.palette.success.light,
    'B+': theme.palette.primary.main,
    'B': theme.palette.primary.light,
    'B-': theme.palette.info.main,
    'C+': theme.palette.info.light,
    'C': theme.palette.warning.main,
    'C-': theme.palette.warning.light,
    'D': theme.palette.error.light,
    'F': theme.palette.error.main,
  };
  
  return {
    backgroundColor: alpha(colors[grade] || theme.palette.grey[500], 0.15),
    color: colors[grade] || theme.palette.grey[700],
    fontWeight: 'bold',
    borderRadius: '8px',
  };
});

interface GradeChipProps extends Omit<ChipProps, 'grade'> {
  grade: string;
}

export const GradeChip: React.FC<GradeChipProps> = ({ grade, ...props }) => {
  return <StyledGradeChip grade={grade} {...props} />;
};
