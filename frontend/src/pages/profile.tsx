/**
 * ScorePAL - Modern Profile Page
 * Sleek user profile management interface
 */

import React, { useState, useEffect } from 'react';
import { GetStaticProps } from 'next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { TopNavBar } from '../components/layout/TopNavBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  Loader2, 
  Brain, 
  User, 
  Mail, 
  Building2, 
  BookOpen,
  Edit2,
  Save,
  X,
  LogOut,
  Award,
  Calendar,
  CheckCircle2,
  Shield,
  Sparkles,
  TrendingUp,
  Star,
} from 'lucide-react';
import AIProfileSettings from '../components/AIProfileSettings';
import { profileSchema, ProfileForm } from '../components/profile/types';
import { cn } from '@/lib/utils';

export const getStaticProps: GetStaticProps = async () => {
  return { props: {}, revalidate: 3600 };
};

export default function ProfilePage() {
  const { user, userStats, updateProfile, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
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
        setMessageType('success');
        setIsEditMode(false);
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Failed to update profile. Please try again.');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('An error occurred while updating your profile.');
      setMessageType('error');
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
      <div className="flex flex-col items-center justify-center min-h-screen page-gradient gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center animate-pulse">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <p className="text-gray-500 font-medium">Loading profile...</p>
      </div>
    );
  }

  const memberSince = new Date(user.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  return (
    <ProtectedRoute>
      <div className="min-h-screen page-gradient">
        <TopNavBar />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pt-24">
          {/* Profile Header */}
          <div className="animate-fade-in mb-8">
            <Card className="card-modern overflow-hidden">
              <div className="h-32 bg-gradient-to-r from-blue-500 via-violet-500 to-purple-500"></div>
              <CardContent className="relative px-6 pb-6">
                <div className="flex flex-col md:flex-row md:items-end gap-6 -mt-16">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-32 h-32 rounded-2xl bg-white shadow-xl flex items-center justify-center text-4xl font-bold text-white overflow-hidden ring-4 ring-white">
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
                        {user.first_name?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                      </div>
                    </div>
                    {user.is_verified && (
                      <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center ring-4 ring-white">
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 md:pb-2">
                    <h1 className="text-2xl font-bold text-gray-900">
                      {user.first_name && user.last_name 
                        ? `${user.first_name} ${user.last_name}`
                        : user.email?.split('@')[0] || 'User'}
                    </h1>
                    <p className="text-gray-500">{user.email}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <span className={cn(
                        "badge-modern",
                        user.role === 'admin' ? 'badge-violet' :
                        user.role === 'teacher' ? 'badge-blue' :
                        user.role === 'grader' ? 'badge-amber' :
                        'badge-green'
                      )}>
                        <Shield className="w-3 h-3 mr-1.5" />
                        {user.role}
                      </span>
                      <span className="text-sm text-gray-400">•</span>
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Member since {memberSince}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    {!isEditMode ? (
                      <Button 
                        onClick={() => setIsEditMode(true)}
                        className="btn-primary"
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit Profile
                      </Button>
                    ) : (
                      <>
                        <Button 
                          variant="outline"
                          onClick={handleCancel}
                          className="border-gray-200"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                        <Button 
                          onClick={form.handleSubmit(onSubmit)}
                          disabled={isLoading}
                          className="btn-primary"
                        >
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4 mr-2" />
                          )}
                          Save Changes
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Message Alert */}
          {message && (
            <div className={cn(
              "mb-6 p-4 rounded-xl flex items-center gap-3 animate-fade-in-down",
              messageType === 'success' 
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            )}>
              {messageType === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <X className="w-5 h-5 text-rose-600" />
              )}
              <span className="font-medium">{message}</span>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="data-label mb-1">Total Gradings</p>
                  <p className="data-value-lg">{userStats.total_gradings}</p>
                </div>
                <div className="icon-container-blue w-14 h-14">
                  <Award className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="data-label mb-1">Free Gradings Left</p>
                  <p className="data-value-lg">{userStats.free_gradings_remaining}</p>
                </div>
                <div className="icon-container-emerald w-14 h-14">
                  <Star className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="data-label mb-1">Account Status</p>
                  <p className="data-value-lg text-emerald-600">Active</p>
                </div>
                <div className="icon-container-violet w-14 h-14">
                  <TrendingUp className="w-6 h-6 text-violet-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Profile Information */}
            <Card className="card-modern animate-fade-in-up" style={{ animationDelay: '150ms' }}>
              <CardHeader className="border-b border-gray-100 bg-gray-50/50">
                <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-900">
                  <div className="icon-container-blue w-10 h-10">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="data-label block mb-2">First Name</label>
                      {isEditMode ? (
                        <input
                          {...form.register('first_name')}
                          className="input-modern"
                          placeholder="Enter first name"
                        />
                      ) : (
                        <p className="text-gray-900 font-medium">{user.first_name || '—'}</p>
                      )}
                    </div>
                    <div>
                      <label className="data-label block mb-2">Last Name</label>
                      {isEditMode ? (
                        <input
                          {...form.register('last_name')}
                          className="input-modern"
                          placeholder="Enter last name"
                        />
                      ) : (
                        <p className="text-gray-900 font-medium">{user.last_name || '—'}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="data-label block mb-2">Email</label>
                    <div className="flex items-center gap-2 text-gray-900 font-medium">
                      <Mail className="w-4 h-4 text-gray-400" />
                      {user.email}
                    </div>
                  </div>

                  <div>
                    <label className="data-label block mb-2">Institution</label>
                    {isEditMode ? (
                      <input
                        {...form.register('institution')}
                        className="input-modern"
                        placeholder="Enter your institution"
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-gray-900 font-medium">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        {user.institution || '—'}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="data-label block mb-2">Department</label>
                    {isEditMode ? (
                      <input
                        {...form.register('department')}
                        className="input-modern"
                        placeholder="Enter your department"
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-gray-900 font-medium">
                        <BookOpen className="w-4 h-4 text-gray-400" />
                        {user.department || '—'}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="data-label block mb-2">Bio</label>
                    {isEditMode ? (
                      <textarea
                        {...form.register('bio')}
                        className="input-modern min-h-[100px] resize-none"
                        placeholder="Tell us about yourself..."
                      />
                    ) : (
                      <p className="text-gray-700">{user.bio || 'No bio added yet.'}</p>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* AI Settings */}
            <Card className="card-modern animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <CardHeader className="border-b border-gray-100 bg-gray-50/50">
                <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-900">
                  <div className="icon-container-violet w-10 h-10">
                    <Brain className="w-5 h-5 text-violet-600" />
                  </div>
                  AI Model Settings
                </CardTitle>
                <CardDescription className="text-gray-500 mt-1">
                  Configure your preferred AI model for grading
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <AIProfileSettings />
              </CardContent>
            </Card>
          </div>

          {/* Logout Section */}
          <div className="mt-8 animate-fade-in-up" style={{ animationDelay: '250ms' }}>
            <Card className="card-modern border-rose-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Sign Out</h3>
                    <p className="text-sm text-gray-500">Sign out of your account on this device</p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={logout}
                    className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
