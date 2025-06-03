import axios from 'axios';
import { normalizeCanvasUrl } from '../../../../../utils/canvas';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Get Canvas URL, API key, and course ID
    let { canvas_url, api_key } = req.query;
    const courseId = req.query.courseId;

    if (!courseId) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Course ID is required' 
      });
    }
    
    // Normalize the Canvas URL if provided (but not needed for /api/canvas routes)
    if (canvas_url) {
      canvas_url = normalizeCanvasUrl(canvas_url);
    }

    // Forward request to backend - use the session-based /api/canvas endpoint
    const response = await axios.get(
      `${process.env.BACKEND_URL || 'http://localhost:8000'}/api/canvas/courses/${courseId}/assignments`
    );

    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Error fetching Canvas assignments:', error);
    
    return res.status(error.response?.status || 500).json({
      status: 'error',
      message: error.response?.data?.detail || 'Error fetching Canvas assignments',
    });
  }
} 