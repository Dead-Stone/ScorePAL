/**
 * InstitutionSelector - Component for selecting institution during registration
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 */

import React, { useState, useEffect } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Autocomplete,
  CircularProgress,
  Alert,
  Box,
  Typography,
} from '@mui/material';
import apiClient from '@/utils/apiClient';

interface Institution {
  id: string;
  name: string;
  code: string;
  domain?: string;
  allow_self_registration: boolean;
}

interface InstitutionSelectorProps {
  value: string;
  onChange: (institutionCode: string) => void;
  required?: boolean;
  error?: boolean;
  helperText?: string;
}

export const InstitutionSelector: React.FC<InstitutionSelectorProps> = ({
  value,
  onChange,
  required = false,
  error = false,
  helperText,
}) => {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const fetchInstitutions = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/institutions?status=active');
      setInstitutions(response.data || []);
    } catch (err: any) {
      console.error('Error fetching institutions:', err);
      setErrorMessage('Failed to load institutions. You can still register without selecting one.');
    } finally {
      setLoading(false);
    }
  };

  const filteredInstitutions = institutions.filter(inst => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      inst.name.toLowerCase().includes(search) ||
      inst.code.toLowerCase().includes(search) ||
      (inst.domain && inst.domain.toLowerCase().includes(search))
    );
  });

  if (loading) {
    return (
      <Box display="flex" alignItems="center" gap={2}>
        <CircularProgress size={20} />
        <Typography variant="body2" color="text.secondary">
          Loading institutions...
        </Typography>
      </Box>
    );
  }

  if (errorMessage) {
    return (
      <Alert severity="warning" sx={{ mb: 2 }}>
        {errorMessage}
      </Alert>
    );
  }

  return (
    <Autocomplete
      options={filteredInstitutions}
      getOptionLabel={(option) => `${option.name} (${option.code})`}
      value={institutions.find(inst => inst.code === value) || null}
      onChange={(_, newValue) => {
        onChange(newValue?.code || '');
      }}
      inputValue={searchTerm}
      onInputChange={(_, newInputValue) => {
        setSearchTerm(newInputValue);
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Institution/College"
          placeholder="Search for your institution..."
          required={required}
          error={error}
          helperText={helperText}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderOption={(props, option) => (
        <Box component="li" {...props}>
          <Box>
            <Typography variant="body1">{option.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {option.code} {option.domain && `• ${option.domain}`}
            </Typography>
          </Box>
        </Box>
      )}
      noOptionsText="No institutions found"
      loading={loading}
    />
  );
};

