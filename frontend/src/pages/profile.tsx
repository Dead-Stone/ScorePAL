/**
 * ScorePAL - User Profile Page
 * Complete profile management with stats and settings
 * Statically generated at build time - data fetched client-side
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 */

import React, { useState } from 'react';
import { GetStaticProps } from 'next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { PageLayout } from '../components/layout/PageLayout';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../components/ui/form';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Tab, Tabs, Box } from '@mui/material';
import AIProfileSettings from '../components/AIProfileSettings';
import { 
  User, 
  Mail, 
  Building, 
  GraduationCap,
  Calendar,
  BarChart3,
  Award,
  Shield,
  Settings,
  Save,
  Loader2,
  BookOpen,
  Brain,
  Zap
} from 'lucide-react';

const profileSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  institution: z.string().optional(),
  department: z.string().optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

// Static generation - compile at build time only
export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {},
    revalidate: 3600, // Revalidate every hour
  };
};

export default function ProfilePage() {
  const { user, userStats, updateProfile, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('profile');

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      institution: user?.institution || '',
      department: user?.department || '',
      bio: user?.bio || '',
    },
  });

  const onSubmit = async (data: ProfileForm) => {
    setIsLoading(true);
    setMessage('');

    try {
      const success = await updateProfile(data);
      if (success) {
        setMessage('Profile updated successfully!');
      } else {
        setMessage('Failed to update profile. Please try again.');
      }
    } catch (error) {
      setMessage('An error occurred while updating your profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    const colors = {
      teacher: 'bg-blue-100 text-blue-800 border-blue-200',
      admin: 'bg-purple-100 text-purple-800 border-purple-200',
      student: 'bg-green-100 text-green-800 border-green-200',
      grader: 'bg-orange-100 text-orange-800 border-orange-200'
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return user?.email[0].toUpperCase() || 'U';
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
      <PageLayout maxWidth="lg">
        <PageHeader
          title="Profile Settings"
          subtitle="Manage your account and preferences"
        />

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile Overview */}
          <div className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader className="text-center bg-gradient-to-br from-blue-50 to-indigo-50 rounded-t-lg pb-4">
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
                      <AvatarImage src={user.profile_picture} />
                      <AvatarFallback className="text-2xl font-semibold bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 border-2 border-white rounded-full"></div>
                  </div>
                </div>
                <CardTitle className="text-xl font-bold text-gray-900">
                  {user.first_name && user.last_name 
                    ? `${user.first_name} ${user.last_name}` 
                    : user.email}
                </CardTitle>
                <CardDescription className="flex items-center justify-center mt-2">
                  <Mail className="w-4 h-4 mr-2 text-gray-500" />
                  <span className="text-gray-600">{user.email}</span>
                </CardDescription>
                <div className="flex justify-center mt-4">
                  <Badge className={`${getRoleColor(user.role)} px-3 py-1 text-sm font-semibold`}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
            </Card>

            {/* Usage Stats */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-t-lg">
                <CardTitle className="flex items-center text-gray-900">
                  <BarChart3 className="w-5 h-5 mr-2 text-indigo-600" />
                  Usage Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 pt-6">
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                  <div className="flex items-center">
                    <Award className="w-4 h-4 mr-2 text-gray-500" />
                    <span className="text-sm text-gray-600">Total Gradings</span>
                  </div>
                  <span className="font-bold text-lg text-gray-900">{userStats.total_gradings}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                  <div className="flex items-center">
                    <Zap className="w-4 h-4 mr-2 text-gray-500" />
                    <span className="text-sm text-gray-600">Free Gradings Left</span>
                  </div>
                  <span className="font-bold text-lg text-green-600">
                    {userStats.free_gradings_remaining}/10
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                    <span className="text-sm text-gray-600">Member Since</span>
                  </div>
                  <span className="font-semibold text-sm text-gray-700">
                    {new Date(userStats.member_since).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Account Status */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-t-lg">
                <CardTitle className="flex items-center text-gray-900">
                  <Shield className="w-5 h-5 mr-2 text-green-600" />
                  Account Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Account Active</span>
                  <Badge className={`${user.is_active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'} px-3 py-1 font-semibold`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Email Verified</span>
                  <Badge className={`${user.is_verified ? 'bg-green-100 text-green-800 border-green-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200'} px-3 py-1 font-semibold`}>
                    {user.is_verified ? 'Verified' : 'Pending'}
                  </Badge>
                </div>
                {user.last_login && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Last Login</span>
                    <span className="text-sm font-semibold text-gray-700">
                      {new Date(user.last_login).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Profile Form */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-t-lg">
                <CardTitle className="flex items-center text-gray-900">
                  <Settings className="w-5 h-5 mr-2 text-blue-600" />
                  Profile Settings
                </CardTitle>
                <CardDescription className="text-gray-600 mt-1">
                  Manage your personal information, AI configurations, and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onChange={(event, newValue) => setActiveTab(newValue)}>
                  <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                    <Tab 
                      value="profile" 
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <User className="w-4 h-4" />
                          Profile
                        </Box>
                      } 
                    />
                    <Tab 
                      value="ai-settings" 
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Brain className="w-4 h-4" />
                          AI Models
                        </Box>
                      } 
                    />
                  </Box>
                  
                  {activeTab === "profile" && (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Name Fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="first_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                  {...field}
                                  placeholder="John"
                                  className="pl-10"
                                  disabled={isLoading}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="last_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                  {...field}
                                  placeholder="Doe"
                                  className="pl-10"
                                  disabled={isLoading}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Institution & Department */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="institution"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Institution</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                  {...field}
                                  placeholder="University of..."
                                  className="pl-10"
                                  disabled={isLoading}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="department"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Department</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                  {...field}
                                  placeholder="Computer Science..."
                                  className="pl-10"
                                  disabled={isLoading}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Bio */}
                    <FormField
                      control={form.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bio</FormLabel>
                          <FormControl>
                            <textarea
                              {...field}
                              placeholder="Tell us about yourself..."
                              className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {message && (
                      <div className={`p-3 rounded-md ${
                        message.includes('success') 
                          ? 'bg-green-50 border border-green-200 text-green-600' 
                          : 'bg-red-50 border border-red-200 text-red-600'
                      }`}>
                        <p className="text-sm">{message}</p>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={logout}
                      >
                        Logout
                      </Button>
                      <Button
                        type="submit"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
                  )}
                  
                  {activeTab === "ai-settings" && (
                    <AIProfileSettings />
                  )}
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageLayout>
    </ProtectedRoute>
  );
} 