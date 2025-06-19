/**
 * ScorePAL - Registration Page
 * Complete registration form with role selection and validation
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 */

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../components/ui/form';
import { Badge } from '../../components/ui/badge';
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  User,
  Building,
  GraduationCap,
  ArrowLeft,
  Github,
  Chrome,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { API_ENDPOINTS } from '@/config/api';

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter'),
  confirmPassword: z.string(),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  role: z.enum(['teacher', 'admin', 'student', 'grader']),
  institution: z.string().optional(),
  department: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

const roles = [
  {
    value: 'teacher',
    label: 'Teacher',
    description: 'Educator looking to streamline grading',
    icon: GraduationCap,
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  {
    value: 'admin',
    label: 'Administrator',
    description: 'Managing institutional grading systems',
    icon: Building,
    color: 'bg-purple-100 text-purple-800 border-purple-200'
  },
  {
    value: 'student',
    label: 'Student',
    description: 'Learning and submitting assignments',
    icon: User,
    color: 'bg-green-100 text-green-800 border-green-200'
  },
  {
    value: 'grader',
    label: 'Grader/TA',
    description: 'Teaching assistant or professional grader',
    icon: CheckCircle,
    color: 'bg-orange-100 text-orange-800 border-orange-200'
  }
];

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const router = useRouter();

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      role: 'teacher',
      institution: '',
      department: '',
    },
  });

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    setError('');

    try {
      // Using centralized API config - change in /src/config/api.js for all endpoints
      // const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
      const response = await fetch(API_ENDPOINTS.AUTH.REGISTER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          // FastAPI Users base fields
          is_active: true,
          is_superuser: false,
          is_verified: false,
          // Custom fields from UserCreate schema
          first_name: data.firstName,
          last_name: data.lastName,
          role: data.role,
          institution: data.institution || null,
          department: data.department || null,
        }),
      });

      if (response.ok) {
        // Registration successful
        router.push('/auth/login?message=Registration successful! Please sign in.');
      } else {
        const errorData = await response.json();
        console.error('Registration error details:', errorData);
        
        // Handle validation errors
        if (response.status === 422 && errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            const fieldErrors = errorData.detail.map((err: any) => 
              `${err.loc?.join(' -> ') || 'Field'}: ${err.msg}`
            ).join(', ');
            setError(`Validation error: ${fieldErrors}`);
          } else {
            setError(errorData.detail);
          }
        } else {
          setError(errorData.detail || errorData.message || 'Registration failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('An error occurred during registration. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignup = (provider: 'google' | 'github') => {
    window.location.href = `/auth/${provider}/authorize?redirect_uri=${encodeURIComponent(window.location.origin + '/auth/callback')}`;
  };

  const selectedRole = roles.find(role => role.value === form.watch('role'));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Back to Home */}
        <Link href="/landing" className="flex items-center text-gray-600 hover:text-gray-900 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <Card className="shadow-2xl border-0">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <Image
                src="/scorePAL-logo.png"
                alt="ScorePAL Logo"
                width={60}
                height={60}
                className="rounded-xl"
              />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Create your account</CardTitle>
            <CardDescription className="text-gray-600">
              Join thousands of educators transforming their grading experience
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {step === 1 && (
              <>
                {/* Social Signup Buttons */}
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full h-12 text-gray-700 border-gray-300 hover:bg-gray-50"
                    onClick={() => handleSocialSignup('google')}
                    disabled={isLoading}
                  >
                    <Chrome className="w-5 h-5 mr-3" />
                    Continue with Google
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full h-12 text-gray-700 border-gray-300 hover:bg-gray-50"
                    onClick={() => handleSocialSignup('github')}
                    disabled={isLoading}
                  >
                    <Github className="w-5 h-5 mr-3" />
                    Continue with GitHub
                  </Button>
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">Or register with email</span>
                  </div>
                </div>

                {/* Basic Info Form */}
                <Form {...form}>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">First Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="John"
                              className="h-12 border-gray-300"
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">Last Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Doe"
                              className="h-12 border-gray-300"
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <Input
                              {...field}
                              type="email"
                              placeholder="john@university.edu"
                              className="pl-10 h-12 border-gray-300"
                              disabled={isLoading}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                    disabled={!form.watch('firstName') || !form.watch('lastName') || !form.watch('email') || !form.watch('email').includes('@')}
                  >
                    Continue
                  </Button>
                </Form>
              </>
            )}

            {step === 2 && (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Role Selection */}
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 text-lg font-semibold">I am a...</FormLabel>
                        <FormControl>
                          <div className="grid grid-cols-2 gap-3">
                            {roles.map((role) => (
                              <label
                                key={role.value}
                                className={`relative flex flex-col p-4 rounded-lg border-2 cursor-pointer transition-all hover:bg-gray-50 ${
                                  field.value === role.value
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200'
                                }`}
                              >
                                <input
                                  type="radio"
                                  value={role.value}
                                  checked={field.value === role.value}
                                  onChange={(e) => field.onChange(e.target.value)}
                                  className="sr-only"
                                />
                                <role.icon className="w-6 h-6 text-gray-700 mb-2" />
                                <span className="font-medium text-gray-900">{role.label}</span>
                                <span className="text-sm text-gray-600">{role.description}</span>
                              </label>
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Institution & Department */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="institution"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">Institution (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="University of..."
                              className="h-12 border-gray-300"
                              disabled={isLoading}
                            />
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
                          <FormLabel className="text-gray-700">Department (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Computer Science..."
                              className="h-12 border-gray-300"
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Password Fields */}
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <Input
                              {...field}
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Create a strong password"
                              className="pl-10 pr-10 h-12 border-gray-300"
                              disabled={isLoading}
                            />
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              onClick={() => setShowPassword(!showPassword)}
                              disabled={isLoading}
                            >
                              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">Confirm Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <Input
                              {...field}
                              type={showConfirmPassword ? 'text' : 'password'}
                              placeholder="Confirm your password"
                              className="pl-10 pr-10 h-12 border-gray-300"
                              disabled={isLoading}
                            />
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              disabled={isLoading}
                            >
                              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}

                  {/* Terms Agreement */}
                  <div className="flex items-start space-x-2">
                    <input
                      id="terms"
                      type="checkbox"
                      required
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                    />
                    <label htmlFor="terms" className="text-sm text-gray-600 leading-relaxed">
                      I agree to the{' '}
                      <a href="#" className="text-blue-600 hover:text-blue-700">Terms of Service</a>
                      {' '}and{' '}
                      <a href="#" className="text-blue-600 hover:text-blue-700">Privacy Policy</a>
                    </label>
                  </div>

                  <div className="flex space-x-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="flex-1 h-12"
                      disabled={isLoading}
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        'Create account'
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            )}

            {/* Sign in link */}
            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Features highlight */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center space-x-8 text-sm text-gray-500">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              10 Free Batch Gradings
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              Unlimited Single PDFs
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              No Credit Card Required
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 