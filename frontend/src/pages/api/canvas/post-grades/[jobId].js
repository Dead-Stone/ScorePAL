import axios from 'axios';
import formidable from 'formidable';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Get job ID from the URL
    const { jobId } = req.query;

    if (!jobId) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Job ID is required' 
      });
    }

    // Parse form data
    const form = new formidable.IncomingForm();
    const { fields } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve({ fields, files });
      });
    });

    // Get Canvas URL and API key from form data
    const canvas_url = fields.canvas_url;
    const api_key = fields.api_key;

    if (!canvas_url || !api_key) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Canvas URL and API key are required' 
      });
    }

    // Create form data for the backend request
    const formData = new URLSearchParams();
    formData.append('canvas_url', canvas_url);
    formData.append('api_key', api_key);

    // Forward request to backend
    const response = await axios.post(
      `${process.env.BACKEND_URL || 'https://34-13-75-235.nip.io'}/canvas/post-grades/${jobId}`,
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Error posting grades to Canvas:', error);
    
    return res.status(error.response?.status || 500).json({
      status: 'error',
      message: error.response?.data?.detail || 'Error posting grades to Canvas',
    });
  }
} 