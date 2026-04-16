/**
 * Profile Form Component
 */

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
  User,
  Building,
  GraduationCap,
  Edit,
  Save,
  Loader2,
  X,
  UserCog,
} from 'lucide-react';
import { ProfileForm } from './types';

interface ProfileFormProps {
  form: UseFormReturn<ProfileForm>;
  user: any;
  isEditMode: boolean;
  isLoading: boolean;
  message: string;
  onEdit: () => void;
  onCancel: () => void;
  onSubmit: (data: ProfileForm) => void;
  onLogout: () => void;
}

export const ProfileFormComponent: React.FC<ProfileFormProps> = ({
  form,
  user,
  isEditMode,
  isLoading,
  message,
  onEdit,
  onCancel,
  onSubmit,
  onLogout,
}) => {
  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center text-gray-900 text-xl">
              <User className="w-5 h-5 mr-2 text-blue-600" />
              Profile Information
            </CardTitle>
            <CardDescription className="text-gray-600 mt-1">
              Manage your personal information and preferences
            </CardDescription>
          </div>
          {!isEditMode && (
            <Button
              type="button"
              onClick={onEdit}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-gray-700 mb-2 block">Role</FormLabel>
                  {!isEditMode ? (
                    <div className="flex items-center min-h-[44px] px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                      <UserCog className="w-4 h-4 mr-3 text-gray-400" />
                      <span className="text-gray-900 capitalize">{field.value || user?.role || 'Not set'}</span>
                    </div>
                  ) : (
                    <FormControl>
                      <select
                        {...field}
                        className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        disabled={isLoading}
                      >
                        <option value="teacher">Teacher</option>
                        <option value="student">Student</option>
                        <option value="grader">Grader</option>
                        <option value="admin">Admin</option>
                      </select>
                    </FormControl>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700 mb-2 block">First Name</FormLabel>
                    {!isEditMode ? (
                      <div className="flex items-center min-h-[44px] px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                        <User className="w-4 h-4 mr-3 text-gray-400" />
                        <span className="text-gray-900">{field.value || 'Not set'}</span>
                      </div>
                    ) : (
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
                          <Input
                            {...field}
                            placeholder="John"
                            className="pl-10 h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white"
                            disabled={isLoading}
                          />
                        </div>
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700 mb-2 block">Last Name</FormLabel>
                    {!isEditMode ? (
                      <div className="flex items-center min-h-[44px] px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                        <User className="w-4 h-4 mr-3 text-gray-400" />
                        <span className="text-gray-900">{field.value || 'Not set'}</span>
                      </div>
                    ) : (
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
                          <Input
                            {...field}
                            placeholder="Doe"
                            className="pl-10 h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white"
                            disabled={isLoading}
                          />
                        </div>
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="institution"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700 mb-2 block">Institution</FormLabel>
                    {!isEditMode ? (
                      <div className="flex items-center min-h-[44px] px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                        <Building className="w-4 h-4 mr-3 text-gray-400" />
                        <span className="text-gray-900">{field.value || 'Not set'}</span>
                      </div>
                    ) : (
                      <FormControl>
                        <div className="relative">
                          <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
                          <Input
                            {...field}
                            placeholder="University of..."
                            className="pl-10 h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white"
                            disabled={isLoading}
                          />
                        </div>
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-gray-700 mb-2 block">Department</FormLabel>
                    {!isEditMode ? (
                      <div className="flex items-center min-h-[44px] px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                        <GraduationCap className="w-4 h-4 mr-3 text-gray-400" />
                        <span className="text-gray-900">{field.value || 'Not set'}</span>
                      </div>
                    ) : (
                      <FormControl>
                        <div className="relative">
                          <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
                          <Input
                            {...field}
                            placeholder="Computer Science"
                            className="pl-10 h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white"
                            disabled={isLoading}
                          />
                        </div>
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-gray-700 mb-2 block">Bio</FormLabel>
                  {!isEditMode ? (
                    <div className="min-h-[44px] px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-gray-900">{field.value || 'No bio set'}</span>
                    </div>
                  ) : (
                    <FormControl>
                      <textarea
                        {...field}
                        placeholder="Tell us about yourself..."
                        className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white resize-none"
                        disabled={isLoading}
                      />
                    </FormControl>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {message && (
              <div className={`p-4 rounded-lg border ${
                message.includes('success') || message.includes('Success')
                  ? 'bg-green-50 border-green-200 text-green-700' 
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                <p className="text-sm font-medium">{message}</p>
              </div>
            )}

            {isEditMode ? (
              <div className="flex justify-end items-center gap-3 pt-6 border-t border-gray-200 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isLoading}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 px-5"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 shadow-sm"
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
            ) : (
              <div className="flex justify-end items-center pt-6 border-t border-gray-200 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onLogout}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 px-5"
                >
                  Logout
                </Button>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
