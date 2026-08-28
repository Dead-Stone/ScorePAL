/**
 * Add LMS Form Component
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { X, Loader2, ExternalLink } from 'lucide-react';
import { LMSConfig } from './types';
import { LMS_TYPES } from './constants';

interface AddLMSFormProps {
  editingConfig: LMSConfig | null;
  formData: {
    instanceUrl: string;
    apiKey: string;
    name: string;
  };
  loading: boolean;
  onClose: () => void;
  onFormDataChange: (field: string, value: string) => void;
  onSave: (lmsType: string) => void;
}

export const AddLMSForm: React.FC<AddLMSFormProps> = ({
  editingConfig,
  formData,
  loading,
  onClose,
  onFormDataChange,
  onSave,
}) => {
  const [selectedLmsType, setSelectedLmsType] = useState<string>(
    editingConfig?.type || 'canvas'
  );
  const lmsInfo = LMS_TYPES.find(l => l.id === selectedLmsType);

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            {editingConfig ? `Edit ${editingConfig.name}` : 'Add LMS Integration'}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!editingConfig && (
          <div>
            <Label>Select LMS Platform</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {LMS_TYPES.map(lms => (
                <button
                  key={lms.id}
                  onClick={() => {
                    setSelectedLmsType(lms.id);
                    onFormDataChange('instanceUrl', lms.defaultUrl);
                  }}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${
                    selectedLmsType === lms.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-sm">{lms.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {lms.id === 'canvas' ? 'Available' : 'Coming Soon'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {lmsInfo && (
          <>
            <div>
              <Label htmlFor="instanceUrl">Instance URL</Label>
              <Input
                id="instanceUrl"
                value={formData.instanceUrl}
                onChange={(e) => onFormDataChange('instanceUrl', e.target.value)}
                placeholder={lmsInfo.defaultUrl}
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="apiKey">API Key / Token</Label>
              <Input
                id="apiKey"
                type="password"
                value={formData.apiKey}
                onChange={(e) => onFormDataChange('apiKey', e.target.value)}
                placeholder="Enter your API key"
                disabled={loading}
              />
            </div>

            {lmsInfo.instructions && (
              <Alert>
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="font-medium mb-2">Setup Instructions:</div>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      {lmsInfo.instructions.map((instruction, idx) => (
                        <li key={idx}>{instruction}</li>
                      ))}
                    </ol>
                    {lmsInfo.docsUrl && (
                      <a
                        href={lmsInfo.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline mt-2"
                      >
                        View Documentation <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => onSave(selectedLmsType)}
                disabled={loading || !formData.instanceUrl || !formData.apiKey}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Configuration'
                )}
              </Button>
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
