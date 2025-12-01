import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  Grid,
  Chip,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  LinearProgress,
  Divider,
  Badge,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Test as TestIcon,
  Star as DefaultIcon,
  Psychology as PsychologyIcon,
  Speed as SpeedIcon,
  AttachMoney as CostIcon,
  Timeline as StatsIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import AIConfigurationDialog from './AIConfigurationDialog';

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

export default function AIProfileSettings() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState(null);
  const [testingConfig, setTestingConfig] = useState(null);
  const [usageStats, setUsageStats] = useState(null);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    fetchConfigs();
    fetchUsageStats();
  }, []);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ai-config/my-configs', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setConfigs(data);
      } else {
        throw new Error('Failed to fetch configurations');
      }
    } catch (error) {
      setNotification({
        type: 'error',
        message: 'Failed to load AI configurations'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsageStats = async () => {
    try {
      const response = await fetch('/api/ai-config/usage-stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsageStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch usage stats:', error);
    }
  };

  const handleSaveConfig = async (configData) => {
    try {
      const url = editingConfig 
        ? `/api/ai-config/my-configs/${editingConfig.id}`
        : '/api/ai-config/my-configs';
      
      const method = editingConfig ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(configData)
      });
      
      if (response.ok) {
        setNotification({
          type: 'success',
          message: `Configuration ${editingConfig ? 'updated' : 'created'} successfully`
        });
        fetchConfigs();
        setConfigDialogOpen(false);
        setEditingConfig(null);
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to save configuration');
      }
    } catch (error) {
      setNotification({
        type: 'error',
        message: error.message
      });
    }
  };

  const handleEditConfig = (config) => {
    setEditingConfig(config);
    setConfigDialogOpen(true);
  };

  const handleDeleteConfig = async () => {
    if (!configToDelete) return;
    
    try {
      const response = await fetch(`/api/ai-config/my-configs/${configToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        setNotification({
          type: 'success',
          message: 'Configuration deleted successfully'
        });
        fetchConfigs();
      } else {
        throw new Error('Failed to delete configuration');
      }
    } catch (error) {
      setNotification({
        type: 'error',
        message: error.message
      });
    } finally {
      setDeleteDialogOpen(false);
      setConfigToDelete(null);
    }
  };

  const handleTestConfig = async (config) => {
    setTestingConfig(config.id);
    
    try {
      const response = await fetch(`/api/ai-config/my-configs/${config.id}/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        setNotification({
          type: 'success',
          message: `Test successful! Response time: ${result.response_time?.toFixed(2)}s`
        });
      } else {
        setNotification({
          type: 'error',
          message: result.message || 'Configuration test failed'
        });
      }
    } catch (error) {
      setNotification({
        type: 'error',
        message: 'Failed to test configuration'
      });
    } finally {
      setTestingConfig(null);
    }
  };

  const handleSetDefault = async (config) => {
    try {
      const response = await fetch(`/api/ai-config/my-configs/${config.id}/set-default`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        setNotification({
          type: 'success',
          message: 'Default configuration updated'
        });
        fetchConfigs();
      } else {
        throw new Error('Failed to set default configuration');
      }
    } catch (error) {
      setNotification({
        type: 'error',
        message: error.message
      });
    }
  };

  const getStatusIcon = (config) => {
    // This would be determined by the last test result or health check
    if (config.total_requests > 0) return <CheckIcon color="success" />;
    return <WarningIcon color="warning" />;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" gutterBottom>
            AI Model Configurations
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Manage your AI provider configurations for grading
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditingConfig(null);
            setConfigDialogOpen(true);
          }}
        >
          Add Configuration
        </Button>
      </Box>

      {/* Usage Statistics */}
      {usageStats && (
        <Card sx={{ mb: 3, bgcolor: 'primary.50' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <StatsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Usage Statistics
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary">
                    {usageStats.total_requests.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Requests
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary">
                    {usageStats.total_tokens_used.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Tokens Used
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary">
                    {formatCurrency(parseFloat(usageStats.total_cost))}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Cost
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary">
                    {usageStats.success_rate}%
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Success Rate
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Configurations */}
      {configs.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <PsychologyIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No AI Configurations
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Add your first AI provider configuration to start using ScorePAL with different AI models.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditingConfig(null);
                setConfigDialogOpen(true);
              }}
            >
              Add Configuration
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {configs.map((config) => (
            <Grid item xs={12} md={6} lg={4} key={config.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  {/* Header */}
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <span style={{ fontSize: '1.5em' }}>
                        {PROVIDER_ICONS[config.provider]}
                      </span>
                      <Typography variant="h6">
                        {config.provider.charAt(0).toUpperCase() + config.provider.slice(1)}
                      </Typography>
                      {config.is_default && (
                        <Badge badgeContent={<DefaultIcon />} color="primary" />
                      )}
                    </Box>
                    {getStatusIcon(config)}
                  </Box>

                  {/* Model Info */}
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    {config.model_name}
                  </Typography>

                  {/* Capabilities */}
                  <Box mb={2}>
                    {config.capabilities?.slice(0, 3).map((capability) => (
                      <Chip
                        key={capability}
                        label={capability.replace('_', ' ')}
                        size="small"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                    {config.capabilities?.length > 3 && (
                      <Chip
                        label={`+${config.capabilities.length - 3} more`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  {/* Statistics */}
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      <strong>Requests:</strong> {config.total_requests.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      <strong>Tokens:</strong> {config.total_tokens_used.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      <strong>Last Used:</strong> {formatDate(config.last_used)}
                    </Typography>
                    {config.cost_per_1k_tokens && (
                      <Typography variant="body2" color="textSecondary">
                        <strong>Cost/1K:</strong> {formatCurrency(parseFloat(config.cost_per_1k_tokens))}
                      </Typography>
                    )}
                  </Box>
                </CardContent>

                <CardActions>
                  <Button
                    size="small"
                    startIcon={testingConfig === config.id ? <CircularProgress size={16} /> : <TestIcon />}
                    onClick={() => handleTestConfig(config)}
                    disabled={testingConfig === config.id}
                  >
                    Test
                  </Button>
                  
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => handleEditConfig(config)}
                  >
                    Edit
                  </Button>

                  {!config.is_default && (
                    <Button
                      size="small"
                      startIcon={<DefaultIcon />}
                      onClick={() => handleSetDefault(config)}
                    >
                      Set Default
                    </Button>
                  )}

                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => {
                      setConfigToDelete(config);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Configuration Dialog */}
      <AIConfigurationDialog
        open={configDialogOpen}
        onClose={() => {
          setConfigDialogOpen(false);
          setEditingConfig(null);
        }}
        config={editingConfig}
        onSave={handleSaveConfig}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Configuration</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the configuration for{' '}
            <strong>{configToDelete?.provider} - {configToDelete?.model_name}</strong>?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfig} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification */}
      {notification && (
        <Alert
          severity={notification.type}
          onClose={() => setNotification(null)}
          sx={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            zIndex: 9999
          }}
        >
          {notification.message}
        </Alert>
      )}
    </Box>
  );
} 