/**
 * Score Bar Component
 */

import React from 'react';
import { Box } from '@mui/material';

interface ScoreBarProps {
  value: number;
}

export const ScoreBar: React.FC<ScoreBarProps> = ({ value }) => {
  return (
    <Box
      sx={(theme) => ({
        height: 8,
        width: '100%',
        borderRadius: theme.shape.borderRadius,
        backgroundColor: theme.palette.grey[200],
        position: 'relative',
        overflow: 'hidden',
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          width: `${value}%`,
          backgroundColor: 
            value >= 90 ? theme.palette.success.main :
            value >= 80 ? theme.palette.success.light :
            value >= 70 ? theme.palette.warning.light :
            value >= 60 ? theme.palette.warning.main :
            theme.palette.error.main,
          transition: 'width 1s ease-in-out',
        }
      })}
    />
  );
};
