/**
 * RubricViewDialog - Dialog component for viewing rubric details
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 */

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';

interface GradingCriteria {
  name: string;
  description?: string;
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

interface RubricViewDialogProps {
  open: boolean;
  onClose: () => void;
  rubric: Rubric | null;
  onEdit: () => void;
}

export const RubricViewDialog: React.FC<RubricViewDialogProps> = ({
  open,
  onClose,
  rubric,
  onEdit,
}) => {
  if (!rubric) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{rubric.name}</DialogTitle>
      <DialogContent>
        {rubric.description && (
          <Typography variant="body1" paragraph>
            {rubric.description}
          </Typography>
        )}
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" gutterBottom>
          Criteria ({rubric.criteria.length})
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Criterion</TableCell>
                <TableCell align="right">Max Points</TableCell>
                <TableCell>Description</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rubric.criteria.map((criterion, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {criterion.name}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{criterion.max_points}</TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {criterion.description || 'No description'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">
            Total Points: <strong>{rubric.total_points}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Strictness: <strong>{rubric.strictness || 0.5}</strong>
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          startIcon={<EditIcon />}
          onClick={() => {
            onClose();
            onEdit();
          }}
        >
          Edit
        </Button>
      </DialogActions>
    </Dialog>
  );
};

