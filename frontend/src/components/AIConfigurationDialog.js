import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  Typography,
  Alert,
  Switch,
  FormControlLabel,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  PlayArrow as TestIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

const PROVIDER_COLORS = {
  openai: '#10A37F',
  anthropic: '#D97757',
  google: '#4285F4',
  perplexity: '#20B2AA',
  huggingface: '#FF9900',
  cohere: '#39594C'
};

const PROVIDER_ICONS = {
  openai: '🤖',
  anthropic: '🧠',
  google: '💎',
  perplexity: '🔮',
  huggingface: '🆓',
  cohere: '🌊'
};

const AI_PROVIDERS = [
  { value: 'openai', label: 'OpenAI', description: 'GPT-4o, GPT-4 Turbo, GPT-3.5 Turbo (Latest models)' },
  { value: 'google', label: 'Google Gemini', description: 'Gemini 2.0 Flash, Gemini 1.5 Pro (Free models)' },
  { value: 'huggingface', label: 'Free Models', description: 'Llama 3.3, Mistral, Gemma, Phi-3 (Open source)' }
];

const OPENAI_MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o (Latest)', cost: 'Premium', description: 'Most capable model' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', cost: 'Standard', description: 'Fast and affordable' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', cost: 'Premium', description: 'High performance' },
  { value: 'gpt-4-turbo-preview', label: 'GPT-4 Turbo Preview', cost: 'Premium', description: 'Latest preview' },
  { value: 'gpt-4', label: 'GPT-4', cost: 'Premium', description: 'Original GPT-4' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', cost: 'Standard', description: 'Fast and reliable' },
  { value: 'gpt-3.5-turbo-16k', label: 'GPT-3.5 Turbo 16K', cost: 'Standard', description: 'Extended context' }
];

