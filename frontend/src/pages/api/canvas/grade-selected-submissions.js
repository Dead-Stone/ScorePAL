import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Extract required fields from request body
    const { sync_job_id, selected_user_ids, rubric_id = null, strictness = 0.5 } = req.body;

    if (!sync_job_id || !selected_user_ids || !Array.isArray(selected_user_ids) || selected_user_ids.length === 0) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Sync job ID and selected user IDs are required' 
      });
    }

    // Forward request to backend with extended timeout for grading operations
    const response = await axios.post(
      `${process.env.BACKEND_URL || 'https://34-13-75-235.nip.io'}/api/canvas/grade-selected-submissions`,
      {
        sync_job_id: sync_job_id,
        selected_user_ids: selected_user_ids,
        rubric_id: rubric_id,
        strictness: parseFloat(strictness)
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 900000, // 15 minutes timeout for grading operations
      }
    );

    return res.status(200).json(response.data);
  } catch (error) {
    console.error('Error grading Canvas submissions:', error);
    
    // Handle timeout errors specifically
    if (error.code === 'ECONNABORTED') {
      return res.status(408).json({
        status: 'timeout',
        message: 'The grading operation is taking longer than expected. This is normal for large assignments with many students. Please check back in a few minutes - your grading may complete in the background.',
      });
    }
    
    return res.status(error.response?.status || 500).json({
      status: 'error',
      message: error.response?.data?.detail || error.response?.data?.message || error.message || 'Error grading Canvas submissions',
    });
  }
} 