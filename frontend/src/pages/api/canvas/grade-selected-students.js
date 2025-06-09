import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { api_key, course_id, assignment_id } = req.body;

    if (!api_key || !course_id || !assignment_id) {
      return res.status(400).json({ 
        status: 'error',
        message: 'API key, course ID, and assignment ID are required' 
      });
    }

    // Forward request to backend
    const response = await axios.post(
      `${process.env.BACKEND_URL || 'http://localhost:8000'}/api/canvas/grade-selected-students-with-urls`,
      {
        api_key: api_key,
        course_id: parseInt(course_id),
        assignment_id: parseInt(assignment_id)
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 300000, // 5 minutes timeout for grading
      }
    );

    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Error grading selected students:', error);
    
    return res.status(error.response?.status || 500).json({
      status: 'error',
      message: error.response?.data?.detail || error.message || 'Error grading selected students',
    });
  }
} 