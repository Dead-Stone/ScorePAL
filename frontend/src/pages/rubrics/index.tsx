/**
 * ScorePAL - Rubrics Management
 * Create, edit, and manage grading rubrics (Teachers and Graders only)
 * Statically generated at build time - data fetched client-side
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 */

import React, { useState, useEffect } from 'react';
import { GetStaticProps } from 'next';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { TopNavBar } from '@/components/layout/TopNavBar';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '@/config/api';
import apiClient from '@/utils/apiClient';
import { RubricCard } from '@/components/rubrics/RubricCard';
import { RubricForm } from '@/components/rubrics/RubricForm';
import { RubricViewDialog } from '@/components/rubrics/RubricViewDialog';
import AddIcon from '@mui/icons-material/Add';

// Configure axios
axios.defaults.baseURL = API_BASE_URL;
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface GradingCriteria {
  name: string;
  description: string;
  max_points: number;
  weight?: number;
  levels?: any[];
}

interface Rubric {
  id: string;
  name: string;
  description?: string;
  criteria: GradingCriteria[];
  total_points: number;
  strictness?: number;
  created_at?: string;
  updated_at?: string;
}

// Static generation - compile at build time only
export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {},
    revalidate: 3600, // Revalidate every hour
  };
};

export default function RubricsPage() {
  const { user } = useAuth();
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRubric, setEditingRubric] = useState<Rubric | null>(null);
  const [viewingRubric, setViewingRubric] = useState<Rubric | null>(null);
  const [openViewDialog, setOpenViewDialog] = useState(false);

  useEffect(() => {
    fetchRubrics();
  }, []);

  const fetchRubrics = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/rubrics');
      setRubrics(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load rubrics');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingRubric(null);
    setOpenDialog(true);
  };

  const handleOpenEdit = (rubric: Rubric) => {
    setEditingRubric(rubric);
    setOpenDialog(true);
  };

  const handleOpenView = (rubric: Rubric) => {
    setViewingRubric(rubric);
    setOpenViewDialog(true);
  };

  const handleSave = async (formData: any) => {
    try {
      if (editingRubric) {
        await apiClient.put(`/rubrics/${editingRubric.id}`, formData);
      } else {
        await apiClient.post('/rubrics', formData);
      }

      setOpenDialog(false);
      fetchRubrics();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save rubric');
    }
  };

  const handleDelete = async (rubricId: string) => {
    if (!confirm('Are you sure you want to delete this rubric?')) return;

    try {
      await apiClient.delete(`/rubrics/${rubricId}`);
      fetchRubrics();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete rubric');
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['teacher', 'grader', 'admin']}>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
          <TopNavBar />
          <Container maxWidth="xl" sx={{ py: 6, pt: { xs: 12, sm: 12 } }}>
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
              <CircularProgress />
            </Box>
          </Container>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['teacher', 'grader', 'admin']}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <TopNavBar />
        <Container maxWidth="xl" sx={{ py: 6, pt: { xs: 12, sm: 12 } }}>
          {/* Header */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
            <Box>
              <Typography 
                variant="h3" 
                fontWeight="bold" 
                gutterBottom
                sx={{ 
                  background: 'linear-gradient(135deg, #1D80C3 0%, #4F46E5 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1
                }}
              >
                Rubrics Management
              </Typography>
            <Typography variant="body2" color="text.secondary">
              Create and manage grading rubrics for consistent evaluation
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
          >
            Create Rubric
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Rubrics Grid */}
        {rubrics.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              No rubrics yet
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Create your first rubric to get started with consistent grading.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreate}
              sx={{ mt: 2 }}
            >
              Create Your First Rubric
            </Button>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {rubrics.map((rubric) => (
              <Grid item xs={12} md={6} lg={4} key={rubric.id}>
                <RubricCard
                  rubric={rubric}
                  onView={handleOpenView}
                  onEdit={handleOpenEdit}
                  onDelete={handleDelete}
                />
              </Grid>
            ))}
          </Grid>
        )}

        {/* Create/Edit Dialog */}
        <RubricForm
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          onSave={handleSave}
          editingRubric={editingRubric || undefined}
        />

        {/* View Dialog */}
        <RubricViewDialog
          open={openViewDialog}
          onClose={() => setOpenViewDialog(false)}
          rubric={viewingRubric}
          onEdit={() => editingRubric && handleOpenEdit(editingRubric)}
        />
        </Container>
      </div>
    </ProtectedRoute>
  );
}
