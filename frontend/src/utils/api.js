// API Configuration for ScorePAL Frontend - Updated for HTTPS Load Balancer
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://34-13-75-235.nip.io';

// Timeout configurations
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const LONG_OPERATION_TIMEOUT = 300000; // 5 minutes for sync operations
const GRADING_TIMEOUT = 600000; // 10 minutes for grading operations

export const api = {
  baseURL: API_BASE_URL,

  // Helper function to make API calls with timeout
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Determine timeout based on endpoint
    let timeout = DEFAULT_TIMEOUT;
    if (endpoint.includes('/sync') || endpoint.includes('/get-submissions')) {
      timeout = LONG_OPERATION_TIMEOUT;
    } else if (endpoint.includes('/grade') || endpoint.includes('/generate-rubric')) {
      timeout = GRADING_TIMEOUT;
    }
    
    const config = {
      mode: 'cors', // Explicitly set CORS mode
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    config.signal = controller.signal;

    try {
      console.log(`API Request: ${config.method || 'GET'} ${url} (timeout: ${timeout/1000}s)`);
      const response = await fetch(url, config);
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('API Response:', data);
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('API Error:', error);
      
      // Check for timeout errors
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout/1000} seconds. The operation may still be processing in the background.`);
      }
      
      // Check for specific CORS errors
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error('Failed to fetch - This might be a CORS issue or the backend server is not accessible');
      }
      
      throw error;
    }
  },

  // GET request with custom timeout
  async get(endpoint, timeout = null) {
    return this.request(endpoint, { method: 'GET' });
  },

  // POST request with JSON data and custom timeout
  async post(endpoint, data, timeout = null) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // POST request with FormData (for file uploads)
  async postFile(endpoint, formData, timeout = null) {
    return this.request(endpoint, {
      method: 'POST',
      headers: {}, // Don't set Content-Type for FormData
      body: formData,
    });
  },

  // PUT request
  async put(endpoint, data, timeout = null) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // DELETE request
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
};

// Specific API endpoints
export const apiEndpoints = {
  // Health check
  health: () => api.get('/health'),
  
  // Assignments
  getAssignments: () => api.get('/assignments'),
  getAssignment: (id) => api.get(`/assignments/${id}`),
  uploadAssignment: (formData) => api.postFile('/upload-assignment', formData),
  gradeAssignment: (id) => api.post(`/grade-assignment/${id}`, {}),
  getGradingResults: (id) => api.get(`/grading-results/${id}`),
  
  // Single submissions
  uploadSingle: (formData) => api.postFile('/upload-single', formData),
  
  // Canvas integration - these will automatically use longer timeouts
  connectCanvas: (data) => api.post('/canvas/connect', data),
  getCanvasCourses: (params) => api.get(`/canvas/courses?${new URLSearchParams(params)}`),
  getCanvasAssignments: (courseId, params) => api.get(`/canvas/courses/${courseId}/assignments?${new URLSearchParams(params)}`),
  gradeCanvasAssignment: (formData) => api.postFile('/canvas/grade-assignment', formData),
  getCanvasJobStatus: (jobId) => api.get(`/canvas/jobs/${jobId}`),
  getCanvasJobResults: (jobId) => api.get(`/canvas/jobs/${jobId}/results`),
  
  // Files
  getFile: (fileType, assignmentId, filename) => `${API_BASE_URL}/files/${fileType}/${assignmentId}/${filename}`,
};

export default api; 