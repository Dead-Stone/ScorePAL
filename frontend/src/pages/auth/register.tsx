/**
 * ScorePAL - Registration Page
 * JWT authentication registration with role selection and validation
 * Statically generated at build time
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 */

import React, { useState, useEffect } from 'react';
import { GetStaticProps } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import dynamic from 'next/dynamic';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../components/ui/form';
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  User,
  Building,
  GraduationCap,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { API_ENDPOINTS } from '@/config/api';
import { InstitutionDetector } from '../../components/institution/InstitutionDetector';
import { TopNavBar } from '../../components/layout/TopNavBar';

// Dynamically import Lottie to avoid SSR issues
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

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

// Static generation - compile at build time only
export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {},
    revalidate: 3600, // Revalidate every hour
  };
};

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [userId, setUserId] = useState('');
  const [animationData, setAnimationData] = useState<any>(null);
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

  // Load Lottie animation
  useEffect(() => {
    const loadAnimation = async () => {
      try {
        const response = await fetch('/Exams Preparation..json');
        if (response.ok) {
          const data = await response.json();
          setAnimationData(data);
        }
      } catch (error) {
        console.warn('Failed to load animation:', error);
      }
    };
    loadAnimation();
  }, []);

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(API_ENDPOINTS.AUTH.REGISTER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          is_active: true,
          is_superuser: false,
          is_verified: false,
          first_name: data.firstName,
          last_name: data.lastName,
          role: data.role,
          institution: data.institution || null,
          department: data.department || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setUserId(data.id);
        setOtpSent(true);
        setStep(3); // Move to OTP verification step
      } else {
        const errorData = await response.json();
        
        if (response.status === 422 && errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            const fieldErrors = errorData.detail.map((err: any) => 
              `${err.loc?.join(' -> ') || 'Field'}: ${err.msg}`
            ).join(', ');
            setError(`Validation error: ${fieldErrors}`);
          } else {
            setError(errorData.detail);
          }
        } else if (response.status === 400) {
          setError(errorData.detail || 'Email already exists. Please use a different email.');
        } else {
          setError(errorData.detail || errorData.message || 'Registration failed. Please try again.');
        }
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'An error occurred during registration. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <TopNavBar />
      <div className="flex min-h-screen pt-16">
        {/* Left Side - Registration Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12 overflow-y-auto">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Create your account</h1>
              <p className="text-gray-600">Join thousands of educators using ScorePAL</p>
            </div>

            {step === 1 && (
              <Form {...form}>
                <div className="space-y-5">
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
                              className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
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
                              className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
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
                        <FormLabel className="text-gray-700">College Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <Input
                              {...field}
                              type="email"
                              placeholder="john@university.edu"
                              className="pl-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                              disabled={isLoading}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                        <InstitutionDetector 
                          email={field.value} 
                          showAlert={true}
                        />
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
                </div>
              </Form>
            )}

            {step === 2 && (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  {!otpSent && (
                    <>
                      {/* Role Selection */}
                      <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700 text-base font-semibold">I am a...</FormLabel>
                            <FormControl>
                              <div className="grid grid-cols-2 gap-3">
                                {roles.map((role) => {
                                  const Icon = role.icon;
                                  return (
                                    <label
                                      key={role.value}
                                      className={`relative flex flex-col p-3 rounded-lg border-2 cursor-pointer transition-all hover:bg-gray-50 ${
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
                                      <Icon className="w-5 h-5 text-gray-700 mb-2" />
                                      <span className="font-medium text-sm text-gray-900">{role.label}</span>
                                      <span className="text-xs text-gray-600">{role.description}</span>
                                    </label>
                                  );
                                })}
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
                                  className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
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
                                  className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
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
                                  className="pl-10 pr-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
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
                                  className="pl-10 pr-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
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
                    </>
                  )}
                </form>
              </Form>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Verify your email</h3>
                  <p className="text-gray-600">
                    We've sent a 6-digit code to <span className="font-semibold">{form.watch('email')}</span>
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-gray-700 mb-2 block text-sm font-medium">Enter verification code</label>
                    <Input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="h-14 text-center text-2xl tracking-widest font-mono border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      disabled={isVerifyingOtp}
                    />
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}

                  <Button
                    onClick={async () => {
                      if (otpCode.length !== 6) {
                        setError('Please enter a 6-digit code');
                        return;
                      }
                      setIsVerifyingOtp(true);
                      setError('');
                      try {
                        const response = await fetch(`${API_ENDPOINTS.AUTH.REGISTER.replace('/register', '')}/verify-otp?email=${encodeURIComponent(form.watch('email'))}&otp_code=${otpCode}`, {
                          method: 'POST',
                        });
                        const data = await response.json();
                        if (response.ok) {
                          router.replace('/auth/login?message=' + encodeURIComponent('Email verified! Please sign in.'));
                        } else {
                          setError(data.detail || 'Invalid code. Please try again.');
                        }
                      } catch (err: any) {
                        setError('Verification failed. Please try again.');
                      } finally {
                        setIsVerifyingOtp(false);
                      }
                    }}
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                    disabled={isVerifyingOtp || otpCode.length !== 6}
                  >
                    {isVerifyingOtp ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify Email'
                    )}
                  </Button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={async () => {
                        setIsSendingOtp(true);
                        setError('');
                        try {
                          const response = await fetch(`${API_ENDPOINTS.AUTH.REGISTER.replace('/register', '')}/send-otp`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: form.watch('email') }),
                          });
                          if (response.ok) {
                            setError('');
                            alert('New code sent! Check your email.');
                          } else {
                            setError('Failed to send code. Please try again.');
                          }
                        } catch (err) {
                          setError('Failed to send code. Please try again.');
                        } finally {
                          setIsSendingOtp(false);
                        }
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      disabled={isSendingOtp}
                    >
                      {isSendingOtp ? 'Sending...' : "Didn't receive code? Resend"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Sign in link */}
            <div className="text-center pt-6 border-t border-gray-200 mt-6">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/auth/login" prefetch={true} className="text-blue-600 hover:text-blue-700 font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Blue Graph Sheet with ScorePAL Details */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-12 flex-col justify-between relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          <div className="relative z-10 flex flex-col h-full items-center justify-center">
            {/* Lottie Animation */}
            <div className="flex-1 flex items-center justify-center w-full">
              {animationData ? (
                <div className="w-full max-w-lg">
                  <Lottie
                    animationData={animationData}
                    loop={true}
                    autoplay={true}
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
              ) : (
                <div className="w-full max-w-lg h-96 bg-white/10 rounded-2xl flex items-center justify-center">
                  <div className="text-white/50">Loading...</div>
                </div>
              )}
            </div>

            {/* Concise Information */}
            <div className="text-center mt-6">
              <p className="text-white/80 text-sm">
                Grade intelligently. Analyze comprehensively. Learn continuously.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
