import axios from 'axios';
import { normalizeCanvasUrl } from '../../../utils/canvas';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Get data from request body
    const { 
      canvas_url: rawUrl, 
      api_key, 
      course_id: rawCourseId, 
      assignment_id: rawAssignmentId, 
      strictness: rawStrictness 
    } = req.body;

    // Parse numeric values
    const course_id = parseInt(rawCourseId);
    const assignment_id = parseInt(rawAssignmentId);
    const strictness = parseFloat(rawStrictness || '0.5');

    if (!course_id || !assignment_id) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Course ID and assignment ID are required' 
      });
    }
    
    // Normalize the Canvas URL if provided (but not needed for /api/canvas routes)
    const canvas_url = rawUrl ? normalizeCanvasUrl(rawUrl) : null;

    // Forward request to backend - use the session-based endpoint
    // Note: we don't need to pass canvas_url and api_key anymore since they're in the session
    const response = await axios.post(
      `${process.env.BACKEND_URL || 'http://localhost:8000'}/api/canvas/courses/${course_id}/assignments/${assignment_id}/grade`
    );

    // When successful, store the job in localStorage
    if (response.data.status === 'success' && response.data.job_id) {
      // This would be done client-side in a real implementation
      // Just returning the data here
    }

    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Error starting Canvas grading job:', error);
    
    return res.status(error.response?.status || 500).json({
      status: 'error',
      message: error.response?.data?.detail || error.message || 'Error starting Canvas grading job',
    });
  }
} 