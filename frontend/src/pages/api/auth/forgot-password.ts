import { NextApiRequest, NextApiResponse } from 'next';

interface ForgotPasswordRequest {
  email: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email }: ForgotPasswordRequest = req.body;

    // Validate request data
    if (!email) {
      return res.status(400).json({ 
        message: 'Email is required' 
      });
    }

    if (!email.includes('@')) {
      return res.status(400).json({ 
        message: 'Please enter a valid email address' 
      });
    }

    // Get backend URL from environment variables
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    // Call backend forgot password endpoint
    const response = await fetch(`${backendUrl}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ 
        message: errorData.detail || 'Failed to send reset email' 
      });
    }

    const result = await response.json();

    // Return success message
    res.status(200).json({
      message: result.message || 'If the email exists, a reset link has been sent'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      message: 'Internal server error' 
    });
  }
} 