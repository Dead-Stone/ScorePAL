import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { api_key } = req.body;

    if (!api_key) {
      return res.status(400).json({ 
        status: 'error',
        message: 'API key is required' 
      });
    }

    // Forward request to backend
    const response = await axios.post(
      `${process.env.BACKEND_URL || 'http://localhost:8000'}/api/canvas/get-ta-courses`,
      {
        api_key: api_key
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Error fetching TA courses:', error);
    
    return res.status(error.response?.status || 500).json({
      status: 'error',
      message: error.response?.data?.detail || error.message || 'Error fetching TA courses',
    });
  }
} 