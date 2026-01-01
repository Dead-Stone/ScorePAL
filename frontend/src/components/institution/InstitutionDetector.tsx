/**
 * InstitutionDetector - Component to detect and display institution from email
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 */

import React, { useState, useEffect } from 'react';
import { Alert, Box, Chip, CircularProgress } from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import apiClient from '@/utils/apiClient';

interface Institution {
  id: string;
  name: string;
  code: string;
  domain?: string;
}

interface InstitutionDetectorProps {
  email: string;
  onInstitutionDetected?: (institution: Institution | null) => void;
  showAlert?: boolean;
}

export const InstitutionDetector: React.FC<InstitutionDetectorProps> = ({
  email,
  onInstitutionDetected,
  showAlert = true,
}) => {
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const detectInstitution = async () => {
      if (!email || !email.includes('@')) {
        setInstitution(null);
        if (onInstitutionDetected) onInstitutionDetected(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Try to detect institution from email domain
        const response = await apiClient.get(`/api/institutions/detect/email/${encodeURIComponent(email)}`);
        
        if (response.data) {
          setInstitution(response.data);
          if (onInstitutionDetected) onInstitutionDetected(response.data);
        } else {
          setInstitution(null);
          if (onInstitutionDetected) onInstitutionDetected(null);
        }
      } catch (err: any) {
        // Don't show error if endpoint doesn't exist or user not authenticated
        if (err.response?.status !== 404 && err.response?.status !== 401) {
          setError('Could not detect institution');
        }
        setInstitution(null);
        if (onInstitutionDetected) onInstitutionDetected(null);
      } finally {
        setLoading(false);
      }
    };

    // Debounce detection
    const timeoutId = setTimeout(detectInstitution, 500);
    return () => clearTimeout(timeoutId);
  }, [email, onInstitutionDetected]);

  if (loading) {
    return (
      <Box display="flex" alignItems="center" gap={1} sx={{ mt: 1 }}>
        <CircularProgress size={16} />
        <span style={{ fontSize: '0.875rem', color: '#666' }}>Detecting institution...</span>
      </Box>
    );
  }

  if (error) {
    return showAlert ? (
      <Alert severity="warning" sx={{ mt: 1 }}>
        {error}
      </Alert>
    ) : null;
  }

  if (institution) {
    return (
      <Box sx={{ mt: 1 }}>
        {showAlert && (
          <Alert 
            severity="info" 
            icon={<SchoolIcon />}
            sx={{ mb: 1 }}
          >
            Institution detected: <strong>{institution.name}</strong>
          </Alert>
        )}
        <Chip
          icon={<SchoolIcon />}
          label={`${institution.name} (${institution.code})`}
          color="primary"
          variant="outlined"
          size="small"
        />
      </Box>
    );
  }

  return null;
};

