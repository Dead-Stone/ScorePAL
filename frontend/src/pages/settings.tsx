/**
 * ScorePAL - Settings Page
 * User settings including Canvas API key management
 * Statically generated at build time - data fetched client-side
 */

import React, { useState, useEffect } from 'react';
import { GetStaticProps } from 'next';
import { useAuth } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { PageLayout } from '../components/layout/PageLayout';
import { PageHeader } from '../components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  Settings as SettingsIcon, 
  Key, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  ExternalLink,
  Info,
  BarChart3,
  Zap,
  GraduationCap
} from 'lucide-react';
import axios from 'axios';
import Link from 'next/link';
import { API_BASE_URL } from '../config/api';

axios.defaults.baseURL = API_BASE_URL;
axios.defaults.headers.common['Accept'] = 'application/json';
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Static generation - compile at build time only
export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {},
    revalidate: 3600, // Revalidate every hour
  };
};

export default function SettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  
  const [canvasApiKey, setCanvasApiKey] = useState('');
  const [canvasUrl, setCanvasUrl] = useState('https://canvas.instructure.com');
  const [canvasConfigured, setCanvasConfigured] = useState(false);
  const [canvasValid, setCanvasValid] = useState(false);
  const [canvasUserInfo, setCanvasUserInfo] = useState<any>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/settings/canvas');
      setCanvasConfigured(response.data.canvas_key_configured || false);
      setCanvasValid(response.data.canvas_key_valid || false);
      setCanvasUrl(response.data.canvas_url || 'https://canvas.instructure.com');
    } catch (err: any) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCanvasSettings = async () => {
    try {
      setLoading(true);
      setMessage(null);
      
      const response = await axios.put('/api/settings/canvas', {
        canvas_api_key: canvasApiKey,
        canvas_url: canvasUrl
      });
      
      if (response.data.status === 'success') {
        setMessage({ type: 'success', text: 'Canvas settings saved successfully!' });
        setCanvasConfigured(true);
        setCanvasApiKey('');
        await fetchSettings();
      }
    } catch (err: any) {
      console.error('Error saving Canvas settings:', err);
      let errorMessage = 'Failed to save settings';
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (Array.isArray(detail)) {
          errorMessage = detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
        } else if (typeof detail === 'string') {
          errorMessage = detail;
        }
      }
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleTestCanvasKey = async () => {
    try {
      setTesting(true);
      setMessage(null);
      
      if (canvasApiKey) {
        await axios.put('/api/settings/canvas', {
          canvas_api_key: canvasApiKey,
          canvas_url: canvasUrl
        });
      }
      
      const response = await axios.post('/api/settings/canvas/test');
      
      if (response.data.valid) {
        const userInfo = response.data.user_info;
        const roles = userInfo?.roles || [];
        const roleText = roles.length > 0 ? ` (${roles.join(', ')})` : '';
        setMessage({ 
          type: 'success', 
          text: `Canvas API key is valid! Connected as: ${userInfo?.name || 'User'}${roleText}` 
        });
        setCanvasValid(true);
        setCanvasUserInfo(userInfo);
        await fetchSettings();
      } else {
        setMessage({ type: 'error', text: response.data.message || 'Canvas API key test failed' });
        setCanvasValid(false);
      }
    } catch (err: any) {
      console.error('Error testing Canvas key:', err);
      let errorMessage = 'Failed to test API key';
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (Array.isArray(detail)) {
          errorMessage = detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
        } else if (typeof detail === 'string') {
          errorMessage = detail;
        }
      }
      setMessage({ type: 'error', text: errorMessage });
      setCanvasValid(false);
    } finally {
      setTesting(false);
    }
  };

  return (
    <ProtectedRoute>
      <PageLayout maxWidth="lg">
        <PageHeader
          title="Settings"
          subtitle="Manage your account settings and integrations"
        />

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

          {/* Canvas Integration Settings */}
          <Card className="mb-6 shadow-md border-0">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Key className="w-6 h-6 text-blue-600" />
                Canvas LMS Integration
              </CardTitle>
              <CardDescription className="text-base mt-1">
                Configure your Canvas API key to pull course data, assignments, and submissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">How to get your Canvas API key:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Log in to your Canvas instance</li>
                      <li>Go to <strong>Account</strong> → <strong>Settings</strong></li>
                      <li>Scroll down to <strong>Approved Integrations</strong></li>
                      <li>Click <strong>+ New Access Token</strong></li>
                      <li>Enter a purpose/description and click <strong>Generate Token</strong></li>
                      <li>Copy the generated token immediately (it won't be shown again)</li>
                    </ol>
                    <a 
                      href="https://canvas.instructure.com/doc/api/file.oauth.html" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center gap-1 mt-2"
                    >
                      Learn more about Canvas API tokens <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="canvas-url">Canvas Instance URL</Label>
                  <Input
                    id="canvas-url"
                    type="text"
                    placeholder="https://canvas.instructure.com"
                    value={canvasUrl}
                    onChange={(e) => setCanvasUrl(e.target.value)}
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Your Canvas instance URL (e.g., https://your-school.instructure.com)
                  </p>
                </div>

                <div>
                  <Label htmlFor="canvas-api-key">Canvas API Key</Label>
                  <Input
                    id="canvas-api-key"
                    type="password"
                    placeholder={canvasConfigured ? "••••••••••••" : "Enter your Canvas API key"}
                    value={canvasApiKey}
                    onChange={(e) => setCanvasApiKey(e.target.value)}
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {canvasConfigured 
                      ? "API key is configured. Enter a new key to update it."
                      : "Your Canvas API key (will be stored securely)"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleSaveCanvasSettings}
                    disabled={loading || !canvasApiKey || !canvasUrl}
                    className="flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Key className="w-4 h-4" />
                        Save Settings
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={handleTestCanvasKey}
                    disabled={testing || (!canvasApiKey && !canvasConfigured)}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    {testing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        {canvasValid ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                        Test Connection
                      </>
                    )}
                  </Button>
                </div>

                {canvasConfigured && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      {canvasValid ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span className="text-green-700 font-medium">API key is valid and configured</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-yellow-600" />
                          <span className="text-yellow-700">API key configured but not tested</span>
                        </>
                      )}
                    </div>
                    {canvasUserInfo && (
                      <div className="mt-2 space-y-1">
                        <div className="text-xs text-gray-600">
                          Connected as: <strong>{canvasUserInfo.name}</strong> ({canvasUserInfo.email})
                        </div>
                        {canvasUserInfo.roles && canvasUserInfo.roles.length > 0 && (
                          <div className="text-xs text-gray-600">
                            Canvas Roles: <strong>{canvasUserInfo.roles.join(', ')}</strong>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Canvas Connected Status */}
          {canvasValid && canvasConfigured && (
            <Card className="mb-6 border-green-200 bg-gradient-to-r from-green-50 to-blue-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-800">Canvas Connected!</h3>
                    <p className="text-sm text-gray-600">
                      Your Canvas integration is ready. Go to the Grade tab to start grading Canvas submissions.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* API Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Integration Status</CardTitle>
              <CardDescription>
                Current status of your external integrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${canvasValid ? 'bg-green-500' : canvasConfigured ? 'bg-yellow-500' : 'bg-gray-300'}`}></div>
                    <div>
                      <div className="font-medium text-sm">Canvas LMS</div>
                      <div className="text-xs text-gray-500">
                        {canvasValid ? 'Connected and verified' : canvasConfigured ? 'Configured, needs testing' : 'Not configured'}
                      </div>
                    </div>
                  </div>
                  {canvasValid && (
                    <span className="text-xs text-green-600 font-medium">Active</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
      </PageLayout>
    </ProtectedRoute>
  );
}
