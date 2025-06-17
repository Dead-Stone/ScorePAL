import axios from 'axios';
import { normalizeCanvasUrl } from '../../../utils/canvas';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // canvas_url is no longer sent from client, api_key is the main concern
    const { /*canvas_url: rawUrl,*/ api_key } = req.body; // rawUrl commented out

    // if (!rawUrl || !api_key) { // rawUrl check removed
    if (!api_key) {
      return res.status(400).json({ 
        status: 'error',
        message: 'API key is required' // Message updated
      });
    }
    
    // canvas_url is hardcoded in backend, normalization here is for consistency if ever needed
    // const canvas_url = normalizeCanvasUrl(rawUrl); // rawUrl not available

    // Create form data for the backend request
    const formData = new URLSearchParams();
    // formData.append('canvas_url', canvas_url); // canvas_url not appended
    formData.append('api_key', api_key);

    // Forward request to backend - use the /api/canvas/initialize endpoint
    const response = await axios.post(
      `${process.env.BACKEND_URL || 'https://34-13-75-235.nip.io'}/api/canvas/initialize`,
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Error connecting to Canvas:', error);
    
    return res.status(error.response?.status || 500).json({
      status: 'error',
      message: error.response?.data?.detail || error.message || 'Error connecting to Canvas',
    });
  }
} 