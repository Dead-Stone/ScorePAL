import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { api_key, course_id } = req.body;

    if (!api_key || !course_id) {
      return res.status(400).json({ 
        status: 'error',
        message: 'API key and course ID are required' 
      });
    }

    // Forward request to backend
    const response = await axios.post(
      `${process.env.BACKEND_URL || 'https://34-13-75-235.nip.io'}/api/canvas/get-assignments`,
      {
        api_key: api_key,
        course_id: parseInt(course_id)
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    
    return res.status(error.response?.status || 500).json({
      status: 'error',
      message: error.response?.data?.detail || error.message || 'Error fetching assignments',
    });
  }
} 