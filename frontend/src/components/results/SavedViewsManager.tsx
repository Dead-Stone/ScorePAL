/**
 * SavedViewsManager - Manage saved filter/view combinations
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Box,
  Typography,
  Alert,
  Divider,
} from '@mui/material';
import {
  Save as SaveIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Bookmark as BookmarkIcon,
} from '@mui/icons-material';

export interface SavedView {
  id: string;
  name: string;
  description?: string;
  filters: {
    searchTerm: string;
    selectedAssignment: string;
    gradeFilter: string;
    dateRange: string;
    sortField: string;
    sortOrder: string;
    viewMode: string;
  };
  createdAt: number;
  updatedAt: number;
}

interface SavedViewsManagerProps {
  open: boolean;
  onClose: () => void;
  currentFilters: SavedView['filters'];
  onLoadView: (view: SavedView) => void;
}

const STORAGE_KEY = 'scorepal_saved_views';

export const SavedViewsManager: React.FC<SavedViewsManagerProps> = ({
  open,
  onClose,
  currentFilters,
  onLoadView,
}) => {
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [editingView, setEditingView] = useState<SavedView | null>(null);
  const [viewName, setViewName] = useState('');
  const [viewDescription, setViewDescription] = useState('');

  useEffect(() => {
    loadSavedViews();
  }, []);

  const loadSavedViews = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSavedViews(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Error loading saved views:', err);
    }
  };

  const saveViews = (views: SavedView[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
      setSavedViews(views);
    } catch (err) {
      console.error('Error saving views:', err);
    }
  };

  const handleSaveCurrent = () => {
    if (!viewName.trim()) {
      return;
    }

    const newView: SavedView = {
      id: editingView?.id || `view_${Date.now()}`,
      name: viewName,
      description: viewDescription,
      filters: { ...currentFilters },
      createdAt: editingView?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    const updatedViews = editingView
      ? savedViews.map(v => v.id === editingView.id ? newView : v)
      : [...savedViews, newView];

    saveViews(updatedViews);
    setViewName('');
    setViewDescription('');
    setEditingView(null);
  };

  const handleDelete = (id: string) => {
    const updatedViews = savedViews.filter(v => v.id !== id);
    saveViews(updatedViews);
  };

  const handleEdit = (view: SavedView) => {
    setEditingView(view);
    setViewName(view.name);
    setViewDescription(view.description || '');
  };

  const handleLoad = (view: SavedView) => {
    onLoadView(view);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <BookmarkIcon />
          Saved Views
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box mb={3}>
          <Typography variant="subtitle2" gutterBottom>
            Save Current Filters
          </Typography>
          <TextField
            fullWidth
            label="View Name"
            value={viewName}
            onChange={(e) => setViewName(e.target.value)}
            margin="dense"
            placeholder="e.g., High Performers, Recent Gradings"
          />
          <TextField
            fullWidth
            label="Description (optional)"
            value={viewDescription}
            onChange={(e) => setViewDescription(e.target.value)}
            margin="dense"
            multiline
            rows={2}
          />
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSaveCurrent}
            disabled={!viewName.trim()}
            sx={{ mt: 1 }}
          >
            {editingView ? 'Update View' : 'Save View'}
          </Button>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" gutterBottom>
          Saved Views ({savedViews.length})
        </Typography>
        {savedViews.length === 0 ? (
          <Alert severity="info">No saved views yet. Save your current filters to get started.</Alert>
        ) : (
          <List>
            {savedViews.map((view) => (
              <ListItem key={view.id}>
                <ListItemText
                  primary={view.name}
                  secondary={
                    <Box>
                      {view.description && (
                        <Typography variant="caption" color="text.secondary">
                          {view.description}
                        </Typography>
                      )}
                      <Box display="flex" gap={0.5} mt={0.5} flexWrap="wrap">
                        {view.filters.selectedAssignment !== 'all' && (
                          <Chip label={`Assignment: ${view.filters.selectedAssignment}`} size="small" />
                        )}
                        {view.filters.gradeFilter !== 'all' && (
                          <Chip label={`Grade: ${view.filters.gradeFilter}`} size="small" />
                        )}
                        {view.filters.dateRange !== 'all' && (
                          <Chip label={`Date: ${view.filters.dateRange}`} size="small" />
                        )}
                      </Box>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" onClick={() => handleLoad(view)} size="small">
                    <BookmarkIcon />
                  </IconButton>
                  <IconButton edge="end" onClick={() => handleEdit(view)} size="small">
                    <EditIcon />
                  </IconButton>
                  <IconButton edge="end" onClick={() => handleDelete(view.id)} size="small">
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

