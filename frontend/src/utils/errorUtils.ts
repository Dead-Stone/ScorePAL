/**
 * Error utility functions for safely extracting error messages from API responses
 * Prevents React errors from trying to render objects as children
 */

export function extractErrorMessage(error: any, defaultMessage: string = 'An error occurred'): string {
  if (!error) return defaultMessage;
  
  // Check for response data
  if (error.response?.data) {
    const data = error.response.data;
    
    // Check for message field first
    if (data.message && typeof data.message === 'string') {
      return data.message;
    }
    
    // Check for detail field
    if (data.detail) {
      const detail = data.detail;
      
      // If it's a string, return it
      if (typeof detail === 'string') {
        return detail;
      }
      
      // If it's an array (Pydantic validation errors)
      if (Array.isArray(detail)) {
        return detail
          .map((item: any) => {
            if (typeof item === 'string') return item;
            if (item && typeof item === 'object') {
              return item.msg || item.message || JSON.stringify(item);
            }
            return String(item);
          })
          .join(', ');
      }
      
      // If it's an object
      if (detail && typeof detail === 'object') {
        return detail.msg || detail.message || JSON.stringify(detail);
      }
      
      // Fallback to string conversion
      return String(detail);
    }
  }
  
  // Check for direct message property
  if (error.message && typeof error.message === 'string') {
    return error.message;
  }
  
  // Final fallback
  return defaultMessage;
}

