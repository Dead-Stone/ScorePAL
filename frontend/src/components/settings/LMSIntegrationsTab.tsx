/**
 * LMS Integrations Tab Component
 */

import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Plus } from 'lucide-react';
import { LMSConfig } from './types';
import { LMS_TYPES } from './constants';
import { LMSOverviewCard } from './LMSOverviewCard';
import { LMSConfigCard } from './LMSConfigCard';
import { AddLMSForm } from './AddLMSForm';
import { SupportedLMSGrid } from './SupportedLMSGrid';

interface LMSIntegrationsTabProps {
  lmsConfigs: LMSConfig[];
  showAddLms: boolean;
  editingConfig: LMSConfig | null;
  formData: {
    instanceUrl: string;
    apiKey: string;
    name: string;
  };
  loading: boolean;
  testing: string | null;
  onShowAddLms: () => void;
  onFormDataChange: (field: string, value: string) => void;
  onSave: (lmsType: string) => void;
  onTest: (config: LMSConfig) => void;
  onEdit: (config: LMSConfig) => void;
  onRemove: (config: LMSConfig) => void;
  onCloseForm: () => void;
}

export const LMSIntegrationsTab: React.FC<LMSIntegrationsTabProps> = ({
  lmsConfigs,
  showAddLms,
  editingConfig,
  formData,
  loading,
  testing,
  onShowAddLms,
  onFormDataChange,
  onSave,
  onTest,
  onEdit,
  onRemove,
  onCloseForm,
}) => {
  return (
    <div className="space-y-6">
      {/* LMS Overview */}
      <LMSOverviewCard 
        lmsConfigs={lmsConfigs} 
        totalSupported={LMS_TYPES.length}
      />

      {/* Configured LMS List */}
      {lmsConfigs.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Your Integrations</h3>
          {lmsConfigs.map(config => (
            <LMSConfigCard
              key={config.id}
              config={config}
              testing={testing}
              onTest={onTest}
              onEdit={onEdit}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}

      {/* Add New LMS */}
      {showAddLms ? (
        <AddLMSForm
          editingConfig={editingConfig}
          formData={formData}
          loading={loading}
          onClose={onCloseForm}
          onFormDataChange={onFormDataChange}
          onSave={onSave}
        />
      ) : (
        <Card 
          className="border-2 border-dashed border-gray-200 hover:border-blue-300 transition-colors cursor-pointer"
          onClick={onShowAddLms}
        >
          <CardContent className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <Plus className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold mb-2">Add LMS Integration</h3>
            <p className="text-sm text-gray-500">
              Connect Canvas, Moodle, Blackboard, or other supported LMS
            </p>
          </CardContent>
        </Card>
      )}

      {/* Supported LMS Grid */}
      <SupportedLMSGrid />
    </div>
  );
};
