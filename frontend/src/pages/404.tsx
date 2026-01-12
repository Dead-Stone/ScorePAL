import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Home, ArrowLeft } from 'lucide-react';
import { TopNavBar } from '../components/layout/TopNavBar';

export default function Custom404() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <TopNavBar />
      <div className="h-16"></div>
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="mb-6">
              <h1 className="text-9xl font-bold text-blue-600 mb-4">404</h1>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Page Not Found
              </h2>
              <p className="text-gray-600 mb-8">
                The page you're looking for doesn't exist or has been moved.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => router.back()}
                variant="outline"
                className="flex items-center justify-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
              <Link href="/" prefetch={true}>
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white flex items-center justify-center">
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

