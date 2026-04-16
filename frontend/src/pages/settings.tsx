/**
 * ScorePAL - Modern Settings Page
 * Sleek configuration management interface
 */

import React, { useState, useEffect } from 'react';
import { GetStaticProps } from 'next';
import axios from 'axios';
import { 
  Layers, 
  Settings as SettingsIcon, 
  Link2, 
  Plus, 
  Trash2, 
  Edit2, 
  CheckCircle2, 
  XCircle,
  ExternalLink,
  Shield,
  Zap,
  Globe,
  Key,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { TopNavBar } from '../components/layout/TopNavBar';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { LMSConfig, Message } from '../components/settings/types';
import {
  fetchLmsConfigurations,
  saveLmsConfig,
  testLmsConfig,
  removeLmsConfig,
} from '../components/settings/utils';
import { LMSIntegrationsTab } from '../components/settings/LMSIntegrationsTab';
import { GeneralSettingsTab } from '../components/settings/GeneralSettingsTab';
import { API_BASE_URL } from '../config/api';
import { extractErrorMessage } from '../utils/errorUtils';
import { cn } from '@/lib/utils';

axios.defaults.baseURL = API_BASE_URL;
axios.defaults.headers.common['Accept'] = 'application/json';
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getStaticProps: GetStaticProps = async () => {
  return { props: {}, revalidate: 3600 };
};

export default function SettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [lmsConfigs, setLmsConfigs] = useState<LMSConfig[]>([]);
  const [activeTab, setActiveTab] = useState<'lms' | 'general'>('lms');
  const [showAddLms, setShowAddLms] = useState(false);
  const [editingConfig, setEditingConfig] = useState<LMSConfig | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    instanceUrl: '',
    apiKey: '',
    name: '',
  });

  useEffect(() => {
    loadLmsConfigurations();
  }, []);

  const loadLmsConfigurations = async () => {
    try {
      setLoading(true);
      const configs = await fetchLmsConfigurations();
      setLmsConfigs(configs);
    } catch (err: any) {
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLmsConfig = async (lmsType: string) => {
    try {
      setLoading(true);
      setMessage(null);
      
      await saveLmsConfig(
        lmsType,
        formData.instanceUrl,
        formData.apiKey,
        lmsConfigs,
        editingConfig
      );
      
      setMessage({ type: 'success', text: 'Canvas settings saved successfully!' });
      setShowAddLms(false);
      setEditingConfig(null);
      setFormData({ instanceUrl: '', apiKey: '', name: '' });
      await loadLmsConfigurations();
    } catch (err: any) {
      const errorMessage = err.message === 'Cancelled by user' 
        ? null 
        : extractErrorMessage(err, err.message || 'Failed to save settings');
      if (errorMessage) {
        setMessage({ type: 'error', text: errorMessage });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTestLmsConfig = async (config: LMSConfig) => {
    try {
      setTesting(config.id);
      setMessage(null);
      
      const result = await testLmsConfig(config);
      
      if (result.isValid) {
        const userInfo = result.userInfo;
        const roles = userInfo?.roles || [];
        const roleText = roles.length > 0 ? ` (${roles.join(', ')})` : '';
        setMessage({ 
          type: 'success', 
          text: `Canvas API key is valid! Connected as: ${userInfo?.name || 'User'}${roleText}` 
        });
        
        setLmsConfigs(prev => prev.map(c => 
          c.id === config.id 
            ? { ...c, isValid: true, userInfo, lastTested: new Date().toISOString() }
            : c
        ));
      }
    } catch (err: any) {
      const errorMessage = extractErrorMessage(err, err.message || 'Failed to test API key');
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setTesting(null);
    }
  };

  const handleRemoveLmsConfig = async (config: LMSConfig) => {
    try {
      setLoading(true);
      await removeLmsConfig(config);
      await loadLmsConfigurations();
      setMessage({ type: 'success', text: `${config.name} removed successfully` });
    } catch (err: any) {
      if (err.message !== 'Cancelled by user') {
        const errorMessage = extractErrorMessage(err, 'Failed to remove configuration');
        setMessage({ type: 'error', text: errorMessage });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditConfig = (config: LMSConfig) => {
    setEditingConfig(config);
    setFormData({
      instanceUrl: config.instanceUrl,
      apiKey: '',
      name: config.name,
    });
    setShowAddLms(true);
  };

  const handleCloseForm = () => {
    setShowAddLms(false);
    setEditingConfig(null);
    setFormData({ instanceUrl: '', apiKey: '', name: '' });
  };

  const handleFormDataChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen page-gradient">
        <TopNavBar />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pt-24">
          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              <span className="gradient-text">Settings</span>
            </h1>
            <p className="text-gray-500">
              Manage your integrations and application preferences
            </p>
          </div>

          {/* Notification */}
          {message && (
            <Alert className={cn(
              "mb-6 rounded-xl animate-fade-in-down",
              message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
              message.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
              'bg-blue-50 border-blue-200 text-blue-800'
            )}>
              <div className="flex items-center gap-3">
                {message.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : message.type === 'error' ? (
                  <XCircle className="w-5 h-5 text-rose-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-blue-600" />
                )}
                <AlertDescription className="font-medium">{message.text}</AlertDescription>
              </div>
            </Alert>
          )}

          {/* Tabs */}
          <div className="flex items-center gap-2 p-1.5 bg-gray-100/80 rounded-xl w-fit mb-8 animate-fade-in-up">
            <button
              onClick={() => setActiveTab('lms')}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200",
                activeTab === 'lms'
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
              )}
            >
              <Layers className="w-4 h-4" />
              LMS Integrations
            </button>
            <button
              onClick={() => setActiveTab('general')}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200",
                activeTab === 'general'
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
              )}
            >
              <SettingsIcon className="w-4 h-4" />
              General
            </button>
          </div>

          {/* LMS Integrations Tab */}
          {activeTab === 'lms' && (
            <div className="space-y-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              {/* Connected Integrations */}
              <Card className="card-modern">
                <CardHeader className="border-b border-gray-100 bg-gray-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-teal-500/25">
                        <Link2 className="w-6 h-6" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-semibold text-gray-900">
                          LMS Connections
                        </CardTitle>
                        <CardDescription className="text-gray-500">
                          Connect your Learning Management System for seamless grading
                        </CardDescription>
                      </div>
                    </div>
                    <Button 
                      onClick={() => setShowAddLms(true)}
                      className="btn-primary"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Connection
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <LMSIntegrationsTab
                    lmsConfigs={lmsConfigs}
                    showAddLms={showAddLms}
                    editingConfig={editingConfig}
                    formData={formData}
                    loading={loading}
                    testing={testing}
                    onShowAddLms={() => setShowAddLms(true)}
                    onFormDataChange={handleFormDataChange}
                    onSave={handleSaveLmsConfig}
                    onTest={handleTestLmsConfig}
                    onEdit={handleEditConfig}
                    onRemove={handleRemoveLmsConfig}
                    onCloseForm={handleCloseForm}
                  />
                </CardContent>
              </Card>

              {/* Integration Benefits */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-6 rounded-2xl bg-white/70 border border-gray-100">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
                    <Zap className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Auto-Sync</h3>
                  <p className="text-sm text-gray-500">
                    Automatically sync assignments and submissions from Canvas
                  </p>
                </div>
                <div className="p-6 rounded-2xl bg-white/70 border border-gray-100">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center mb-4">
                    <Shield className="w-5 h-5 text-violet-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Secure</h3>
                  <p className="text-sm text-gray-500">
                    Your API keys are encrypted and stored securely
                  </p>
                </div>
                <div className="p-6 rounded-2xl bg-white/70 border border-gray-100">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center mb-4">
                    <Globe className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Grade Posting</h3>
                  <p className="text-sm text-gray-500">
                    Post grades directly back to Canvas with one click
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* General Settings Tab */}
          {activeTab === 'general' && (
            <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <Card className="card-modern">
                <CardHeader className="border-b border-gray-100 bg-gray-50/50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/25">
                      <SettingsIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-semibold text-gray-900">
                        General Settings
                      </CardTitle>
                      <CardDescription className="text-gray-500">
                        Configure application preferences and defaults
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <GeneralSettingsTab user={user} />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
