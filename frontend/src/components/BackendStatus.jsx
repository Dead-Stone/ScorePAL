import React, { useState, useEffect } from 'react';
import { apiEndpoints } from '../utils/api';

const BackendStatus = () => {
  const [status, setStatus] = useState('checking...');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkBackendHealth();
  }, []);

  const checkBackendHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const healthData = await apiEndpoints.health();
      
      setStatus({
        status: healthData.status,
        version: healthData.version,
        timestamp: healthData.timestamp,
        environment: healthData.environment
      });
      
    } catch (err) {
      setError(err.message);
      setStatus('disconnected');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = () => {
    if (loading) return 'text-yellow-600';
    if (error) return 'text-red-600';
    if (status?.status === 'healthy') return 'text-green-600';
    return 'text-gray-600';
  };

  const getStatusIcon = () => {
    if (loading) return '🔄';
    if (error) return '❌';
    if (status?.status === 'healthy') return '✅';
    return '❓';
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Backend Status</h3>
        <button 
          onClick={checkBackendHealth}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          disabled={loading}
        >
          {loading ? 'Checking...' : 'Refresh'}
        </button>
      </div>
      
      <div className={`mt-2 ${getStatusColor()}`}>
        <div className="flex items-center">
          <span className="text-xl mr-2">{getStatusIcon()}</span>
          <span className="font-medium">
            {loading ? 'Checking connection...' : error ? 'Connection failed' : 'Connected'}
          </span>
        </div>
        
        {error && (
          <div className="mt-2 text-sm text-red-600">
            <strong>Error:</strong> {error}
          </div>
        )}
        
        {status && typeof status === 'object' && (
          <div className="mt-2 text-sm">
            <div><strong>Status:</strong> {status.status}</div>
            <div><strong>Version:</strong> {status.version}</div>
            <div><strong>Environment:</strong> {status.environment}</div>
            <div><strong>Last Check:</strong> {new Date(status.timestamp).toLocaleString()}</div>
          </div>
        )}
      </div>
      
      <div className="mt-3 text-xs text-gray-500">
        API URL: https://34-13-75-235.nip.io
      </div>
    </div>
  );
};

export default BackendStatus; 