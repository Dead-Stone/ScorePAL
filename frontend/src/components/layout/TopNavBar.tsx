/**
 * TopNavBar - Unified top navigation bar for all pages
 * Consistent design across landing, auth, and authenticated pages
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  LayoutDashboard,
  FileText,
  Settings,
  User,
  LogOut,
  HelpCircle,
  Menu,
  X,
  Bell,
  Search,
  ChevronDown,
  BarChart3,
  List,
  BookOpen,
  Github,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopNavBarProps {
  className?: string;
}

export function TopNavBar({ className }: TopNavBarProps) {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Main navigation items (always visible when logged in)
  const mainNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Grade', href: '/grade', icon: FileText },
  ];

  // Additional navigation items (in dropdown)
  const additionalNavigation = [
    { name: 'Results', href: '/results', icon: BarChart3 },
    { name: 'Rubrics', href: '/rubrics', icon: BookOpen },
    { name: 'Students', href: '/student', icon: User },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  // Landing page navigation (when logged out)
  const landingNavigation = [
    { name: 'Features', href: '#features', isAnchor: true },
    { name: 'How It Works', href: '#how-it-works', isAnchor: true },
    { name: 'Demo', href: '/demo', isAnchor: false },
  ];

  const isActive = (path: string) => {
    if (path.startsWith('#')) return false;
    return router.pathname === path || router.pathname.startsWith(path + '/');
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  const handleAnchorClick = (href: string) => {
    if (href.startsWith('#')) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-[9999] w-full border-b bg-white/95 backdrop-blur-lg supports-[backdrop-filter]:bg-white/60 shadow-sm",
      className
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link 
              href={isAuthenticated ? "/dashboard" : "/"} 
              prefetch={true} 
              className="flex items-center hover:opacity-80 transition-opacity"
            >
              <img
                src="/scorePAL-logo-2.svg"
                alt="ScorePAL"
                width={isAuthenticated ? 56 : 96}
                height={isAuthenticated ? 56 : 96}
                className="flex-shrink-0"
                style={{ 
                  width: isAuthenticated ? '56px' : '96px', 
                  height: isAuthenticated ? '56px' : '96px', 
                  objectFit: 'contain',
                  display: 'block'
                }}
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {isAuthenticated ? (
              <>
                {/* Main Navigation Items */}
                {mainNavigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.name} href={item.href} prefetch={true}>
                      <Button
                        variant={isActive(item.href) ? "default" : "ghost"}
                        className={cn(
                          "flex items-center space-x-2 font-medium text-sm",
                          isActive(item.href) && "bg-blue-600 text-white hover:bg-blue-700"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </Button>
                    </Link>
                  );
                })}

                {/* More Menu Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "flex items-center space-x-1 font-medium text-sm",
                        (router.pathname.startsWith('/results') || 
                         router.pathname.startsWith('/rubrics') || 
                         router.pathname.startsWith('/student') ||
                         router.pathname.startsWith('/settings')) && "bg-blue-50 text-blue-600"
                      )}
                    >
                      <span>More</span>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56 z-[10000]">
                    {additionalNavigation.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link key={item.name} href={item.href} prefetch={true}>
                          <DropdownMenuItem className={cn(
                            isActive(item.href) && "bg-blue-50 text-blue-600"
                          )}>
                            <Icon className="w-4 h-4 mr-2" />
                            {item.name}
                          </DropdownMenuItem>
                        </Link>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                {/* Landing Page Navigation */}
                {landingNavigation.map((item) => {
                  if (item.isAnchor) {
                    return (
                      <a
                        key={item.name}
                        href={item.href}
                        onClick={(e) => {
                          e.preventDefault();
                          handleAnchorClick(item.href);
                        }}
                        className="text-gray-700 hover:text-blue-600 transition-colors font-medium text-sm"
                      >
                        {item.name}
                      </a>
                    );
                  }
                  return (
                    <Link key={item.name} href={item.href} prefetch={true}>
                      <span className="text-gray-700 hover:text-blue-600 transition-colors font-medium text-sm cursor-pointer">
                        {item.name}
                      </span>
                    </Link>
                  );
                })}
                <a
                  href="https://github.com/Dead-Stone/ScorePAL"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-700 hover:text-blue-600 transition-colors font-medium text-sm flex items-center space-x-1"
                >
                  <Github className="w-4 h-4" />
                  <span>GitHub</span>
                </a>
                <Link href="/auth/login" prefetch={true}>
                  <Button variant="outline" className="font-medium text-sm border border-gray-300 text-gray-700 hover:bg-gray-50">
                    Login
                  </Button>
                </Link>
                <Link href="/auth/register" prefetch={true}>
                  <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md text-sm">
                    Get Started
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Right side - Search, Notifications, User Menu */}
          <div className="flex items-center space-x-4">
            {/* Search (Desktop only) - Only show when logged in */}
            {isAuthenticated && (
              <div className="hidden lg:block">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                  />
                </div>
              </div>
            )}

            {/* Notifications - Only show when logged in */}
            {isAuthenticated && (
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </Button>
            )}

            {/* User Menu - Only show when logged in */}
            {isAuthenticated && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 h-10 px-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white text-sm font-semibold">
                      {user?.first_name?.[0] || user?.email?.[0] || 'U'}
                    </div>
                    <div className="hidden md:block text-left">
                      <div className="text-sm font-medium text-gray-900">
                        {user?.first_name && user?.last_name
                          ? `${user.first_name} ${user.last_name}`
                          : user?.email?.split('@')[0] || 'User'}
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        {user?.role || 'User'}
                      </div>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 z-[10000]">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">
                        {user?.first_name && user?.last_name
                          ? `${user.first_name} ${user.last_name}`
                          : user?.email || 'User'}
                      </p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link href="/profile" prefetch={true}>
                    <DropdownMenuItem>
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/help" prefetch={true}>
                    <DropdownMenuItem>
                      <HelpCircle className="w-4 h-4 mr-2" />
                      Help
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-white">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {isAuthenticated ? (
              <>
                {mainNavigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.name} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                      <div
                        className={cn(
                          "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                          isActive(item.href)
                            ? "bg-blue-600 text-white"
                            : "text-gray-700 hover:bg-gray-100"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </div>
                    </Link>
                  );
                })}
                {additionalNavigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.name} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                      <div
                        className={cn(
                          "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                          isActive(item.href)
                            ? "bg-blue-600 text-white"
                            : "text-gray-700 hover:bg-gray-100"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </div>
                    </Link>
                  );
                })}
              </>
            ) : (
              <>
                {landingNavigation.map((item) => {
                  if (item.isAnchor) {
                    return (
                      <a
                        key={item.name}
                        href={item.href}
                        onClick={(e) => {
                          e.preventDefault();
                          handleAnchorClick(item.href);
                          setMobileMenuOpen(false);
                        }}
                        className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                      >
                        <span>{item.name}</span>
                      </a>
                    );
                  }
                  return (
                    <Link key={item.name} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                      <div className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100">
                        <span>{item.name}</span>
                      </div>
                    </Link>
                  );
                })}
                <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)}>
                  <div className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100">
                    <span>Login</span>
                  </div>
                </Link>
                <Link href="/auth/register" onClick={() => setMobileMenuOpen(false)}>
                  <div className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700">
                    <span>Get Started</span>
                  </div>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
