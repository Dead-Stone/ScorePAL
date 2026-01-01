import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Calling backend debug-sync-jobs endpoint...');
    
    const response = await axios.post('http://localhost:8000/api/canvas/debug-sync-jobs', {}, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Debug sync jobs response:', response.data);
    
    return res.status(200).json(response.data);
  } catch (error) {
    console.error('Error calling debug-sync-jobs:', error);
    
    if (error.response) {
      return res.status(error.response.status).json({
        error: 'Backend error',
        details: error.response.data,
        status: error.response.status
      });
    } else if (error.request) {
      return res.status(500).json({
        error: 'No response from backend',
        details: 'Backend server may be down'
      });
    } else {
      return res.status(500).json({
        error: 'Request setup error',
        details: error.message
      });
    }
  }
} 