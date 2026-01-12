/**
 * LMS Configuration Card Component
 */

import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { CheckCircle2, XCircle, School, Loader2, Trash2, Edit } from 'lucide-react';
import { LMSConfig } from './types';
import { LMS_TYPES } from './constants';

interface LMSConfigCardProps {
  config: LMSConfig;
  testing: string | null;
  onTest: (config: LMSConfig) => void;
  onEdit: (config: LMSConfig) => void;
  onRemove: (config: LMSConfig) => void;
}

export const LMSConfigCard: React.FC<LMSConfigCardProps> = ({
  config,
  testing,
  onTest,
  onEdit,
  onRemove,
}) => {
  const lmsInfo = LMS_TYPES.find(l => l.id === config.type);
  if (!lmsInfo) return null;

  return (
    <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${lmsInfo.color}15` }}
            >
              {lmsInfo.icon ? (
                <img src={lmsInfo.icon} alt={lmsInfo.name} className="w-8 h-8 object-contain" />
              ) : (
                <School className="w-6 h-6" style={{ color: lmsInfo.color }} />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{config.name}</h3>
              <p className="text-sm text-gray-500">{config.instanceUrl}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {config.isValid ? (
              <span className="flex items-center gap-1 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                <CheckCircle2 className="w-4 h-4" />
                Connected
              </span>
            ) : config.isConfigured ? (
              <span className="flex items-center gap-1 text-sm text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full">
                <XCircle className="w-4 h-4" />
                Not Verified
              </span>
            ) : (
              <span className="flex items-center gap-1 text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                <XCircle className="w-4 h-4" />
                Not Configured
              </span>
            )}
          </div>
        </div>
        
        {config.userInfo && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Connected as: <strong>{config.userInfo.name}</strong>
              {config.userInfo.email && ` (${config.userInfo.email})`}
            </p>
            {config.userInfo.roles && config.userInfo.roles.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Roles: {config.userInfo.roles.join(', ')}
              </p>
            )}
          </div>
        )}
        
        <div className="mt-4 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onTest(config)}
            disabled={testing === config.id}
          >
            {testing === config.id ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              'Test Connection'
            )}
          </Button>
          {config.isConfigured && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(config)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRemove(config)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
