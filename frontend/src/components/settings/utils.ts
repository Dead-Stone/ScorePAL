/**
 * Settings Utilities
 */

import axios from 'axios';
import { LMSConfig } from './types';
import { LMS_TYPES } from './constants';
import { extractErrorMessage } from '@/utils/errorUtils';

export const fetchLmsConfigurations = async (): Promise<LMSConfig[]> => {
  try {
    const canvasResponse = await axios.get('/api/settings/canvas');
    const configs: LMSConfig[] = [];
    
    if (canvasResponse.data.canvas_key_configured) {
      configs.push({
        id: 'canvas-1',
        type: 'canvas',
        name: 'Canvas LMS',
        instanceUrl: canvasResponse.data.canvas_url || 'https://canvas.instructure.com',
        apiKey: '••••••••••••',
        isConfigured: true,
        isValid: canvasResponse.data.canvas_key_valid || false,
        userInfo: null,
        lastTested: canvasResponse.data.last_tested,
      });
    }
    
    return configs;
  } catch (err: any) {
    console.error('Error fetching LMS settings:', err);
    throw err;
  }
};

export const saveLmsConfig = async (
  lmsType: string,
  instanceUrl: string,
  apiKey: string,
  existingConfigs: LMSConfig[],
  editingConfig: LMSConfig | null
): Promise<void> => {
  // Check if user already has a different LMS configured
  const existingConfig = existingConfigs.find(c => c.isConfigured && c.type !== lmsType);
  if (existingConfig && !editingConfig) {
    if (!confirm(`You already have ${existingConfig.name} configured. Configuring ${getLmsInfo(lmsType)?.name} will remove your ${existingConfig.name} configuration. Continue?`)) {
      throw new Error('Cancelled by user');
    }
    // Remove existing LMS configuration
    if (existingConfig.type === 'canvas') {
      await axios.delete('/api/settings/canvas');
    }
  }
  
  if (lmsType === 'canvas') {
    const response = await axios.put('/api/settings/canvas', {
      canvas_api_key: apiKey,
      canvas_url: instanceUrl
    });
    
    if (response.data.status !== 'success') {
      throw new Error('Failed to save Canvas settings');
    }
  } else {
    throw new Error(`${getLmsInfo(lmsType)?.name} integration coming soon!`);
  }
};

export const testLmsConfig = async (config: LMSConfig): Promise<any> => {
  if (config.type === 'canvas') {
    const response = await axios.post('/api/settings/canvas/test');
    
    if (response.data.valid) {
      return {
        isValid: true,
        userInfo: response.data.user_info,
      };
    } else {
      const errorMsg = response.data?.message;
      throw new Error(typeof errorMsg === 'string' ? errorMsg : 'API key test failed');
    }
  } else {
    throw new Error(`Testing ${getLmsInfo(config.type)?.name} integration coming soon!`);
  }
};

export const removeLmsConfig = async (config: LMSConfig): Promise<void> => {
  if (!confirm(`Are you sure you want to remove ${config.name}?`)) {
    throw new Error('Cancelled by user');
  }
  
  if (config.type === 'canvas') {
    await axios.delete('/api/settings/canvas');
  } else {
    throw new Error('Removal not supported for this LMS type');
  }
};

export const getLmsInfo = (type: string) => LMS_TYPES.find(l => l.id === type);
