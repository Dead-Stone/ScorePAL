/**
 * Text Content Card Component
 */

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Divider,
  Box,
} from '@mui/material';

interface TextContentCardProps {
  title: string;
  content: string;
}

export const TextContentCard: React.FC<TextContentCardProps> = ({ title, content }) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ maxHeight: 300, overflow: 'auto', bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
          <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
            {content}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};
