import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Extract API key, course ID, and assignment ID from request body
    const { api_key, course_id, assignment_id } = req.body;

    if (!api_key || !course_id || !assignment_id) {
      return res.status(400).json({ 
        status: 'error',
        message: 'API key, course ID, and assignment ID are required' 
      });
    }
    
    // Format bearer token if needed
    let processedApiKey = api_key;
    if (!processedApiKey.startsWith('Bearer ') && processedApiKey.length > 30) {
      processedApiKey = `Bearer ${processedApiKey}`;
    }

    // Forward request to backend
    const response = await axios.post(
      `${process.env.BACKEND_URL || 'https://34-13-75-235.nip.io'}/api/canvas/get-submissions`,
      {
        api_key: processedApiKey,
        course_id: course_id,
        assignment_id: assignment_id
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return res.status(200).json({
      status: 'success',
      submissions: response.data.submissions || []
    });
  } catch (error) {
    console.error('Error fetching Canvas submissions:', error);
    
    return res.status(error.response?.status || 500).json({
      status: 'error',
      message: error.response?.data?.message || error.message || 'Error fetching Canvas submissions',
    });
  }
} 