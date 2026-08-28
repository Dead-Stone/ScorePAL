/**
 * LMS Overview Card Component
 */

import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Globe } from 'lucide-react';
import { LMSConfig } from './types';

interface LMSOverviewCardProps {
  lmsConfigs: LMSConfig[];
  totalSupported: number;
}

export const LMSOverviewCard: React.FC<LMSOverviewCardProps> = ({
  lmsConfigs,
  totalSupported,
}) => {
  return (
    <Card className="border-0 shadow-md bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold mb-2">Learning Management Systems</h2>
            <p className="text-white/80">
              Connect your LMS to pull courses, assignments, and submissions for AI-powered grading
            </p>
          </div>
          <Globe className="w-16 h-16 text-white/20" />
        </div>
        <div className="flex gap-4 mt-4">
          <div className="bg-white/10 rounded-lg px-4 py-2">
            <div className="text-2xl font-bold">{lmsConfigs.length}</div>
            <div className="text-xs text-white/70">Connected</div>
          </div>
          <div className="bg-white/10 rounded-lg px-4 py-2">
            <div className="text-2xl font-bold">{lmsConfigs.filter(c => c.isValid).length}</div>
            <div className="text-xs text-white/70">Verified</div>
          </div>
          <div className="bg-white/10 rounded-lg px-4 py-2">
            <div className="text-2xl font-bold">{totalSupported}</div>
            <div className="text-xs text-white/70">Supported</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
