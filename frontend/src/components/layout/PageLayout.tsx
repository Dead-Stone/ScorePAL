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
          pt: disablePadding ? 0 : { xs: DESIGN_CONSTANTS.layout.navBarHeight / 4 + 3, sm: DESIGN_CONSTANTS.layout.navBarHeight / 4 + 3 },
        }}
      >
        {children}
      </Container>
    </div>
  );
};

