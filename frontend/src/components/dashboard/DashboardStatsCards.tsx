/**
 * Dashboard Stats Cards Component
 */

import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Award, TrendingUp, FileText, Users } from 'lucide-react';
import { DashboardStats } from './types';

interface DashboardStatsCardsProps {
  stats: DashboardStats;
}

export const DashboardStatsCards: React.FC<DashboardStatsCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Total Gradings</p>
              <p className="text-xl font-bold text-gray-900 truncate">{stats.totalGradings}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 ml-2">
              <Award className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Avg Score</p>
              <p className="text-xl font-bold text-gray-900 truncate">{stats.avgScore.toFixed(1)}%</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0 ml-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Assignments</p>
              <p className="text-xl font-bold text-gray-900 truncate">{stats.uniqueAssignments}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0 ml-2">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Students</p>
              <p className="text-xl font-bold text-gray-900 truncate">{stats.uniqueStudents}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0 ml-2">
              <Users className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
