/**
 * PageLayout - Modern page wrapper component
 * Provides consistent layout structure for all authenticated pages
 */

import React from 'react';
import { TopNavBar } from './TopNavBar';
import { cn } from '@/lib/utils';

interface PageLayoutProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  className?: string;
  noPadding?: boolean;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  maxWidth = 'xl',
  className = '',
  noPadding = false,
}) => {
  const maxWidthClasses = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-5xl',
    xl: 'max-w-7xl',
    '2xl': 'max-w-[1400px]',
    full: 'max-w-full',
  };

  return (
    <div className={cn("min-h-screen page-gradient", className)}>
      <TopNavBar />
      <main className={cn(
        maxWidthClasses[maxWidth],
        "mx-auto",
        noPadding ? "" : "px-4 sm:px-6 lg:px-8 pt-24 pb-12"
      )}>
        <div className="animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
};
