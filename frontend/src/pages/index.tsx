/**
 * ScorePAL - Index Page Redirect
 * Redirects to the new landing page
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 * @repository https://github.com/Dead-Stone/ScorePAL
 */

import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function IndexPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new landing page
    router.replace('/landing');
  }, [router]);

  // Show a simple loading state while redirecting
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading ScorePAL...</p>
      </div>
    </div>
  );
} 