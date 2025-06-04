import { useState, useEffect } from 'react';

interface FreeTrialState {
  attemptsUsed: number;
  maxAttempts: number;
  canUseFreeTrial: boolean;
  isLoggedIn: boolean;
}

interface FreeTrialHook extends FreeTrialState {
  useAttempt: () => boolean;
  resetTrial: () => void;
  setLoggedIn: (status: boolean) => void;
}

const FREE_TRIAL_KEY = 'scorepal_free_trial';
const USER_KEY = 'scorepal_user'; // Use the same key as _app.tsx

export const useFreeTrial = (): FreeTrialHook => {
  const [trialState, setTrialState] = useState<FreeTrialState>({
    attemptsUsed: 0,
    maxAttempts: 2,
    canUseFreeTrial: true,
    isLoggedIn: false,
  });

  // Check authentication status
  const checkAuthStatus = () => {
    const userData = localStorage.getItem(USER_KEY);
    if (userData) {
      try {
        const user = JSON.parse(userData);
        return !!user; // If user data exists, user is logged in
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem(USER_KEY);
        return false;
      }
    }
    return false;
  };

  // Load trial state from localStorage on mount
  useEffect(() => {
    const savedTrial = localStorage.getItem(FREE_TRIAL_KEY);
    const isUserLoggedIn = checkAuthStatus();
    
    if (savedTrial) {
      try {
        const parsedTrial = JSON.parse(savedTrial);
        setTrialState(prev => ({
          ...prev,
          attemptsUsed: parsedTrial.attemptsUsed || 0,
          canUseFreeTrial: (parsedTrial.attemptsUsed || 0) < 2,
          isLoggedIn: isUserLoggedIn,
        }));
      } catch (error) {
        console.error('Error loading trial state:', error);
        setTrialState(prev => ({
          ...prev,
          isLoggedIn: isUserLoggedIn,
        }));
      }
    } else {
      setTrialState(prev => ({
        ...prev,
        isLoggedIn: isUserLoggedIn,
      }));
    }

    // Listen for storage changes to sync across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === USER_KEY) {
        const newAuthStatus = checkAuthStatus();
        setTrialState(prev => ({
          ...prev,
          isLoggedIn: newAuthStatus,
        }));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const useAttempt = (): boolean => {
    // Always check current auth status
    const currentAuthStatus = checkAuthStatus();
    
    // If logged in, always allow usage
    if (currentAuthStatus) {
      setTrialState(prev => ({ ...prev, isLoggedIn: true }));
      return true;
    }

    // Check if free trial attempts are available
    if (trialState.attemptsUsed >= trialState.maxAttempts) {
      return false;
    }

    // Use an attempt
    const newAttemptsUsed = trialState.attemptsUsed + 1;
    const newTrialState = {
      ...trialState,
      attemptsUsed: newAttemptsUsed,
      canUseFreeTrial: newAttemptsUsed < trialState.maxAttempts,
      isLoggedIn: currentAuthStatus,
    };

    setTrialState(newTrialState);

    // Save to localStorage
    localStorage.setItem(FREE_TRIAL_KEY, JSON.stringify({
      attemptsUsed: newAttemptsUsed,
      lastUsed: new Date().toISOString(),
    }));

    return true;
  };

  const resetTrial = (): void => {
    const currentAuthStatus = checkAuthStatus();
    const newTrialState = {
      ...trialState,
      attemptsUsed: 0,
      canUseFreeTrial: true,
      isLoggedIn: currentAuthStatus,
    };

    setTrialState(newTrialState);
    localStorage.removeItem(FREE_TRIAL_KEY);
  };

  const setLoggedIn = (status: boolean): void => {
    setTrialState(prev => ({
      ...prev,
      isLoggedIn: status,
    }));

    if (!status) {
      // If logging out, remove the user data
      localStorage.removeItem(USER_KEY);
    }
    // Note: We don't set the user data here since that's handled by the main auth system
  };

  return {
    ...trialState,
    useAttempt,
    resetTrial,
    setLoggedIn,
  };
}; 