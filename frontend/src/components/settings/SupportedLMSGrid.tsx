/**
 * Supported LMS Grid Component
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { School, Shield } from 'lucide-react';
import { LMS_TYPES } from './constants';

export const SupportedLMSGrid: React.FC = () => {
  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-green-600" />
          Supported Platforms
        </CardTitle>
        <CardDescription>
          Connect any of these learning management systems
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {LMS_TYPES.map(lms => (
            <div 
              key={lms.id}
              className={`p-4 rounded-xl text-center border ${
                lms.id === 'canvas' 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-gray-100 bg-gray-50 opacity-60'
              }`}
            >
              {lms.icon ? (
                <img src={lms.icon} alt={lms.name} className="w-10 h-10 mx-auto mb-2 object-contain" />
              ) : (
                <School className="w-10 h-10 mx-auto mb-2" style={{ color: lms.color }} />
              )}
              <div className="text-xs font-medium">{lms.name}</div>
              {lms.id === 'canvas' ? (
                <span className="text-xs text-green-600">Available</span>
              ) : (
                <span className="text-xs text-gray-400">Coming Soon</span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
