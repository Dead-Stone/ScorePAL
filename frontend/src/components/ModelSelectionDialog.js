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
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Grid,
  TextField,
  Alert,
  IconButton,
  Tooltip,
  LinearProgress,
  Badge,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Psychology as PsychologyIcon,
  Speed as SpeedIcon,
  AttachMoney as CostIcon,
  Timeline as PerformanceIcon,
  Star as DefaultIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  AccessTime as TimeIcon
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
  google: '🔍',
  perplexity: '🔮',
  huggingface: '🤗',
  cohere: '🌊'
};

export default function ModelSelectionDialog({ 
  open, 
  onClose, 
  onSelect, 
  currentSelection = null,
  estimatedTokens = 0 
}) {
  const [availableModels, setAvailableModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [customSettings, setCustomSettings] = useState({
    temperature: '',
    max_tokens: '',
    use_streaming: false
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [modelStats, setModelStats] = useState({});

  useEffect(() => {
    if (open) {
      fetchAvailableModels();
    }
  }, [open]);

  useEffect(() => {
    if (currentSelection) {
      setSelectedConfig(currentSelection.model_config_id);
      setCustomSettings({
        temperature: currentSelection.custom_temperature || '',
        max_tokens: currentSelection.custom_max_tokens || '',
        use_streaming: currentSelection.use_streaming || false
      });
    }
  }, [currentSelection]);

  const fetchAvailableModels = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai-config/my-configs', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const models = await response.json();
        setAvailableModels(models);
        
        // Fetch usage statistics for each model
        fetchModelStats(models);
        
        // Set default selection if none exists
        if (!selectedConfig && models.length > 0) {
          const defaultModel = models.find(m => m.is_default) || models[0];
          setSelectedConfig(defaultModel.id);
        }
      }
    } catch (error) {
      console.error('Error fetching models:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchModelStats = async (models) => {
    try {
      const response = await fetch('/api/ai-config/usage-stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const stats = await response.json();
        setModelStats(stats);
      }
    } catch (error) {
      console.error('Error fetching model stats:', error);
    }
  };

  const handleModelSelect = (configId) => {
    setSelectedConfig(configId);
  };

  const handleAdvancedSettingChange = (setting, value) => {
    setCustomSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const handleConfirm = () => {
    const selectedModel = availableModels.find(m => m.id === selectedConfig);
    if (!selectedModel) return;

    const selection = {
      model_config_id: selectedConfig,
      provider: selectedModel.provider,
      model_name: selectedModel.model_name,
      custom_temperature: customSettings.temperature || null,
      custom_max_tokens: customSettings.max_tokens ? parseInt(customSettings.max_tokens) : null,
      use_streaming: customSettings.use_streaming
    };

    onSelect(selection);
    onClose();
  };

  const getModelStatusIcon = (status) => {
    if (status === 'available') return <CheckIcon color="success" />;
    if (status?.startsWith('error')) return <ErrorIcon color="error" />;
    return <InfoIcon color="info" />;
  };

  const getModelStatusColor = (status) => {
    if (status === 'available') return 'success';
    if (status?.startsWith('error')) return 'error';
    return 'warning';
  };

  const estimateCost = (model, tokens = estimatedTokens) => {
    if (!model.cost_per_1k_tokens || !tokens) return 'N/A';
    const cost = (tokens / 1000) * parseFloat(model.cost_per_1k_tokens);
    return `$${cost.toFixed(4)}`;
  };

  const formatResponseTime = (time) => {
    if (!time) return 'N/A';
    return `${time.toFixed(2)}s`;
  };

  const selectedModel = availableModels.find(m => m.id === selectedConfig);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <PsychologyIcon />
          Select AI Model for Grading
          {estimatedTokens > 0 && (
            <Chip 
              label={`~${estimatedTokens.toLocaleString()} tokens`} 
              size="small" 
              variant="outlined" 
            />
          )}
        </Box>
      </DialogTitle>

      <DialogContent>
        {loading ? (
          <Box textAlign="center" py={4}>
            <LinearProgress />
            <Typography variant="body2" color="textSecondary" mt={2}>
              Loading available AI models...
            </Typography>
          </Box>
        ) : availableModels.length === 0 ? (
          <Alert severity="warning">
            No AI configurations found. Please add an AI configuration in your profile settings first.
          </Alert>
        ) : (
          <Grid container spacing={2}>
            {/* Model Selection */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Available Models
              </Typography>
              
              <Grid container spacing={2}>
                {availableModels.map((model) => (
                  <Grid item xs={12} sm={6} key={model.id}>
                    <Card 
                      variant={selectedConfig === model.id ? "elevation" : "outlined"}
                      sx={{ 
                        cursor: 'pointer',
                        border: selectedConfig === model.id ? 2 : 1,
                        borderColor: selectedConfig === model.id ? 'primary.main' : 'grey.300',
                        position: 'relative'
                      }}
                      onClick={() => handleModelSelect(model.id)}
                    >
                      {model.is_default && (
                        <Badge
                          badgeContent={<DefaultIcon fontSize="small" />}
                          color="primary"
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            zIndex: 1
                          }}
                        />
                      )}
                      
                      <CardContent>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <span style={{ fontSize: '1.2em' }}>
                            {PROVIDER_ICONS[model.provider]}
                          </span>
                          <Typography variant="h6" component="div">
                            {model.provider.charAt(0).toUpperCase() + model.provider.slice(1)}
                          </Typography>
                          {getModelStatusIcon(model.status)}
                        </Box>
                        
                        <Typography variant="body2" color="textSecondary" gutterBottom>
                          {model.model_name}
                        </Typography>
                        
                        <Box display="flex" flexWrap="wrap" gap={0.5} mb={1}>
                          {model.capabilities?.map(cap => (
                            <Chip 
                              key={cap} 
                              label={cap.replace('_', ' ')} 
                              size="small" 
                              variant="outlined" 
                            />
                          ))}
                        </Box>
                        
                        <Divider sx={{ my: 1 }} />
                        
                        <Grid container spacing={1} alignItems="center">
                          <Grid item xs={6}>
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <CostIcon fontSize="small" color="action" />
                              <Typography variant="caption">
                                {estimateCost(model)}
                              </Typography>
                            </Box>
                          </Grid>
                          
                          <Grid item xs={6}>
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <TimeIcon fontSize="small" color="action" />
                              <Typography variant="caption">
                                {formatResponseTime(model.last_response_time)}
                              </Typography>
                            </Box>
                          </Grid>
                          
                          <Grid item xs={12}>
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <PerformanceIcon fontSize="small" color="action" />
                              <Typography variant="caption">
                                {model.total_requests} requests used
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                        
                        {model.status !== 'available' && (
                          <Alert severity={getModelStatusColor(model.status)} sx={{ mt: 1 }}>
                            <Typography variant="caption">
                              {model.status}
                            </Typography>
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Grid>

            {/* Selected Model Details */}
            {selectedModel && (
              <Grid item xs={12}>
                <Card variant="outlined" sx={{ bgcolor: 'grey.50' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Selected Model Configuration
                    </Typography>
                    
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2">
                          <strong>Provider:</strong> {selectedModel.provider}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Model:</strong> {selectedModel.model_name}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Max Tokens:</strong> {selectedModel.max_tokens.toLocaleString()}
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2">
                          <strong>Temperature:</strong> {selectedModel.temperature}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Estimated Cost:</strong> {estimateCost(selectedModel)}
                        </Typography>
                        {selectedModel.last_used && (
                          <Typography variant="body2">
                            <strong>Last Used:</strong> {new Date(selectedModel.last_used).toLocaleDateString()}
                          </Typography>
                        )}
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Advanced Settings */}
            <Grid item xs={12}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Button
                  startIcon={<SettingsIcon />}
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  variant="outlined"
                  size="small"
                >
                  {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
                </Button>
              </Box>

              {showAdvanced && (
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Override Model Settings
                    </Typography>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Custom Temperature"
                          value={customSettings.temperature}
                          onChange={(e) => handleAdvancedSettingChange('temperature', e.target.value)}
                          helperText="Leave empty to use model default"
                          type="number"
                          inputProps={{ min: 0, max: 2, step: 0.1 }}
                        />
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Custom Max Tokens"
                          value={customSettings.max_tokens}
                          onChange={(e) => handleAdvancedSettingChange('max_tokens', e.target.value)}
                          helperText="Leave empty to use model default"
                          type="number"
                          inputProps={{ min: 1, max: 100000 }}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              )}
            </Grid>

            {/* Cost Estimate */}
            {estimatedTokens > 0 && selectedModel && (
              <Grid item xs={12}>
                <Alert severity="info" icon={<CostIcon />}>
                  <Typography variant="body2">
                    <strong>Estimated Cost:</strong> {estimateCost(selectedModel)} for approximately {estimatedTokens.toLocaleString()} tokens
                  </Typography>
                </Alert>
              </Grid>
            )}
          </Grid>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button 
          variant="contained" 
          onClick={handleConfirm}
          disabled={!selectedConfig || loading}
        >
          Use Selected Model
        </Button>
      </DialogActions>
    </Dialog>
  );
} 