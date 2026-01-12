/**
 * ScorePAL - Student Dashboard (Alias Route)
 * Redirects to the main student dashboard at /student
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 */

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { CircularProgress, Box, Container } from '@mui/material';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { TopNavBar } from '@/components/layout/TopNavBar';

export default function DashboardStudent() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the actual student dashboard
    router.replace('/student');
  }, [router]);

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <TopNavBar />
        <Container maxWidth="xl" sx={{ py: 6, pt: { xs: 12, sm: 12 } }}>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <CircularProgress />
          </Box>
        </Container>
      </div>
    </ProtectedRoute>
  );
}

