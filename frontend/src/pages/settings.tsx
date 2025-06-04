import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Divider,
  Card,
  CardContent,
  Grid,
  Switch,
  FormControlLabel,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Save as SaveIcon,
  Science as TestIcon,
  School as CanvasIcon,
  Book as MoodleIcon,
} from '@mui/icons-material';

interface APIConfig {
  canvas: {
    apiKey: string;
    url: string;
    enabled: boolean;
  };
  moodle: {
    apiKey: string;
    url: string;
    token: string;
    enabled: boolean;
  };
}

const Settings: React.FC = () => {
  const [config, setConfig] = useState<APIConfig>({
    canvas: {
      apiKey: '',
      url: 'https://sjsu.instructure.com',
      enabled: false,
    },
    moodle: {
      apiKey: '',
      url: '',
      token: '',
      enabled: false,
    },
  });

  const [showPasswords, setShowPasswords] = useState({
    canvasKey: false,
    moodleKey: false,
    moodleToken: false,
  });

  const [alerts, setAlerts] = useState<{
    canvas?: { type: 'success' | 'error'; message: string };
    moodle?: { type: 'success' | 'error'; message: string };
    save?: { type: 'success' | 'error'; message: string };
  }>({});

  const [loading, setLoading] = useState({
    canvasTest: false,
    moodleTest: false,
    save: false,
  });

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedConfig = localStorage.getItem('scorepal_settings');
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        
        // Ensure backward compatibility by merging with default config
        setConfig(prev => ({
          canvas: {
            ...prev.canvas,
            ...parsedConfig.canvas,
          },
          moodle: {
            ...prev.moodle,
            ...(parsedConfig.moodle || {}),
          },
        }));
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  }, []);

  const handleConfigChange = (platform: 'canvas' | 'moodle', field: string, value: string | boolean) => {
    setConfig(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        [field]: value,
      },
    }));
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const testCanvasConnection = async () => {
    if (!config.canvas.apiKey) {
      setAlerts(prev => ({
        ...prev,
        canvas: { type: 'error', message: 'Please enter a Canvas API key' },
      }));
      return;
    }

    setLoading(prev => ({ ...prev, canvasTest: true }));
    setAlerts(prev => ({ ...prev, canvas: undefined }));

    try {
      const response = await fetch('/api/canvas/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: config.canvas.apiKey,
        }),
      });

      const result = await response.json();

      if (result.status === 'success') {
        setAlerts(prev => ({
          ...prev,
          canvas: { type: 'success', message: 'Canvas connection successful!' },
        }));
        handleConfigChange('canvas', 'enabled', true);
      } else {
        setAlerts(prev => ({
          ...prev,
          canvas: { type: 'error', message: result.message || 'Connection failed' },
        }));
        handleConfigChange('canvas', 'enabled', false);
      }
    } catch (error) {
      setAlerts(prev => ({
        ...prev,
        canvas: { type: 'error', message: 'Network error. Please try again.' },
      }));
      handleConfigChange('canvas', 'enabled', false);
    } finally {
      setLoading(prev => ({ ...prev, canvasTest: false }));
    }
  };

  const testMoodleConnection = async () => {
    if (!config.moodle.apiKey || !config.moodle.url) {
      setAlerts(prev => ({
        ...prev,
        moodle: { type: 'error', message: 'Please enter Moodle URL and API key' },
      }));
      return;
    }

    setLoading(prev => ({ ...prev, moodleTest: true }));
    setAlerts(prev => ({ ...prev, moodle: undefined }));

    try {
      // Note: This would need to be implemented in the backend
      const response = await fetch('/api/moodle/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: config.moodle.url,
          api_key: config.moodle.apiKey,
          token: config.moodle.token,
        }),
      });

      const result = await response.json();

      if (result.status === 'success') {
        setAlerts(prev => ({
          ...prev,
          moodle: { type: 'success', message: 'Moodle connection successful!' },
        }));
        handleConfigChange('moodle', 'enabled', true);
      } else {
        setAlerts(prev => ({
          ...prev,
          moodle: { type: 'error', message: result.message || 'Connection failed' },
        }));
        handleConfigChange('moodle', 'enabled', false);
      }
    } catch (error) {
      setAlerts(prev => ({
        ...prev,
        moodle: { type: 'error', message: 'Network error. Please try again.' },
      }));
      handleConfigChange('moodle', 'enabled', false);
    } finally {
      setLoading(prev => ({ ...prev, moodleTest: false }));
    }
  };

  const saveSettings = () => {
    setLoading(prev => ({ ...prev, save: true }));
    
    try {
      localStorage.setItem('scorepal_settings', JSON.stringify(config));
      setAlerts(prev => ({
        ...prev,
        save: { type: 'success', message: 'Settings saved successfully!' },
      }));
      
      // Store integration status globally for navigation
      localStorage.setItem('integrations_enabled', JSON.stringify({
        canvas: config.canvas.enabled,
        moodle: config.moodle.enabled,
      }));
      
      // Clear save alert after 3 seconds
      setTimeout(() => {
        setAlerts(prev => ({ ...prev, save: undefined }));
      }, 3000);
    } catch (error) {
      setAlerts(prev => ({
        ...prev,
        save: { type: 'error', message: 'Error saving settings. Please try again.' },
      }));
    } finally {
      setLoading(prev => ({ ...prev, save: false }));
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Header content removed */}

        {alerts.save && (
          <Alert severity={alerts.save.type} sx={{ mb: 3 }}>
            {alerts.save.message}
          </Alert>
        )}

        <Grid container spacing={4}>
          {/* Canvas Configuration */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CanvasIcon sx={{ mr: 1, color: '#e13d2b' }} />
                  <Typography variant="h6">Canvas LMS</Typography>
                </Box>

                <FormControlLabel
                  control={
                    <Switch
                      checked={config.canvas.enabled}
                      onChange={(e) => handleConfigChange('canvas', 'enabled', e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Enable Canvas Integration"
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  label="Canvas URL"
                  value={config.canvas.url}
                  onChange={(e) => handleConfigChange('canvas', 'url', e.target.value)}
                  sx={{ mb: 2 }}
                  disabled
                  helperText="Currently locked to SJSU Canvas"
                />

                <TextField
                  fullWidth
                  label="Canvas API Key"
                  type={showPasswords.canvasKey ? 'text' : 'password'}
                  value={config.canvas.apiKey}
                  onChange={(e) => handleConfigChange('canvas', 'apiKey', e.target.value)}
                  sx={{ mb: 2 }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => togglePasswordVisibility('canvasKey')}
                          edge="end"
                        >
                          {showPasswords.canvasKey ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  helperText="Get your API key from Canvas Account > Settings > Approved Integrations"
                />

                {alerts.canvas && (
                  <Alert severity={alerts.canvas.type} sx={{ mb: 2 }}>
                    {alerts.canvas.message}
                  </Alert>
                )}

                <Button
                  variant="outlined"
                  startIcon={<TestIcon />}
                  onClick={testCanvasConnection}
                  disabled={!config.canvas.apiKey || loading.canvasTest}
                  fullWidth
                >
                  {loading.canvasTest ? 'Testing...' : 'Test Connection'}
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Moodle Configuration */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <MoodleIcon sx={{ mr: 1, color: '#f88900' }} />
                  <Typography variant="h6">Moodle</Typography>
                </Box>

                <FormControlLabel
                  control={
                    <Switch
                      checked={config.moodle.enabled}
                      onChange={(e) => handleConfigChange('moodle', 'enabled', e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Enable Moodle Integration"
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  label="Moodle URL"
                  value={config.moodle.url}
                  onChange={(e) => handleConfigChange('moodle', 'url', e.target.value)}
                  sx={{ mb: 2 }}
                  placeholder="https://your-moodle-site.com"
                />

                <TextField
                  fullWidth
                  label="Moodle API Key"
                  type={showPasswords.moodleKey ? 'text' : 'password'}
                  value={config.moodle.apiKey}
                  onChange={(e) => handleConfigChange('moodle', 'apiKey', e.target.value)}
                  sx={{ mb: 2 }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => togglePasswordVisibility('moodleKey')}
                          edge="end"
                        >
                          {showPasswords.moodleKey ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  label="Moodle Token"
                  type={showPasswords.moodleToken ? 'text' : 'password'}
                  value={config.moodle.token}
                  onChange={(e) => handleConfigChange('moodle', 'token', e.target.value)}
                  sx={{ mb: 2 }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => togglePasswordVisibility('moodleToken')}
                          edge="end"
                        >
                          {showPasswords.moodleToken ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  helperText="Web service token from Moodle administration"
                />

                {alerts.moodle && (
                  <Alert severity={alerts.moodle.type} sx={{ mb: 2 }}>
                    {alerts.moodle.message}
                  </Alert>
                )}

                <Button
                  variant="outlined"
                  startIcon={<TestIcon />}
                  onClick={testMoodleConnection}
                  disabled={!config.moodle.apiKey || !config.moodle.url || loading.moodleTest}
                  fullWidth
                >
                  {loading.moodleTest ? 'Testing...' : 'Test Connection'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Save Button */}
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<SaveIcon />}
            onClick={saveSettings}
            disabled={loading.save}
            sx={{ minWidth: 200 }}
          >
            {loading.save ? 'Saving...' : 'Save Settings'}
          </Button>
        </Box>

        {/* Information Section */}
        <Paper sx={{ p: 3, mt: 4, bgcolor: 'grey.50' }}>
          <Typography variant="h6" gutterBottom>
            Integration Information
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            • Canvas integration allows you to sync assignments and submissions directly from your Canvas courses
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            • Moodle integration enables automatic grading workflow with your Moodle courses
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • API keys are stored locally in your browser and are not sent to external servers except for testing connections
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default Settings; 