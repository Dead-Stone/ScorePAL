import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Forward request to backend using session-based authentication
    // No need to pass canvas_url and api_key since they're stored after initialization
    const response = await axios.get(
      `${process.env.BACKEND_URL || 'http://localhost:8000'}/api/canvas/courses`
    );

    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Error fetching Canvas courses:', error);
    
    return res.status(error.response?.status || 500).json({
      status: 'error',
      message: error.response?.data?.detail || error.response?.data?.message || 'Error fetching Canvas courses',
    });
  }
} 