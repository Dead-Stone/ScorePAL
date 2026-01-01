/**
 * ChartWrapper - Wrapper component for Chart.js charts
 * Handles Chart.js registration and loading state
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 */

import React, { useEffect, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { registerChartJS } from '@/utils/chartRegistry';
import { logger } from '@/utils/logger';

interface ChartWrapperProps {
  children: React.ReactNode;
  minHeight?: number;
}

export const ChartWrapper: React.FC<ChartWrapperProps> = ({ children, minHeight = 200 }) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    registerChartJS()
      .then(() => setReady(true))
      .catch((error) => {
        logger.error('Failed to register Chart.js:', error);
      });
  }, []);

  if (!ready) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%" minHeight={minHeight}>
        <CircularProgress size={24} />
      </Box>
    );
  }
  return <>{children}</>;
};

