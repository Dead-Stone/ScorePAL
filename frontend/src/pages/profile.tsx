/**
 * ScorePAL - User Profile Page
 * Refactored to use modular components
 */

import React, { useState, useEffect } from 'react';
import { GetStaticProps } from 'next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { TopNavBar } from '../components/layout/TopNavBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Loader2, Brain } from 'lucide-react';
import AIProfileSettings from '../components/AIProfileSettings';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { ProfileFormComponent } from '../components/profile/ProfileForm';
import { profileSchema, ProfileForm } from '../components/profile/types';

export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {},
    revalidate: 3600,
  };
};

export default function ProfilePage() {
  const { user, userStats, updateProfile, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      role: user?.role || 'teacher',
      institution: user?.institution || '',
      department: user?.department || '',
      bio: user?.bio || '',
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        role: user.role || 'teacher',
        institution: user.institution || '',
        department: user.department || '',
        bio: user.bio || '',
      });
    }
  }, [user, form]);

  const onSubmit = async (data: ProfileForm) => {
    setIsLoading(true);
    setMessage('');

    try {
      const success = await updateProfile(data);
      if (success) {
        setMessage('Profile updated successfully!');
        setIsEditMode(false);
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Failed to update profile. Please try again.');
      }
    } catch (error) {
      setMessage('An error occurred while updating your profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    form.reset({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      role: user?.role || 'teacher',
      institution: user?.institution || '',
      department: user?.department || '',
      bio: user?.bio || '',
    });
    setIsEditMode(false);
    setMessage('');
  };

  if (!user || !userStats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <TopNavBar />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
          <ProfileHeader user={user} userStats={userStats} />

          <div className="space-y-6">
            <ProfileFormComponent
              form={form}
              user={user}
              isEditMode={isEditMode}
              isLoading={isLoading}
              message={message}
              onEdit={() => setIsEditMode(true)}
              onCancel={handleCancel}
              onSubmit={onSubmit}
              onLogout={logout}
            />

            <Card className="border-0 shadow-md mt-6">
              <CardHeader className="bg-white border-b border-gray-200">
                <CardTitle className="flex items-center text-gray-900 text-xl">
                  <Brain className="w-5 h-5 mr-2 text-blue-600" />
                  AI Model Settings
                </CardTitle>
                <CardDescription className="text-gray-600 mt-1">
                  Configure your AI model preferences for grading and assistance
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <AIProfileSettings />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
