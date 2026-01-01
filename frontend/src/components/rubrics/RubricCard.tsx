/**
 * RubricCard - Card component for displaying a rubric
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 */

import React from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Tooltip,
  Box,
  Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

interface GradingCriteria {
  name: string;
  max_points: number;
}

interface Rubric {
  id: string;
  name: string;
  description?: string;
  criteria: GradingCriteria[];
  total_points: number;
  strictness?: number;
}

interface RubricCardProps {
  rubric: Rubric;
  onView: (rubric: Rubric) => void;
  onEdit: (rubric: Rubric) => void;
  onDelete: (rubricId: string) => void;
}

export const RubricCard: React.FC<RubricCardProps> = ({
  rubric,
  onView,
  onEdit,
  onDelete,
}) => {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        title={rubric.name}
        subheader={`${rubric.total_points} points • ${rubric.criteria.length} criteria`}
      />
      <CardContent sx={{ flexGrow: 1 }}>
        {rubric.description && (
          <Chip
            label={rubric.description}
            size="small"
            variant="outlined"
            sx={{ mb: 2 }}
          />
        )}
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Criteria:
          </Typography>
          <Box sx={{ mt: 1 }}>
            {rubric.criteria.slice(0, 3).map((criterion, idx) => (
              <Chip
                key={idx}
                label={`${criterion.name} (${criterion.max_points} pts)`}
                size="small"
                sx={{ mr: 0.5, mb: 0.5 }}
              />
            ))}
            {rubric.criteria.length > 3 && (
              <Chip
                label={`+${rubric.criteria.length - 3} more`}
                size="small"
                variant="outlined"
              />
            )}
          </Box>
        </Box>
      </CardContent>
      <CardActions>
        <Tooltip title="View Details">
          <IconButton size="small" onClick={() => onView(rubric)}>
            <VisibilityIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => onEdit(rubric)}>
            <EditIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton
            size="small"
            color="error"
            onClick={() => onDelete(rubric.id)}
          >
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
};

