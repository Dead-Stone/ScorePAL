/**
 * Reusable Metrics Card Component for Analytics
 */

import React from 'react';
import { Card, CardContent, Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  transition: 'transform 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: theme.shadows[8],
  },
}));

interface MetricsCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  subtitle?: string;
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
}

export const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  icon,
  subtitle,
  color = 'primary'
}) => {
  return (
    <StyledCard>
      <CardContent>
        <Box display="flex" alignItems="center" mb={1}>
          {icon && <Box sx={{ mr: 1, color: `${color}.main` }}>{icon}</Box>}
          <Typography variant="h6" fontWeight="medium">
            {title}
          </Typography>
        </Box>
        <Typography variant="h3" fontWeight="bold">
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </StyledCard>
  );
};

