/**
 * Utility functions for Canvas LMS integration
 */

/**
 * Normalize Canvas URL to ensure it's in the correct format
 * Removes trailing slashes and /api endpoint paths if present
 * 
 * @param {string} url - Canvas URL to normalize
 * @returns {string} - Normalized URL
 */
export function normalizeCanvasUrl(url) {
  if (!url) return url;
  
  // Remove trailing slashes
  url = url.trim().replace(/\/+$/, '');
  
  // Remove /api at the end if present
  if (url.endsWith('/api')) {
    url = url.slice(0, -4);
  }
  
  // Remove /api/v1 if present
  if (url.endsWith('/api/v1')) {
    url = url.slice(0, -7);
  }
  
  // Handle URLs that contain /api/ in the middle
  if (url.includes('/api/')) {
    url = url.split('/api/')[0];
  }
  
  return url;
} 