/**
 * General Settings Tab Component
 */

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import {
  Settings as SettingsIcon,
  GraduationCap,
  BarChart3,
  CheckCircle2,
  Info,
} from 'lucide-react';

interface GeneralSettingsTabProps {
  user: any;
}

export const GeneralSettingsTab: React.FC<GeneralSettingsTabProps> = ({ user }) => {
  return (
    <div className="space-y-6">
      {/* Account Settings */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
          <CardDescription>
            Manage your account preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 font-bold">
                  {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </span>
              </div>
              <div>
                <div className="font-medium">{user?.full_name || 'User'}</div>
                <div className="text-sm text-gray-500">{user?.email}</div>
              </div>
            </div>
            <Link href="/profile">
              <Button variant="outline" size="sm">
                Edit Profile
              </Button>
            </Link>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium">Role</div>
              <div className="text-sm text-gray-500">Your account type</div>
            </div>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium capitalize">
              {user?.role || 'User'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <Link href="/grade">
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-md transition-shadow cursor-pointer">
                <GraduationCap className="w-8 h-8 text-blue-600 mb-2" />
                <div className="font-medium">Start Grading</div>
                <div className="text-sm text-gray-500">Grade submissions</div>
              </div>
            </Link>
            <Link href="/rubrics">
              <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 hover:shadow-md transition-shadow cursor-pointer">
                <BarChart3 className="w-8 h-8 text-purple-600 mb-2" />
                <div className="font-medium">Rubrics</div>
                <div className="text-sm text-gray-500">Manage rubrics</div>
              </div>
            </Link>
            <Link href="/results">
              <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-teal-50 hover:shadow-md transition-shadow cursor-pointer">
                <CheckCircle2 className="w-8 h-8 text-green-600 mb-2" />
                <div className="font-medium">Results</div>
                <div className="text-sm text-gray-500">View all results</div>
              </div>
            </Link>
            <Link href="/help">
              <div className="p-4 rounded-xl bg-gradient-to-br from-orange-50 to-yellow-50 hover:shadow-md transition-shadow cursor-pointer">
                <Info className="w-8 h-8 text-orange-600 mb-2" />
                <div className="font-medium">Help</div>
                <div className="text-sm text-gray-500">Documentation</div>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
