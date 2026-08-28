/**
 * Enhanced Data Fetching Utilities
 * Implements stale-while-revalidate with localStorage persistence
 * Provides request deduplication and optimistic UI support
 */

import apiClient from './apiClient';

// Storage keys
const STORAGE_PREFIX = 'scorepal_cache_';
const STORAGE_TIMESTAMP_PREFIX = 'scorepal_timestamp_';

// Cache TTL in milliseconds
const CACHE_TTL = {
  rubrics: 300000, // 5 minutes
  default: 60000, // 1 minute
};

// Request deduplication map
const pendingRequests = new Map<string, Promise<any>>();

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Get cached data from localStorage
 */
function getCachedData<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    const timestamp = localStorage.getItem(`${STORAGE_TIMESTAMP_PREFIX}${key}`);
    
    if (!cached || !timestamp) return null;
    
    const age = Date.now() - parseInt(timestamp, 10);
    const ttl = CACHE_TTL[key as keyof typeof CACHE_TTL] || CACHE_TTL.default;
    
    if (age > ttl) {
      // Cache expired, remove it
      localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
      localStorage.removeItem(`${STORAGE_TIMESTAMP_PREFIX}${key}`);
      return null;
    }
    
    return JSON.parse(cached) as T;
  } catch (error) {
    return null;
  }
}

/**
 * Set cached data in localStorage
 */
function setCachedData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(data));
    localStorage.setItem(`${STORAGE_TIMESTAMP_PREFIX}${key}`, Date.now().toString());
  } catch (error) {
    // Storage might be full, silently fail
  }
}

/**
 * Fetch with stale-while-revalidate pattern
 * Returns cached data immediately if available, then refreshes in background
 */
export async function fetchWithSWR<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    useCache?: boolean;
    ttl?: number;
  } = {}
): Promise<T> {
  const { useCache = true, ttl } = options;
  
  // Check for pending request to deduplicate
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!;
  }
  
  // Get cached data immediately
  let cachedData: T | null = null;
  if (useCache) {
    cachedData = getCachedData<T>(key);
  }
  
  // Create fetch promise
  const fetchPromise = (async () => {
    try {
      const data = await fetcher();
      
      // Update cache
      if (useCache) {
        setCachedData(key, data);
      }
      
      return data;
    } catch (error) {
      // If we have cached data, return it even on error
      if (cachedData) {
        return cachedData;
      }
      throw error;
    } finally {
      // Remove from pending requests
      pendingRequests.delete(key);
    }
  })();
  
  // Store pending request
  pendingRequests.set(key, fetchPromise);
  
  // Return cached data immediately if available, otherwise wait for fetch
  if (cachedData) {
    // Return cached data immediately, but don't await the refresh
    fetchPromise.catch(() => {
      // Silently handle background refresh errors
    });
    return cachedData;
  }
  
  return fetchPromise;
}

/**
 * Prefetch data in background
 */
export async function prefetchData<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<void> {
  try {
    const data = await fetcher();
    setCachedData(key, data);
  } catch (error) {
    // Silently fail for prefetch
  }
}

/**
 * Clear cached data
 */
export function clearCache(key?: string): void {
  if (key) {
    localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
    localStorage.removeItem(`${STORAGE_TIMESTAMP_PREFIX}${key}`);
  } else {
    // Clear all cache
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith(STORAGE_PREFIX) || k.startsWith(STORAGE_TIMESTAMP_PREFIX)) {
        localStorage.removeItem(k);
      }
    });
  }
}

/**
 * Get cached data synchronously (for immediate UI rendering)
 */
export function getCachedDataSync<T>(key: string): T | null {
  return getCachedData<T>(key);
}
