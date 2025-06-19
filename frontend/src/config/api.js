// API Configuration - Single source of truth for all API endpoints
// Change this file to switch between development and production

// Development configuration
const API_CONFIG = {
  BASE_URL: 'http://localhost:8000',
  // For production, change to your production URL:
  // BASE_URL: 'https://your-production-domain.com',
  // Or use environment variable (when env issues are resolved):
  // BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
};

// Export the base URL
export const API_BASE_URL = API_CONFIG.BASE_URL;

// Export common API endpoints
export const API_ENDPOINTS = {
  // Authentication endpoints - FastAPI Users JWT
  AUTH: {
    REGISTER: `${API_CONFIG.BASE_URL}/auth/register`,
    LOGIN: `${API_CONFIG.BASE_URL}/auth/jwt/login`,        // FastAPI Users JWT login
    LOGOUT: `${API_CONFIG.BASE_URL}/auth/jwt/logout`,      // FastAPI Users JWT logout
    ME: `${API_CONFIG.BASE_URL}/auth/me`,
    REFRESH: `${API_CONFIG.BASE_URL}/auth/refresh`,
    RESET_PASSWORD: `${API_CONFIG.BASE_URL}/auth/reset-password`,
    CHANGE_PASSWORD: `${API_CONFIG.BASE_URL}/auth/change-password`,
  },
  
  // Canvas API endpoints
  CANVAS: {
    COURSES: `${API_CONFIG.BASE_URL}/api/canvas/courses`,
    ASSIGNMENTS: `${API_CONFIG.BASE_URL}/api/canvas/assignments`,
    SUBMISSIONS: `${API_CONFIG.BASE_URL}/api/canvas/submissions`,
    GRADES: `${API_CONFIG.BASE_URL}/api/canvas/grades`,
  },
  
  // Core API endpoints
  API: {
    UPLOAD: `${API_CONFIG.BASE_URL}/api/upload`,
    GRADE: `${API_CONFIG.BASE_URL}/api/grade`,
    ANALYTICS: `${API_CONFIG.BASE_URL}/api/analytics`,
    KNOWLEDGE_GRAPH: `${API_CONFIG.BASE_URL}/api/knowledge-graph`,
    RESULTS: `${API_CONFIG.BASE_URL}/api/results`,
    RUBRIC: `${API_CONFIG.BASE_URL}/api/rubric`,
    STATUS: `${API_CONFIG.BASE_URL}/api/status`,
  }
};

// Default export
export default API_CONFIG; 