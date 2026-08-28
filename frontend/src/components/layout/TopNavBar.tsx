/**
 * TopNavBar - Modern, sleek navigation bar
 * Unified design across all authenticated pages
 */

import React, { useState, useEffect } from 'react';
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
  BookOpen,
  Github,
  ArrowRight,
  ChevronDown,
  Sparkles,
  TrendingUp,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { API_BASE_URL } from '@/config/api';

interface TopNavBarProps {
  className?: string;
}

export function TopNavBar({ className }: TopNavBarProps) {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const mainNavigation = user?.role === 'student'
    ? [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, description: 'Your grades & progress' },
      ]
    : [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, description: 'Analytics overview' },
        { name: 'Grade', href: '/grade', icon: FileText, description: 'Grade submissions' },
        { name: 'Results', href: '/results', icon: ClipboardList, description: 'View all results' },
        { name: 'Rubrics', href: '/rubrics', icon: BookOpen, description: 'Manage rubrics' },
      ];

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
    <>
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-[9999] w-full transition-all duration-300",
        scrolled 
          ? "bg-white/95 backdrop-blur-xl shadow-md border-b border-gray-100/50" 
          : "bg-white/80 backdrop-blur-lg border-b border-transparent",
        className
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link 
              href={isAuthenticated ? "/dashboard" : "/"} 
              prefetch={true} 
              className="flex items-center gap-3 group"
            >
              <div className="relative">
                <img
                  src="/scorePAL-logo-2.svg"
                  alt="ScorePAL"
                  className="h-10 w-auto transition-transform duration-200 group-hover:scale-105"
                />
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {!isAuthenticated && landingNavigation.map((item) => (
                item.isAnchor ? (
                  <a
                    key={item.name}
                    href={item.href}
                    onClick={(e) => {
                      e.preventDefault();
                      handleAnchorClick(item.href);
                    }}
                    className="text-gray-600 hover:text-blue-600 transition-colors font-medium text-sm"
                  >
                    {item.name}
                  </a>
                ) : (
                  <Link key={item.name} href={item.href} prefetch={true}>
                    <span className="text-gray-600 hover:text-blue-600 transition-colors font-medium text-sm cursor-pointer">
                      {item.name}
                    </span>
                  </Link>
                )
              ))}
              
              <a
                href="https://github.com/Dead-Stone/ScorePAL"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-blue-600 transition-colors font-medium text-sm flex items-center gap-1.5"
              >
                <Github className="w-4 h-4" />
                <span>GitHub</span>
              </a>
              
              {!isAuthenticated && (
                <div className="flex items-center gap-3">
                  <Link href="/auth/login" prefetch={true}>
                    <Button variant="ghost" className="font-medium text-gray-700 hover:text-blue-600">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/auth/register" prefetch={true}>
                    <Button className="btn-primary text-sm">
                      Get Started
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Authenticated Navigation */}
            {isAuthenticated && (
              <div className="hidden md:flex items-center gap-2">
                {/* Main Nav Tabs */}
                <div className="flex items-center bg-gray-100/80 rounded-xl p-1 mr-4">
                  {mainNavigation.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    const handleMouseEnter = () => {
                      // Prefetch rubrics when hovering over Grade link
                      if (item.href === '/grade') {
                        // Prefetch in background
                        axios.get(`${API_BASE_URL}/rubrics`).then(response => {
                          const rubricsData = Array.isArray(response.data) ? response.data : [];
                          try {
                            localStorage.setItem('scorepal_rubrics_cache', JSON.stringify(rubricsData));
                            localStorage.setItem('scorepal_rubrics_timestamp', Date.now().toString());
                          } catch (error) {
                            // Silently fail
                          }
                        }).catch(() => {
                          // Silently fail for prefetch
                        });
                      }
                    };
                    return (
                      <Link key={item.name} href={item.href} prefetch={true}>
                        <div
                          onMouseEnter={handleMouseEnter}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200",
                            active
                              ? "bg-white text-blue-600 shadow-sm"
                              : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                          )}
                        >
                          <Icon className={cn("w-4 h-4", active && "text-blue-500")} />
                          <span>{item.name}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Notifications */}
                <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-xl hover:bg-gray-100">
                  <Bell className="w-5 h-5 text-gray-600" />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full ring-2 ring-white"></span>
                </Button>

                {/* Settings */}
                <Link href="/settings" prefetch={true}>
                  <Button variant="ghost" size="icon" className={cn(
                    "h-10 w-10 rounded-xl hover:bg-gray-100",
                    isActive('/settings') && "bg-blue-50 text-blue-600"
                  )}>
                    <Settings className="w-5 h-5 text-gray-600" />
                  </Button>
                </Link>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-3 h-10 px-3 rounded-xl hover:bg-gray-100 ml-1">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-sm font-semibold shadow-sm">
                        {user?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="hidden lg:block text-left">
                        <div className="text-sm font-semibold text-gray-900 leading-tight">
                          {user?.first_name || user?.email?.split('@')[0] || 'User'}
                        </div>
                        <div className="text-xs text-gray-500 capitalize leading-tight">
                          {user?.role || 'User'}
                        </div>
                      </div>
                      <ChevronDown className="w-4 h-4 text-gray-400 hidden lg:block" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 p-2 rounded-xl shadow-xl border border-gray-100 z-[10000]">
                    <div className="px-3 py-3 border-b border-gray-100 mb-2">
                      <div className="font-semibold text-gray-900">
                        {user?.first_name && user?.last_name
                          ? `${user.first_name} ${user.last_name}`
                          : user?.email || 'User'}
                      </div>
                      <div className="text-sm text-gray-500">{user?.email}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={cn(
                          "badge-modern text-xs",
                          user?.role === 'admin' ? 'badge-violet' :
                          user?.role === 'teacher' ? 'badge-blue' :
                          user?.role === 'grader' ? 'badge-amber' :
                          'badge-green'
                        )}>
                          {user?.role}
                        </span>
                      </div>
                    </div>
                    
                    <Link href="/profile" prefetch={true}>
                      <DropdownMenuItem className="rounded-lg cursor-pointer">
                        <User className="w-4 h-4 mr-3 text-gray-500" />
                        <span>Profile</span>
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/settings" prefetch={true}>
                      <DropdownMenuItem className="rounded-lg cursor-pointer">
                        <Settings className="w-4 h-4 mr-3 text-gray-500" />
                        <span>Settings</span>
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/help" prefetch={true}>
                      <DropdownMenuItem className="rounded-lg cursor-pointer">
                        <HelpCircle className="w-4 h-4 mr-3 text-gray-500" />
                        <span>Help & Support</span>
                      </DropdownMenuItem>
                    </Link>
                    
                    <DropdownMenuSeparator className="my-2" />
                    
                    <DropdownMenuItem 
                      onClick={handleLogout} 
                      className="rounded-lg cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      <span>Sign Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-10 w-10 rounded-xl"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div className={cn(
        "fixed inset-x-0 top-16 z-[9998] md:hidden transition-all duration-300 transform",
        mobileMenuOpen 
          ? "opacity-100 translate-y-0" 
          : "opacity-0 -translate-y-4 pointer-events-none"
      )}>
        <div className="bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-xl">
          <div className="px-4 py-4 space-y-1">
            {isAuthenticated ? (
              <>
                {mainNavigation.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <Link 
                      key={item.name} 
                      href={item.href} 
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <div
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                          "animate-fade-in-up",
                          isActive(item.href)
                            ? "bg-blue-50 text-blue-600"
                            : "text-gray-700 hover:bg-gray-50"
                        )}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <Icon className="w-5 h-5" />
                        <div>
                          <div>{item.name}</div>
                          <div className="text-xs text-gray-400">{item.description}</div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
                <div className="border-t border-gray-100 my-3 pt-3">
                  <Link href="/settings" onClick={() => setMobileMenuOpen(false)}>
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                      <Settings className="w-5 h-5" />
                      <span>Settings</span>
                    </div>
                  </Link>
                  <Link href="/profile" onClick={() => setMobileMenuOpen(false)}>
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                      <User className="w-5 h-5" />
                      <span>Profile</span>
                    </div>
                  </Link>
                  <button 
                    onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                {landingNavigation.map((item, index) => (
                  item.isAnchor ? (
                    <a
                      key={item.name}
                      href={item.href}
                      onClick={(e) => {
                        e.preventDefault();
                        handleAnchorClick(item.href);
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 animate-fade-in-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {item.name}
                    </a>
                  ) : (
                    <Link 
                      key={item.name} 
                      href={item.href} 
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <div 
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 animate-fade-in-up"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {item.name}
                      </div>
                    </Link>
                  )
                ))}
                <div className="border-t border-gray-100 my-3 pt-3 space-y-2">
                  <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)}>
                    <div className="flex items-center justify-center px-4 py-3 rounded-xl text-sm font-medium text-gray-700 border border-gray-200 hover:bg-gray-50">
                      Sign In
                    </div>
                  </Link>
                  <Link href="/auth/register" onClick={() => setMobileMenuOpen(false)}>
                    <div className="flex items-center justify-center px-4 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-violet-500">
                      Get Started
                    </div>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-[9997] bg-black/20 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
