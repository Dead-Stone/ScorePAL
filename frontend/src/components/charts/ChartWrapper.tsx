/**
 * ChartWrapper - Wrapper component for Chart.js charts
 * Handles Chart.js registration and loading state
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 */

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
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
      <div className="flex items-center justify-center h-full" style={{ minHeight: `${minHeight}px` }}>
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }
  return <>{children}</>;
};

