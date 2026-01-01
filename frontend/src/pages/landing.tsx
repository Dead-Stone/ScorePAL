/**
 * ScorePAL - Production Landing Page
 * Modern, professional landing page with sleek design
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 * @repository https://github.com/Dead-Stone/ScorePAL
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

// Dynamically import Lottie to avoid SSR issues
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });
import { 
  ArrowRight, 
  CheckCircle, 
  Star, 
  Users, 
  Clock, 
  BookOpen,
  Bot,
  Zap,
  Shield,
  Award,
  Mail,
  Github,
  Linkedin,
  GraduationCap,
  FileText,
  BarChart3,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  Layers,
  Workflow,
  Play,
  Monitor,
  Smartphone,
  Tablet,
  ChevronRight,
  Rocket,
  Brain,
  LineChart,
  Database,
  Lock,
  Globe
} from 'lucide-react';
import { TopNavBar } from '../components/layout/TopNavBar';

function LandingPage() {
  const [isVisible, setIsVisible] = useState(false);
  const [analyticsAnimation, setAnalyticsAnimation] = useState<any>(null);
  const [examsAnimation, setExamsAnimation] = useState<any>(null);

  useEffect(() => {
    setIsVisible(true);
    
    // Load the two Lottie animations
    const loadAnimations = async () => {
      try {
        const [analyticsRes, examsRes] = await Promise.all([
          fetch('/Analytics Character Animation.json'),
          fetch('/Exams Preparation..json')
        ]);
        
        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json();
          setAnalyticsAnimation(analyticsData);
        }
        
        if (examsRes.ok) {
          const examsData = await examsRes.json();
          setExamsAnimation(examsData);
        }
      } catch (error) {
        console.warn('Failed to load animations:', error);
      }
    };
    
    loadAnimations();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <TopNavBar />
      <div className="h-16"></div>
      {/* Hero Section */}
      <section className="pt-12 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className={`grid lg:grid-cols-2 gap-8 items-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {/* Left Side - Text Content */}
            <div className="text-left">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <Badge variant="secondary" className="px-4 py-1.5 text-sm font-medium bg-white/90 backdrop-blur-sm border border-blue-200">
                  <Github className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                  <span className="text-blue-600">Open Source</span>
                </Badge>
                <Badge variant="secondary" className="px-4 py-1.5 text-sm font-medium bg-white/90 backdrop-blur-sm border border-green-200">
                  <Zap className="w-3.5 h-3.5 mr-1.5 text-green-600" />
                  <span className="text-green-600">Easy to Use</span>
                </Badge>
                <Badge variant="secondary" className="px-4 py-1.5 text-sm font-medium bg-white/90 backdrop-blur-sm border border-purple-200">
                  <Shield className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
                  <span className="text-purple-600">Free Forever</span>
                </Badge>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 leading-tight tracking-tight">
                Canvas Analytics
                <br />
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Made Simple
                </span>
              </h1>
              
              <p className="text-base md:text-lg text-gray-600 mb-6 leading-relaxed">
                Track student performance, get insights, and save hours with AI grading. 
                <span className="font-semibold text-gray-800"> Easy to login. Easy to use.</span>
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <Link href="/auth/register" prefetch={true}>
                  <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-5 text-base font-semibold shadow-xl shadow-blue-500/30 transition-all hover:scale-[1.02]">
                    Get Started Free
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/auth/login" prefetch={true}>
                  <Button size="lg" variant="outline" className="px-8 py-5 text-base font-semibold border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400">
                    Login
                  </Button>
                </Link>
              </div>
              
              <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span>Setup in 2 minutes</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Github className="w-4 h-4 text-gray-700" />
                  <a href="https://github.com/Dead-Stone/ScorePAL" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">
                    Open source on GitHub
                  </a>
                </div>
              </div>
            </div>

            {/* Right Side - Animation */}
            <div className="relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-white border border-gray-100">
                <div className="w-full h-[400px] flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
                  {typeof window !== 'undefined' && Lottie && analyticsAnimation ? (
                    <Lottie
                      animationData={analyticsAnimation}
                      loop={true}
                      autoplay={true}
                      style={{ width: '100%', height: '100%' }}
                    />
                  ) : (
                    <BarChart3 className="w-32 h-32 text-blue-400" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4 px-4 py-1 bg-blue-100 text-blue-700 border-blue-200">
              Features
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
              Everything You Need
            </h2>
            <p className="text-base text-gray-600 max-w-2xl mx-auto">
              Powerful analytics and insights, all in one easy-to-use platform
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: BarChart3,
                title: "Real-Time Analytics",
                description: "Track performance and statistics with visual analytics.",
                gradient: "from-blue-500 to-cyan-500"
              },
              {
                icon: LineChart,
                title: "Performance Insights",
                description: "Monitor trends and identify struggling students early.",
                gradient: "from-green-500 to-emerald-500"
              },
              {
                icon: FileText,
                title: "Assignment Analytics",
                description: "Analyze submissions, grading progress, and scores.",
                gradient: "from-purple-500 to-pink-500"
              },
              {
                icon: Database,
                title: "LMS Integration",
                description: "Sync with Canvas and Moodle automatically.",
                gradient: "from-orange-500 to-red-500"
              },
              {
                icon: Target,
                title: "Course Comparison",
                description: "Compare performance across courses and semesters.",
                gradient: "from-indigo-500 to-blue-500"
              },
              {
                icon: Brain,
                title: "AI Grading",
                description: "Optional AI-powered grading with detailed feedback.",
                gradient: "from-purple-500 to-pink-500"
              }
            ].map((feature, index) => (
              <Card key={index} className="border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group bg-white">
                <CardHeader className="pb-3">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center mb-4 shadow-md`}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <CardTitle className="text-xl font-bold text-gray-900">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-3 px-4 py-1 bg-indigo-100 text-indigo-700 border-indigo-200">
              Process
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
              How It Works
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Connect Canvas",
                description: "Link your account in seconds",
                icon: Globe,
                gradient: "from-blue-500 to-cyan-500"
              },
              {
                step: "02",
                title: "View Insights",
                description: "See real-time analytics and data",
                icon: BarChart3,
                gradient: "from-purple-500 to-pink-500"
              },
              {
                step: "03",
                title: "Grade & Analyze",
                description: "Use AI grading, track everything",
                icon: TrendingUp,
                gradient: "from-green-500 to-teal-500"
              }
            ].map((step, index) => (
              <div key={index} className="relative">
                <Card className="border border-gray-200 shadow-sm h-full bg-white hover:shadow-lg transition-all duration-300">
                  <CardHeader className="text-center pb-3">
                    <div className={`w-20 h-20 rounded-2xl bg-gradient-to-r ${step.gradient} flex items-center justify-center mx-auto mb-4 shadow-md`}>
                      <step.icon className="w-10 h-10 text-white" />
                    </div>
                    <Badge variant="outline" className="mb-3 font-semibold">Step {step.step}</Badge>
                    <CardTitle className="text-2xl font-bold text-gray-900">{step.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-gray-600 text-center">
                      {step.description}
                    </CardDescription>
                  </CardContent>
                </Card>
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-6 transform -translate-y-1/2 z-10">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-3 px-4 py-1 bg-purple-100 text-purple-700 border-purple-200">
              Interactive Demo
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
              Try ScorePAL Now
            </h2>
          </div>

          <div className="max-w-4xl mx-auto">
            <Card className="border-0 shadow-2xl overflow-hidden">
              <div className="grid lg:grid-cols-2 gap-0">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-10 text-white flex flex-col justify-center">
                  <Brain className="w-14 h-14 mb-5 opacity-90" />
                  <h3 className="text-2xl font-bold mb-3">Try It Free</h3>
                  <p className="text-blue-100 mb-6 leading-relaxed text-sm">
                    Experience ScorePAL in 2 minutes. No sign-up required.
                  </p>
                  <ul className="space-y-2.5 mb-8 text-sm">
                    {[
                      "Upload question paper & submission",
                      "AI generates rubric automatically",
                      "Get instant grading with feedback",
                      "See detailed score breakdown"
                    ].map((feature, idx) => (
                      <li key={idx} className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/demo" prefetch={true}>
                    <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 w-full shadow-lg">
                      Start Demo
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </div>
                
                <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-0 flex items-center justify-center overflow-hidden min-h-[400px]">
                  <div className="w-full h-full">
                    {typeof window !== 'undefined' && Lottie && examsAnimation ? (
                      <Lottie
                        animationData={examsAnimation}
                        loop={true}
                        autoplay={true}
                        style={{ width: '100%', height: '100%', minHeight: '400px' }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center min-h-[400px]">
                        <Brain className="w-24 h-24 text-purple-400" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-12 bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Badge className="mb-2 px-3 py-1 bg-indigo-100 text-indigo-700 border-indigo-200 text-xs">
            About Us
          </Badge>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 tracking-tight">
            Empowering Educators with Smart Analytics
          </h2>
          <p className="text-sm text-gray-600 mb-3 leading-relaxed">
            ScorePAL is an open-source platform designed to help educators gain deeper insights into student performance through Canvas analytics and AI-powered grading tools.
          </p>
          <p className="text-sm text-gray-600 mb-4 leading-relaxed">
            We believe that every educator should have access to powerful analytics tools without the complexity. Our mission is to make student performance tracking simple, accessible, and free for all educators worldwide.
          </p>
          <div className="space-y-2 mb-4">
            {[
              { icon: Users, text: "Built by educators, for educators" },
              { icon: Github, text: "100% open source and community-driven" },
              { icon: Shield, text: "Free forever - no credit card required" },
              { icon: Award, text: "Trusted by educators worldwide" }
            ].map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-sm text-gray-700 font-medium">{item.text}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/auth/register" prefetch={true}>
              <Button size="default" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg w-full sm:w-auto">
                Join Our Community
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <a href="https://github.com/Dead-Stone/ScorePAL" target="_blank" rel="noopener noreferrer">
              <Button size="default" variant="outline" className="w-full sm:w-auto border-2">
                <Github className="mr-2 w-4 h-4" />
                View on GitHub
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <Badge className="mb-2 px-3 py-1 bg-yellow-100 text-yellow-700 border-yellow-200 text-xs">
              Testimonials
            </Badge>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 tracking-tight">
              Loved by Educators
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                name: "Dr. Sarah Chen",
                role: "Computer Science Professor",
                content: "ScorePAL's analytics dashboard gives me insights I never had before. I can see which students are struggling early and track performance trends across my courses.",
                rating: 5,
                avatar: "SC"
              },
              {
                name: "Prof. Michael Rodriguez",
                role: "Mathematics Department",
                content: "The Canvas integration is seamless. I can see all my course data in one place, and the optional AI grading saves me hours when I need it.",
                rating: 5,
                avatar: "MR"
              },
              {
                name: "Dr. Emily Watson",
                role: "English Literature",
                content: "I love being able to compare performance across different courses and semesters. The analytics help me understand what's working and what needs improvement.",
                rating: 5,
                avatar: "EW"
              }
            ].map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-md hover:shadow-lg transition-shadow duration-300">
                <CardContent className="p-5">
                  <div className="flex items-center mb-3">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-sm text-gray-700 mb-4 leading-relaxed italic">
                    "{testimonial.content}"
                  </p>
                  <div className="flex items-center space-x-3 border-t pt-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{testimonial.name}</p>
                      <p className="text-xs text-gray-600">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/10 bg-[size:20px_20px]"></div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
            Ready to Get Started?
          </h2>
              <p className="text-lg text-blue-100 mb-10 max-w-2xl mx-auto">
            Easy login. Easy to use. Start tracking performance in minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/auth/register" prefetch={true}>
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-10 py-7 text-lg font-semibold shadow-xl">
                Create Free Account
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/auth/login" prefetch={true}>
              <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 px-10 py-7 text-lg font-semibold">
                Login
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-blue-100 text-sm mt-6">
            <span>✓ No credit card required</span>
            <span>•</span>
            <span>✓ Free forever plan</span>
            <span>•</span>
            <span>✓ Open source</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="mb-6">
                <img
                  src="/scorePAL-logo-no-bg.svg"
                  alt="ScorePAL Logo"
                  width={200}
                  height={112}
                  className="max-w-full h-auto"
                />
              </div>
              <p className="text-gray-400 leading-relaxed mb-4">
                Easy-to-use Canvas analytics and insights platform for educators. Optional AI-powered grading. 
              </p>
              <div className="flex items-center space-x-2">
                <Github className="w-4 h-4 text-gray-400" />
                <a href="https://github.com/Dead-Stone/ScorePAL" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors text-sm font-medium">
                  Open source on GitHub
                </a>
              </div>
            </div>
            <div>
              <h4 className="font-bold mb-4">Product</h4>
              <div className="space-y-2 text-gray-400">
                <a href="#features" className="block hover:text-white transition-colors">Features</a>
                <a href="#how-it-works" className="block hover:text-white transition-colors">How It Works</a>
                <Link href="/demo" prefetch={true} className="block hover:text-white transition-colors">Demo</Link>
                <Link href="/auth/login" prefetch={true} className="block hover:text-white transition-colors">Login</Link>
              </div>
            </div>
            <div>
              <h4 className="font-bold mb-4">Resources</h4>
              <div className="space-y-2 text-gray-400">
                <a href="https://github.com/Dead-Stone/ScorePAL" target="_blank" rel="noopener noreferrer" className="block hover:text-white transition-colors">Documentation</a>
                <a href="https://github.com/Dead-Stone/ScorePAL/issues" target="_blank" rel="noopener noreferrer" className="block hover:text-white transition-colors">Support</a>
                <a href="https://github.com/Dead-Stone/ScorePAL" target="_blank" rel="noopener noreferrer" className="block hover:text-white transition-colors">GitHub</a>
              </div>
            </div>
            <div>
              <h4 className="font-bold mb-4">Get in Touch</h4>
              <div className="space-y-3 text-gray-400">
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <a href="mailto:mohana@scorepal.ai" className="hover:text-white transition-colors">
                    mohana@scorepal.ai
                  </a>
                </div>
                <div className="flex items-center space-x-2">
                  <Github className="w-4 h-4 text-gray-400" />
                  <a href="https://github.com/Dead-Stone/ScorePAL" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    GitHub
                  </a>
                </div>
                <div className="flex items-center space-x-2">
                  <Linkedin className="w-4 h-4 text-gray-400" />
                  <a href="https://linkedin.com/in/mohana-moganti" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    LinkedIn
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>&copy; 2024 ScorePAL. Built with ❤️ by Mohana Moganti.</p>
            <p className="mt-2">
              <a href="https://github.com/Dead-Stone/ScorePAL" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors">
                Open source
              </a>
              {' '}and available to all educators worldwide.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Export for static generation
export default LandingPage;

// Enable static optimization
export const config = {
  // This page is statically generated at build time
  unstable_runtimeJS: false,
};
