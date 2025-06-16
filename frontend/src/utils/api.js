// API Configuration for ScorePAL Frontend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://35.224.196.67:8000';

export const api = {
  baseURL: API_BASE_URL,

  // Helper function to make API calls
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      console.log(`API Request: ${config.method || 'GET'} ${url}`);
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('API Response:', data);
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // GET request
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  // POST request with JSON data
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // POST request with FormData (for file uploads)
  async postFile(endpoint, formData) {
    return this.request(endpoint, {
      method: 'POST',
      headers: {}, // Don't set Content-Type for FormData
      body: formData,
    });
  },

  // PUT request
  async put(endpoint, data) {
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
  
  // Canvas integration
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