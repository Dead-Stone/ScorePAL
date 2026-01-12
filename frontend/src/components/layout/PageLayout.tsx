/**
 * PageLayout - Consistent page wrapper component
 * Provides standardized layout structure for all pages
 */

import React from 'react';
import { Container, Box } from '@mui/material';
import { TopNavBar } from './TopNavBar';
import { DESIGN_CONSTANTS } from '@/constants/design';

interface PageLayoutProps {
  children: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  disablePadding?: boolean;
  className?: string;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  maxWidth = DESIGN_CONSTANTS.spacing.containerMaxWidth,
  disablePadding = false,
  className = '',
}) => {
  return (
    <div className={`min-h-screen ${DESIGN_CONSTANTS.colors.background.gradient} ${className}`}>
      <TopNavBar />
      <Container
        maxWidth={maxWidth}
        sx={{
          py: disablePadding ? 0 : DESIGN_CONSTANTS.spacing.pagePadding,
          pt: disablePadding ? 0 : { xs: 28, sm: 28 }, // Account for nav bar (64px) + tab bar (48px) = 112px = 28 * 4px
        }}
      >
        {children}
      </Container>
    </div>
  );
};