const GEMINI_MODELS = [
  { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (Latest)', cost: 'Free', description: 'Fastest and latest' },
  { value: 'gemini-1.5-pro-latest', label: 'Gemini 1.5 Pro Latest', cost: 'Free', description: 'Most capable' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', cost: 'Free', description: 'High quality' },
  { value: 'gemini-1.5-flash-latest', label: 'Gemini 1.5 Flash Latest', cost: 'Free', description: 'Fast and efficient' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', cost: 'Free', description: 'Balanced performance' },
  { value: 'gemini-pro', label: 'Gemini Pro', cost: 'Free', description: 'Standard model' }
];

const FREE_MODELS = [
  { value: 'meta-llama/Llama-3.3-70B-Instruct', label: 'Llama 3.3 70B Instruct (Latest)', cost: 'Free', description: 'Most capable Llama' },
  { value: 'meta-llama/Llama-3.1-70B-Instruct', label: 'Llama 3.1 70B Instruct', cost: 'Free', description: 'High performance' },
  { value: 'meta-llama/Llama-3.1-8B-Instruct', label: 'Llama 3.1 8B Instruct', cost: 'Free', description: 'Fast and efficient' },
  { value: 'mistralai/Mixtral-8x7B-Instruct-v0.1', label: 'Mixtral 8x7B Instruct (Latest)', cost: 'Free', description: 'Latest Mistral' },
  { value: 'mistralai/Mistral-7B-Instruct-v0.3', label: 'Mistral 7B Instruct v0.3', cost: 'Free', description: 'Updated version' },
  { value: 'mistralai/Mistral-7B-Instruct-v0.2', label: 'Mistral 7B Instruct v0.2', cost: 'Free', description: 'Standard version' },
  { value: 'google/gemma-7b-it', label: 'Gemma 7B Instruct', cost: 'Free', description: 'Google\'s open model' },
  { value: 'microsoft/Phi-3-medium-4k-instruct', label: 'Phi-3 Medium 4K (Latest)', cost: 'Free', description: 'Latest Phi model' },
  { value: 'microsoft/Phi-3-mini-4k-instruct', label: 'Phi-3 Mini 4K', cost: 'Free', description: 'Lightweight' },
  { value: 'Qwen/Qwen2.5-7B-Instruct', label: 'Qwen 2.5 7B Instruct', cost: 'Free', description: 'Multilingual model' },
  { value: 'TinyLlama/TinyLlama-1.1B-Chat-v1.0', label: 'TinyLlama 1.1B Chat', cost: 'Free', description: 'Ultra lightweight' }
];

export default function AIConfigurationDialog({ 
  open, 
  onClose, 
  config = null, 
  onSave 
}) {
  const [formData, setFormData] = useState({
    provider: '',
    model_name: '',
    api_key: '',
    api_endpoint: '',
    max_tokens: 2048,
    temperature: '0.7',
    top_p: '0.9',
    frequency_penalty: '0.0',
    presence_penalty: '0.0',
    is_active: true,
    is_default: false
  });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (config) {
      setFormData({
        provider: config.provider || '',
        model_name: config.model_name || '',
        api_key: config.api_key || '',
        api_endpoint: config.api_endpoint || '',
        max_tokens: config.max_tokens || 2048,
        temperature: config.temperature || '0.7',
        top_p: config.top_p || '0.9',
        frequency_penalty: config.frequency_penalty || '0.0',
        presence_penalty: config.presence_penalty || '0.0',
        is_active: config.is_active !== undefined ? config.is_active : true,
        is_default: config.is_default || false
      });
    } else {
      setFormData({
        provider: '',
        model_name: '',
        api_key: '',
        api_endpoint: '',
        max_tokens: 2048,
        temperature: '0.7',
        top_p: '0.9',
        frequency_penalty: '0.0',
        presence_penalty: '0.0',
        is_active: true,
        is_default: false
      });
    }
    setError('');
    setTestResult(null);
  }, [config, open]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!formData.provider || !formData.model_name || !formData.api_key) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      setError('Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!formData.provider || !formData.model_name || !formData.api_key) {
      setError('Please fill in all required fields before testing');
      return;
    }

    setTesting(true);
    setError('');
    setTestResult(null);

    try {
      const response = await fetch('/api/ai-config/validate-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok) {
        setTestResult({ success: true, message: 'Configuration test successful!' });
      } else {
        setTestResult({ success: false, message: result.detail || 'Configuration test failed' });
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Network error during test' });
    } finally {
      setTesting(false);
    }
  };

  const getProviderIcon = (provider) => {
    return PROVIDER_ICONS[provider] || '🤖';
  };

  const getProviderColor = (provider) => {
    return PROVIDER_COLORS[provider] || '#666';
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {config ? 'Edit AI Configuration' : 'Add AI Configuration'}
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {testResult && (
            <Alert 
              severity={testResult.success ? 'success' : 'error'} 
              sx={{ mb: 2 }}
              icon={testResult.success ? <CheckIcon /> : <ErrorIcon />}
            >
              {testResult.message}
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Provider Selection */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>AI Provider *</InputLabel>
                <Select
                  value={formData.provider}
                  onChange={(e) => handleInputChange('provider', e.target.value)}
                  label="AI Provider *"
                >
                  {AI_PROVIDERS.map((provider) => (
                    <MenuItem key={provider.value} value={provider.value}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <span style={{ fontSize: '1.2em' }}>
                          {getProviderIcon(provider.value)}
                        </span>
                        <Box>
                          <Typography variant="body1">
                            {provider.label}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {provider.description}
                          </Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Model Selection */}
            <Grid item xs={12} md={6}>
              {formData.provider === 'openai' ? (
                <FormControl fullWidth>
                  <InputLabel>Select Model *</InputLabel>
                  <Select
                    value={formData.model_name}
                    onChange={(e) => handleInputChange('model_name', e.target.value)}
                    label="Select Model *"
                  >
                    {OPENAI_MODELS.map((model) => (
                      <MenuItem key={model.value} value={model.value}>
                        <Box display="flex" flexDirection="column" width="100%">
                          <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
                            <Typography variant="body1">{model.label}</Typography>
                            <Chip 
                              label={model.cost} 
                              size="small" 
                              color={model.cost === 'Premium' ? 'primary' : 'default'}
                              sx={{ ml: 1 }}
                            />
                          </Box>
                          {model.description && (
                            <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
                              {model.description}
                            </Typography>
                          )}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : formData.provider === 'google' ? (
                <FormControl fullWidth>
                  <InputLabel>Select Model *</InputLabel>
                  <Select
                    value={formData.model_name}
                    onChange={(e) => handleInputChange('model_name', e.target.value)}
                    label="Select Model *"
                  >
                    {GEMINI_MODELS.map((model) => (
                      <MenuItem key={model.value} value={model.value}>
                        <Box display="flex" flexDirection="column" width="100%">
                          <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
                            <Typography variant="body1">{model.label}</Typography>
                            <Chip 
                              label={model.cost} 
                              size="small" 
                              color="success"
                              sx={{ ml: 1 }}
                            />
                          </Box>
                          {model.description && (
                            <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
                              {model.description}
                            </Typography>
                          )}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : formData.provider === 'huggingface' ? (
                <FormControl fullWidth>
                  <InputLabel>Select Model *</InputLabel>
                  <Select
                    value={formData.model_name}
                    onChange={(e) => handleInputChange('model_name', e.target.value)}
                    label="Select Model *"
                  >
                    {FREE_MODELS.map((model) => (
                      <MenuItem key={model.value} value={model.value}>
                        <Box display="flex" flexDirection="column" width="100%">
                          <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
                            <Typography variant="body1">{model.label}</Typography>
                            <Chip 
                              label={model.cost} 
                              size="small" 
                              color="success"
                              sx={{ ml: 1 }}
                            />
                          </Box>
                          {model.description && (
                            <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
                              {model.description}
                            </Typography>
                          )}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <TextField
                  fullWidth
                  label="Model Name *"
                  value={formData.model_name}
                  onChange={(e) => handleInputChange('model_name', e.target.value)}
                  placeholder="Enter model name"
                  disabled={!formData.provider}
                />
              )}
            </Grid>

            {/* API Key */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="API Key *"
                type="password"
                value={formData.api_key}
                onChange={(e) => handleInputChange('api_key', e.target.value)}
                placeholder={
                  formData.provider === 'openai' ? 'sk-...' :
                  formData.provider === 'google' ? 'Your Gemini API key' :
                  formData.provider === 'huggingface' ? 'hf_... (Optional for free models)' :
                  'Enter your API key'
                }
                helperText={
                  formData.provider === 'huggingface' 
                    ? 'API key is optional for free models, but recommended for better rate limits'
                    : formData.provider === 'google'
                    ? 'Get your API key from https://aistudio.google.com'
                    : formData.provider === 'openai'
                    ? 'Get your API key from https://platform.openai.com'
                    : ''
                }
              />
            </Grid>

            {/* API Endpoint (Optional) */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="API Endpoint (Optional)"
                value={formData.api_endpoint}
                onChange={(e) => handleInputChange('api_endpoint', e.target.value)}
                placeholder="Custom endpoint URL (leave empty for default)"
              />
            </Grid>

            {/* Advanced Settings */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Advanced Settings
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Max Tokens"
                type="number"
                value={formData.max_tokens}
                onChange={(e) => handleInputChange('max_tokens', parseInt(e.target.value) || 0)}
                inputProps={{ min: 1, max: 32000 }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Temperature"
                value={formData.temperature}
                onChange={(e) => handleInputChange('temperature', e.target.value)}
                placeholder="0.0 - 2.0"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Top P"
                value={formData.top_p}
                onChange={(e) => handleInputChange('top_p', e.target.value)}
                placeholder="0.0 - 1.0"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Frequency Penalty"
                value={formData.frequency_penalty}
                onChange={(e) => handleInputChange('frequency_penalty', e.target.value)}
                placeholder="-2.0 - 2.0"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Presence Penalty"
                value={formData.presence_penalty}
                onChange={(e) => handleInputChange('presence_penalty', e.target.value)}
                placeholder="-2.0 - 2.0"
              />
            </Grid>

            {/* Switches */}
            <Grid item xs={12}>
              <Box display="flex" gap={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_active}
                      onChange={(e) => handleInputChange('is_active', e.target.checked)}
                    />
                  }
                  label="Active"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_default}
                      onChange={(e) => handleInputChange('is_default', e.target.checked)}
                    />
                  }
                  label="Set as Default"
                />
              </Box>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Cancel
        </Button>
        
        <Tooltip title="Test configuration">
          <Button
            onClick={handleTest}
            disabled={testing || !formData.provider || !formData.model_name || !formData.api_key}
            startIcon={testing ? <CircularProgress size={16} /> : <TestIcon />}
          >
            {testing ? 'Testing...' : 'Test'}
          </Button>
        </Tooltip>

        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading || !formData.provider || !formData.model_name || !formData.api_key}
          startIcon={loading ? <CircularProgress size={16} /> : <SaveIcon />}
        >
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
} 