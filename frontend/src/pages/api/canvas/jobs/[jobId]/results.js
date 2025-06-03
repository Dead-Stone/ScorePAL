import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Get job ID from the URL
    const { jobId } = req.query;

    if (!jobId) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Job ID is required' 
      });
    }

    // Forward request to backend
    const response = await axios.get(
      `${process.env.BACKEND_URL || 'http://localhost:8000'}/canvas/jobs/${jobId}/results`
    );

    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Error fetching Canvas job results:', error);
    
    return res.status(error.response?.status || 500).json({
      status: 'error',
      message: error.response?.data?.detail || 'Error fetching Canvas job results',
    });
  }
} 