/**
 * ScorePAL - Settings Page
 * Refactored to use modular components
 */

import React, { useState, useEffect } from 'react';
import { GetStaticProps } from 'next';
import axios from 'axios';
import { Layers, Settings as SettingsIcon } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { PageLayout } from '../components/layout/PageLayout';
import { Alert, AlertDescription } from '../components/ui/alert';
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
  return {
    props: {},
    revalidate: 3600,
  };
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
      console.error('Error fetching LMS settings:', err);
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
      <PageLayout maxWidth="lg">
        {message && (
          <Alert className={`mb-6 ${
            message.type === 'success' ? 'bg-green-50 border-green-200' :
            message.type === 'error' ? 'bg-red-50 border-red-200' :
            'bg-blue-50 border-blue-200'
          }`}>
            <AlertDescription className={
              message.type === 'success' ? 'text-green-800' :
              message.type === 'error' ? 'text-red-800' :
              'text-blue-800'
            }>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'lms' 
                ? 'text-blue-600 border-blue-600' 
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('lms')}
          >
            <Layers className="w-4 h-4 inline mr-2" />
            LMS Integrations
          </button>
          <button
            className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'general' 
                ? 'text-blue-600 border-blue-600' 
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('general')}
          >
            <SettingsIcon className="w-4 h-4 inline mr-2" />
            General
          </button>
        </div>

        {activeTab === 'lms' && (
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
        )}

        {activeTab === 'general' && (
          <GeneralSettingsTab user={user} />
        )}
      </PageLayout>
    </ProtectedRoute>
  );
}
