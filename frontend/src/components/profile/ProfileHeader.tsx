/**
 * Profile Header Component
 */

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { getInitials, getRoleColor } from './utils';

interface ProfileHeaderProps {
  user: any;
  userStats: any;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ user, userStats }) => {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-lg p-8 mb-6">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
        <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
          <AvatarImage src={user?.avatar_url} alt={user?.full_name || 'User'} />
          <AvatarFallback className="bg-white text-blue-600 text-2xl font-bold">
            {getInitials(user)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 text-center md:text-left">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {user?.full_name || user?.email || 'User'}
              </h1>
              <p className="text-blue-100 text-lg">{user?.email}</p>
            </div>
            {user?.role && (
              <Badge className={`${getRoleColor(user.role)} text-sm px-4 py-2 capitalize border`}>
                {user.role}
              </Badge>
            )}
          </div>
          {userStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-white">{userStats.total_gradings || 0}</div>
                <div className="text-blue-100 text-sm">Total Gradings</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-white">
                  {userStats.average_score ? `${userStats.average_score.toFixed(1)}%` : 'N/A'}
                </div>
                <div className="text-blue-100 text-sm">Avg Score</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-white">{userStats.total_students || 0}</div>
                <div className="text-blue-100 text-sm">Students</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-white">{userStats.total_assignments || 0}</div>
                <div className="text-blue-100 text-sm">Assignments</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
