import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { sync_job_id, course_id, assignment_id } = req.body;

    if (!sync_job_id) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Sync job ID is required' 
      });
    }

    // Forward request to backend
    const backendBaseUrl =
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:8010';

    const response = await axios.post(
      `${backendBaseUrl.replace(/\/$/, '')}/api/canvas/get-assignment-analysis`,
      {
        sync_job_id: sync_job_id,
        course_id: course_id,
        assignment_id: assignment_id
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 seconds timeout
      }
    );

    return res.status(200).json(response.data);
  } catch (error) {
    console.error('Error fetching assignment analysis:', error);
    
    return res.status(error.response?.status || 500).json({
      status: 'error',
      message: error.response?.data?.detail || error.response?.data?.message || error.message || 'Error fetching assignment analysis',
    });
  }
} 