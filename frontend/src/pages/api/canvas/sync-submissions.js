import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Extract required fields from request body
    const { api_key, course_id, assignment_id, force_sync = false } = req.body;

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

    // Forward request to backend with extended timeout for sync operations
    const response = await axios.post(
      `${process.env.BACKEND_URL || 'https://34-13-75-235.nip.io'}/api/canvas/sync-submissions`,
      {
        api_key: processedApiKey,
        course_id: parseInt(course_id),
        assignment_id: parseInt(assignment_id),
        force_sync: force_sync
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 600000, // 10 minutes timeout for sync operations
      }
    );

    return res.status(200).json(response.data);
  } catch (error) {
    console.error('Error syncing Canvas submissions:', error);
    
    // Handle timeout errors specifically
    if (error.code === 'ECONNABORTED') {
      return res.status(408).json({
        status: 'timeout',
        message: 'The sync operation is taking longer than expected. Please try again in a few minutes. Your data may already be syncing in the background.',
      });
    }
    
    return res.status(error.response?.status || 500).json({
      status: 'error',
      message: error.response?.data?.detail || error.response?.data?.message || error.message || 'Error syncing Canvas submissions',
    });
  }
} 