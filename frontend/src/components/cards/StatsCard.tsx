/**
 * StatsCard - Reusable statistics card component with modern design
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 */

import React from 'react';
import { Card, CardContent, Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
  borderRadius: 16,
  border: 'none',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
  },
}));

const IconContainer = styled(Box)<{ color: string }>(({ color }) => ({
  width: 64,
  height: 64,
  borderRadius: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: `linear-gradient(135deg, ${getColorGradient(color).from} 0%, ${getColorGradient(color).to} 100%)`,
  opacity: 0.9,
  '& svg': {
    color: 'white',
  },
}));

const getColorGradient = (color: string) => {
  const gradients: Record<string, { from: string; to: string }> = {
    primary: { from: '#1D80C3', to: '#4F46E5' },
    success: { from: '#10B981', to: '#059669' },
    warning: { from: '#F59E0B', to: '#D97706' },
    error: { from: '#EF4444', to: '#DC2626' },
    info: { from: '#3B82F6', to: '#2563EB' },
  };
  return gradients[color] || gradients.primary;
};

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string | React.ReactNode;
  icon?: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color = 'primary',
}) => {
  return (
    <StyledCard>
      <CardContent sx={{ p: 3 }}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={2}>
          <Box flex={1}>
            <Typography 
              variant="body2" 
              color="text.secondary" 
              gutterBottom
              sx={{ 
                fontWeight: 500,
                fontSize: '0.875rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              {title}
            </Typography>
            <Typography 
              variant="h4" 
              fontWeight="bold"
              sx={{
                background: `linear-gradient(135deg, ${getColorGradient(color).from} 0%, ${getColorGradient(color).to} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 0.5
              }}
            >
              {value}
            </Typography>
            {subtitle && (
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ 
                  fontSize: '0.75rem',
                  mt: 0.5,
                  display: 'block'
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
          {icon && (
            <IconContainer color={color}>
              {icon}
            </IconContainer>
          )}
        </Box>
      </CardContent>
    </StyledCard>
  );
};

