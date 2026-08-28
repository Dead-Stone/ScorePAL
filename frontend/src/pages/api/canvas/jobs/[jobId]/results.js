import axios from 'axios';
import { API_BASE_URL } from '../../../../../config/api';

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

    // Using centralized API config - change in /src/config/api.js for all endpoints
    // const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/canvas/jobs/${jobId}/results`);
    const response = await axios.get(
      `${API_BASE_URL}/canvas/jobs/${jobId}/results`
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