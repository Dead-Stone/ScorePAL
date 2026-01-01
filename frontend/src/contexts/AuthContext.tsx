/**
 * Authentication Context for ScorePAL
 * Manages user authentication state and session
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { API_ENDPOINTS, API_BASE_URL } from '../config/api';

interface User {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  role: 'teacher' | 'admin' | 'student' | 'grader';
  institution?: string;
  department?: string;
  bio?: string;
  profile_picture?: string;
  grading_count: number;
  free_gradings_used: number;
  premium_active: boolean;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  last_login?: string;
}

interface UserStats {
  total_gradings: number;
  free_gradings_remaining: number;
  premium_active: boolean;
  role: string;
  member_since: string;
}

interface AuthContextType {
  user: User | null;
  userStats: UserStats | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<boolean>;
  checkGradingPermission: () => Promise<{can_grade: boolean; free_gradings_remaining: number; premium_active: boolean; reason: string}>;
  incrementGradingCount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check if user is authenticated on mount - non-blocking
  useEffect(() => {
    // Don't block initial render - check auth in background
    const checkAuth = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Using centralized API config - change in /src/config/api.js for all endpoints
        // Create abort controller for timeout (compatible with all browsers)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
      const response = await fetch(API_ENDPOINTS.AUTH.ME, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
          signal: controller.signal,
      });
        
        clearTimeout(timeoutId);

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
          // Fetch stats in background, don't wait
          fetchUserStats(token).catch(() => {
            // Silently fail - stats are not critical for initial render
          });
      } else {
          // Token is invalid or expired, clear auth state
        localStorage.removeItem('access_token');
          setUser(null);
          setUserStats(null);
      }
    } catch (error) {
        // Network error or timeout - clear auth state
        if (error instanceof Error && error.name !== 'AbortError') {
      console.error('Auth check failed:', error);
        }
      localStorage.removeItem('access_token');
        setUser(null);
        setUserStats(null);
    } finally {
      setIsLoading(false);
    }
  };

    // Use requestIdleCallback if available for non-blocking check
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      try {
        (window as any).requestIdleCallback(checkAuth, { timeout: 2000 });
      } catch (e) {
        // Fallback if requestIdleCallback fails
        setTimeout(checkAuth, 0);
      }
    } else {
      // Fallback to setTimeout for immediate but non-blocking execution
      setTimeout(checkAuth, 0);
    }
  }, []);

  const fetchUserStats = async (token?: string) => {
    try {
      const authToken = token || localStorage.getItem('access_token');
      if (!authToken) return;

      // Using centralized API config - change in /src/config/api.js for all endpoints
      // const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me/stats`, {
      const response = await fetch(`${API_ENDPOINTS.AUTH.ME}/stats`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const stats = await response.json();
        setUserStats(stats);
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    }
  };

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setUser(null);
        setUserStats(null);
        setIsLoading(false);
        return;
      }

      // Create abort controller for timeout (compatible with all browsers)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(API_ENDPOINTS.AUTH.ME, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        await fetchUserStats(token);
      } else {
        localStorage.removeItem('access_token');
        setUser(null);
        setUserStats(null);
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Auth check failed:', error);
      }
      localStorage.removeItem('access_token');
      setUser(null);
      setUserStats(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        if (!result.access_token) {
          throw new Error('No access token received from server');
        }
        
        localStorage.setItem('access_token', result.access_token);
        
        // Update last login
        try {
        await fetch(`${API_ENDPOINTS.AUTH.ME}/update-login`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${result.access_token}`,
          },
        });
        } catch (updateError) {
          // Non-critical error, continue with login
        }

        // Fetch user data
        await checkAuthStatus();
        return true;
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Invalid email or password');
      }
    } catch (error: any) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Get token before removing it (for optional API call)
      const token = localStorage.getItem('access_token');
      
      // Optionally call logout endpoint (for server-side session cleanup if needed)
      // This is optional for JWT tokens but good practice
      if (token) {
        try {
          await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }).catch(() => {
            // Ignore errors - logout should succeed even if API call fails
          });
        } catch (error) {
          // Ignore logout API errors - continue with local logout
        }
      }
      
      // Clear all auth-related data
      localStorage.removeItem('access_token');
      
      // Reset state immediately
      setUser(null);
      setUserStats(null);
      setIsLoading(false);
      
      // Navigate to landing page only if not already there
      const currentPath = router.pathname;
      if (currentPath !== '/' && currentPath !== '/landing' && currentPath !== '/auth/login') {
        router.push('/').catch(() => {
          // Fallback if router push fails
          window.location.href = '/';
        });
      } else {
        // If already on landing/login, just reload to clear any cached state
        router.reload();
      }
    } catch (error) {
      // Ensure logout completes even if there's an error
    localStorage.removeItem('access_token');
    setUser(null);
    setUserStats(null);
      setIsLoading(false);
      
      // Force navigation as fallback
      window.location.href = '/';
    }
  };

  const refreshUser = async () => {
    await checkAuthStatus();
  };

  const updateProfile = async (data: Partial<User>): Promise<boolean> => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return false;

      // Using centralized API config - change in /src/config/api.js for all endpoints
      // const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me/profile`, {
      const response = await fetch(`${API_ENDPOINTS.AUTH.ME}/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await refreshUser();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Profile update failed:', error);
      return false;
    }
  };

  const checkGradingPermission = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) throw new Error('Not authenticated');

      // Using centralized API config - change in /src/config/api.js for all endpoints
      // const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me/can-grade`, {
      const response = await fetch(`${API_ENDPOINTS.AUTH.ME}/can-grade`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        return await response.json();
      }
      throw new Error('Failed to check grading permission');
    } catch (error) {
      console.error('Failed to check grading permission:', error);
      return {
        can_grade: false,
        free_gradings_remaining: 0,
        premium_active: false,
        reason: 'Error checking permission'
      };
    }
  };

  const incrementGradingCount = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      // Using centralized API config - change in /src/config/api.js for all endpoints
      // await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me/increment-grading`, {
      await fetch(`${API_ENDPOINTS.AUTH.ME}/increment-grading`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      await refreshUser();
    } catch (error) {
      console.error('Failed to increment grading count:', error);
    }
  };

  const value: AuthContextType = {
    user,
    userStats,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
    updateProfile,
    checkGradingPermission,
    incrementGradingCount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 