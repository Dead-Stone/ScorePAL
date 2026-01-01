/**
 * PageHeader - Consistent page header component
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import { DESIGN_CONSTANTS } from '@/constants/design';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  gradient?: boolean;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  action,
  gradient = true,
}) => {
  return (
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems="flex-start"
      mb={DESIGN_CONSTANTS.spacing.sectionGap}
      flexWrap="wrap"
      gap={2}
    >
      <Box>
        <Typography
          variant="h3"
          fontWeight="bold"
          gutterBottom
          sx={gradient ? DESIGN_CONSTANTS.typography.gradientText : {}}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1rem' }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action && <Box>{action}</Box>}
    </Box>
  );
};

