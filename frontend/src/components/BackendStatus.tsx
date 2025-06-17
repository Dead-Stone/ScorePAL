/**
 * ScorePAL - AI-Powered Academic Grading Assistant
 * Backend Health Status Indicator Component
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 * @repository https://github.com/Dead-Stone/ScorePAL
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Tooltip,
  Paper,
  Typography,
  Chip,
  CircularProgress,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import axios from 'axios';

interface BackendStatusData {
  status: 'healthy' | 'warning' | 'error' | 'offline';
  message: string;
  timestamp: string;
  version?: string;
  uptime?: string;
  database?: 'connected' | 'disconnected';
  api_endpoints?: {
    rubrics: boolean;
    grading: boolean;
    canvas: boolean;
  };
}

const StatusTooltip = styled(({ className, ...props }: any) => (
  <Tooltip {...props} classes={{ popper: className }} />
))({
  '& .MuiTooltip-tooltip': {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    color: 'white',
    maxWidth: 300,
    fontSize: '0.875rem',
    padding: '12px',
    borderRadius: '8px',
  },
});

const StatusButton = styled(Button)<{ statuscolor: string }>(({ theme, statuscolor }) => ({
  minWidth: 40,
  width: 40,
  height: 40,
  borderRadius: '50%',
  padding: 0,
  backgroundColor: statuscolor,
  color: 'white',
  '&:hover': {
    backgroundColor: statuscolor,
    filter: 'brightness(1.1)',
    transform: 'scale(1.05)',
  },
  transition: 'all 0.2s ease-in-out',
}));

const BackendStatus: React.FC = () => {
  const [status, setStatus] = useState<BackendStatusData>({
    status: 'offline',
    message: 'Checking...',
    timestamp: new Date().toISOString(),
  });
  const [loading, setLoading] = useState(true);

  const checkBackendStatus = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/health', { timeout: 5000 });
      
      if (response.data) {
        setStatus({
          status: 'healthy',
          message: 'Backend is running smoothly',
          timestamp: new Date().toISOString(),
          version: response.data.version || 'Unknown',
          uptime: response.data.uptime || 'Unknown',
          database: response.data.database || 'unknown',
          api_endpoints: response.data.endpoints || {},
        });
      }
    } catch (error: any) {
      let statusData: BackendStatusData = {
        status: 'error',
        message: 'Backend is unreachable',
        timestamp: new Date().toISOString(),
      };

      if (error.code === 'ECONNABORTED') {
        statusData.message = 'Backend timeout (slow response)';
        statusData.status = 'warning';
      } else if (error.response?.status >= 500) {
        statusData.message = 'Backend server error';
        statusData.status = 'error';
      } else if (error.response?.status >= 400) {
        statusData.message = 'Backend client error';
        statusData.status = 'warning';
      }

      setStatus(statusData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkBackendStatus();
    const interval = setInterval(checkBackendStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (status.status) {
      case 'healthy':
        return '#4caf50'; // Green
      case 'warning':
        return '#ff9800'; // Orange
      case 'error':
        return '#f44336'; // Red
      case 'offline':
      default:
        return '#9e9e9e'; // Grey
    }
  };

  const getStatusIcon = () => {
    if (loading) {
      return <CircularProgress size={20} color="inherit" />;
    }
    
    switch (status.status) {
      case 'healthy':
        return <CheckCircleIcon />;
      case 'warning':
        return <WarningIcon />;
      case 'error':
        return <ErrorIcon />;
      case 'offline':
      default:
        return <CloudOffIcon />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const TooltipContent = () => (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
        Backend Status
      </Typography>
      <Box sx={{ mb: 1 }}>
        <Chip
          label={status.status.toUpperCase()}
          size="small"
          sx={{
            backgroundColor: getStatusColor(),
            color: 'white',
            fontWeight: 'bold',
          }}
        />
      </Box>
      <Typography variant="body2" sx={{ mb: 1 }}>
        {status.message}
      </Typography>
      <Typography variant="caption" sx={{ opacity: 0.8, mb: 1, display: 'block' }}>
        Last checked: {formatTimestamp(status.timestamp)}
      </Typography>
      
      {status.version && (
        <Typography variant="caption" sx={{ opacity: 0.8, mb: 0.5, display: 'block' }}>
          Version: {status.version}
        </Typography>
      )}
      
      {status.uptime && (
        <Typography variant="caption" sx={{ opacity: 0.8, mb: 0.5, display: 'block' }}>
          Uptime: {status.uptime}
        </Typography>
      )}
      
      {status.database && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" sx={{ opacity: 0.8, display: 'block' }}>
            Database: {status.database}
          </Typography>
        </Box>
      )}
      
      {status.api_endpoints && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mb: 0.5 }}>
            API Endpoints:
          </Typography>
          {Object.entries(status.api_endpoints).map(([endpoint, isWorking]) => (
            <Typography
              key={endpoint}
              variant="caption"
              sx={{
                opacity: 0.8,
                display: 'block',
                color: isWorking ? '#4caf50' : '#f44336',
                fontSize: '0.75rem',
              }}
            >
              • {endpoint}: {isWorking ? 'Working' : 'Error'}
            </Typography>
          ))}
        </Box>
      )}
      
      <Typography variant="caption" sx={{ opacity: 0.6, mt: 1, display: 'block' }}>
        Click to refresh status
      </Typography>
    </Box>
  );

  return (
    <StatusTooltip
      title={<TooltipContent />}
      placement="bottom-end"
      arrow
    >
      <StatusButton
        statuscolor={getStatusColor()}
        onClick={checkBackendStatus}
        disabled={loading}
      >
        {getStatusIcon()}
      </StatusButton>
    </StatusTooltip>
  );
};

export default BackendStatus; 