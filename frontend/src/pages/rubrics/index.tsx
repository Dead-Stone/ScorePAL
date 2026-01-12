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
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { TopNavBar } from '@/components/layout/TopNavBar';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '@/config/api';
import apiClient from '@/utils/apiClient';
import { RubricCard } from '@/components/rubrics/RubricCard';
import { RubricForm } from '@/components/rubrics/RubricForm';
import { RubricViewDialog } from '@/components/rubrics/RubricViewDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Loader2, AlertCircle, FileText } from 'lucide-react';

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
  description?: string;
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
            <div className="flex items-center justify-center min-h-[60vh]">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['teacher', 'grader', 'admin']}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <TopNavBar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pt-28">
          {/* Action Button */}
          <div className="flex justify-end mb-6">
            <Button
              onClick={handleOpenCreate}
              className="bg-blue-600 hover:bg-blue-700 text-white h-9"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Rubric
            </Button>
          </div>

          {error && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          {/* Rubrics Grid */}
          {rubrics.length === 0 ? (
            <Card className="border-0 shadow-md">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No rubrics yet</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Create your first rubric to get started with consistent grading.
                </p>
                <Button
                  onClick={handleOpenCreate}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Rubric
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rubrics.map((rubric) => (
                <RubricCard
                  key={rubric.id}
                  rubric={rubric}
                  onView={handleOpenView}
                  onEdit={handleOpenEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
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
        </div>
      </div>
    </ProtectedRoute>
  );
}
