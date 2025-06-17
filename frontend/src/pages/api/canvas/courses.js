import axios from 'axios';
import { normalizeCanvasUrl } from '../../../utils/canvas';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Get Canvas URL and API key from query parameters
    let { canvas_url, api_key } = req.query;

    if (!canvas_url || !api_key) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Canvas URL and API key are required' 
      });
    }
    
    // Normalize the Canvas URL
    canvas_url = normalizeCanvasUrl(canvas_url);

    // Forward request to backend with query parameters
    // Use the /api/canvas/courses endpoint that works with the session-based canvas_service_global
    const response = await axios.get(
      `${process.env.BACKEND_URL || 'https://34-13-75-235.nip.io'}/api/canvas/courses`,
      {
        // No need to pass canvas_url and api_key here as they're already stored in the session
      }
    );

    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Error fetching Canvas courses:', error);
    
    return res.status(error.response?.status || 500).json({
      status: 'error',
      message: error.response?.data?.detail || 'Error fetching Canvas courses',
    });
  }
} 