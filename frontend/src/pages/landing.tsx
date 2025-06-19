/**
 * ScorePAL - Production Landing Page
 * Modern, professional landing page with smooth animations and real content
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 * @repository https://github.com/Dead-Stone/ScorePAL
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
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
  Sparkles
} from 'lucide-react';

export default function LandingPage() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Image
                src="/scorePAL-logo-only.png"
                alt="ScorePAL Logo"
                width={40}
                height={40}
                className="rounded-lg"
              />
              <span className="text-2xl font-bold text-gray-900">ScorePAL</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-700 hover:text-blue-600 transition-colors">Features</a>
              <a href="#pricing" className="text-gray-700 hover:text-blue-600 transition-colors">Pricing</a>
              <a href="#about" className="text-gray-700 hover:text-blue-600 transition-colors">About</a>
              <a href="#contact" className="text-gray-700 hover:text-blue-600 transition-colors">Contact</a>
              <Link href="/auth/login">
                <Button variant="outline" className="mr-2">Login</Button>
              </Link>
              <Link href="/auth/register">
                <Button className="bg-blue-600 hover:bg-blue-700">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <Badge variant="secondary" className="mb-6 px-4 py-2 text-sm font-medium">
                <Sparkles className="w-4 h-4 mr-2" />
                AI-Powered Agentic Grading - Now Open Source!
              </Badge>
              <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
                Transform Your
                <span className="hero-gradient bg-clip-text text-transparent"> Grading</span>
                <br />Experience
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed">
                ScorePAL revolutionizes academic assessment with intelligent AI agents that provide consistent, 
                detailed feedback while saving educators valuable time. Experience the future of grading today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
                <Link href="/auth/register">
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700 px-8 py-4 text-lg">
                    Start Free Trial
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/auth/login">
                  <Button size="lg" variant="outline" className="px-8 py-4 text-lg">
                    <GraduationCap className="mr-2 w-5 h-5" />
                    Existing User? Login
                  </Button>
                </Link>
              </div>
              <div className="flex items-center justify-center space-x-8 text-sm text-gray-500">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  10 Free Batch Gradings
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Unlimited Single PDFs
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  No Credit Card Required
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Why Educators Choose ScorePAL
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Powered by advanced AI agents, ScorePAL provides intelligent, consistent, and detailed grading 
              that adapts to your teaching style and requirements.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Bot,
                title: "Agentic AI Grading",
                description: "Multiple AI agents work together to provide comprehensive, consistent grading with human-like reasoning and detailed feedback.",
                gradient: "from-blue-500 to-purple-600"
              },
              {
                icon: Clock,
                title: "Save 80% of Your Time",
                description: "Automate repetitive grading tasks while maintaining quality. Focus on teaching, not paperwork.",
                gradient: "from-green-500 to-blue-600"
              },
              {
                icon: FileText,
                title: "Multi-Format Support",
                description: "Grade PDFs, Word documents, images, and handwritten submissions with advanced OCR technology.",
                gradient: "from-purple-500 to-pink-600"
              },
              {
                icon: BarChart3,
                title: "Canvas & Moodle Integration",
                description: "Seamlessly sync with your existing LMS. Import assignments and post grades automatically.",
                gradient: "from-orange-500 to-red-600"
              },
              {
                icon: Shield,
                title: "Consistent & Fair",
                description: "Eliminate grading bias with standardized rubrics and consistent evaluation criteria across all submissions.",
                gradient: "from-teal-500 to-green-600"
              },
              {
                icon: Zap,
                title: "Instant Feedback",
                description: "Generate detailed, constructive feedback instantly. Help students improve with actionable insights.",
                gradient: "from-yellow-500 to-orange-600"
              }
            ].map((feature, index) => (
              <Card key={index} className={`feature-card-hover border-0 shadow-lg animate-fade-in-up-delay-${index % 3 + 1}`}>
                <CardHeader className="text-center pb-4">
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${feature.gradient} flex items-center justify-center mx-auto mb-4`}>
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-xl font-semibold text-gray-900">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600 text-center leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Start for free, upgrade when you need more. No hidden fees, no long-term contracts.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Tier */}
            <Card className="border-2 border-gray-200 shadow-lg">
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl font-bold text-gray-900">Free</CardTitle>
                <div className="text-4xl font-bold text-gray-900 mt-4">$0</div>
                <p className="text-gray-600 mt-2">Perfect for trying ScorePAL</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>10 free batch gradings</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>Unlimited single PDF grading</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>Basic rubric templates</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>Email support</span>
                </div>
                <Link href="/auth/register">
                  <Button className="w-full mt-8">Get Started Free</Button>
                </Link>
              </CardContent>
            </Card>

            {/* Pro Tier */}
            <Card className="border-2 border-blue-500 shadow-xl relative">
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600">
                Most Popular
              </Badge>
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl font-bold text-gray-900">Professional</CardTitle>
                <div className="text-4xl font-bold text-gray-900 mt-4">$29</div>
                <p className="text-gray-600 mt-2">per month</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>Unlimited batch grading</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>All file format support</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>Advanced rubric builder</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>LMS integrations</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>Priority support</span>
                </div>
                <Link href="/auth/register">
                  <Button className="w-full mt-8 bg-blue-600 hover:bg-blue-700">Upgrade to Pro</Button>
                </Link>
              </CardContent>
            </Card>

            {/* Enterprise Tier */}
            <Card className="border-2 border-gray-200 shadow-lg">
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl font-bold text-gray-900">Enterprise</CardTitle>
                <div className="text-4xl font-bold text-gray-900 mt-4">Coming Soon</div>
                <p className="text-gray-600 mt-2">For institutions</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>Custom deployment</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>Advanced analytics</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>Multi-tenant support</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span>24/7 dedicated support</span>
                </div>
                <Button className="w-full mt-8" variant="outline" disabled>
                  Coming Soon
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Built by Educators, for Educators
              </h2>
              <p className="text-xl text-gray-600 mb-6 leading-relaxed">
                ScorePAL was created by Mohana Moganti, understanding the real challenges educators face. 
                What makes us unique is our agentic approach - multiple AI agents collaborate to provide 
                more accurate, nuanced grading that rivals human assessment.
              </p>
              <div className="space-y-4">
                <div className="flex items-center">
                  <Award className="w-6 h-6 text-blue-600 mr-3" />
                  <span className="text-gray-700">Open source and community-driven</span>
                </div>
                <div className="flex items-center">
                  <Users className="w-6 h-6 text-blue-600 mr-3" />
                  <span className="text-gray-700">Trusted by educators worldwide</span>
                </div>
                <div className="flex items-center">
                  <BookOpen className="w-6 h-6 text-blue-600 mr-3" />
                  <span className="text-gray-700">Continuous learning and improvement</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="glass-morphism rounded-2xl p-8 shadow-2xl">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center mx-auto mb-4">
                    <Bot className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Agentic AI Technology</h3>
                  <p className="text-gray-600">
                    Multiple specialized AI agents work together to analyze, evaluate, and provide feedback, 
                    ensuring comprehensive and accurate grading.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Get in Touch
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Have questions? Need help getting started? I'd love to hear from you.
          </p>
          <Card className="max-w-md mx-auto shadow-lg">
            <CardContent className="p-8">
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <Mail className="w-6 h-6 text-blue-600 mr-3" />
                  <a href="mailto:mohana@scorepal.ai" className="text-blue-600 hover:text-blue-700 font-medium">
                    mohana@scorepal.ai
                  </a>
                </div>
                <div className="flex items-center justify-center space-x-6">
                  <a href="https://github.com/Dead-Stone/ScorePAL" className="text-gray-600 hover:text-gray-900 transition-colors">
                    <Github className="w-6 h-6" />
                  </a>
                  <a href="https://linkedin.com/in/mohana-moganti" className="text-gray-600 hover:text-gray-900 transition-colors">
                    <Linkedin className="w-6 h-6" />
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Image
                  src="/scorePAL-logo.png"
                  alt="ScorePAL Logo"
                  width={100}
                  height={100}
                  className="rounded-lg"
                />
                {/* <span className="text-xl font-bold">ScorePAL</span> */}
              </div>
              <p className="text-gray-400">
                AI-powered agentic grading for the modern educator.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <div className="space-y-2 text-gray-400">
                <a href="#features" className="block hover:text-white transition-colors">Features</a>
                <a href="#pricing" className="block hover:text-white transition-colors">Pricing</a>
                <Link href="/auth/login" className="block hover:text-white transition-colors">Login</Link>
                <Link href="/auth/register" className="block hover:text-white transition-colors">Sign Up</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <div className="space-y-2 text-gray-400">
                <a href="https://github.com/Dead-Stone/ScorePAL" className="block hover:text-white transition-colors">Documentation</a>
                <a href="https://github.com/Dead-Stone/ScorePAL/issues" className="block hover:text-white transition-colors">Support</a>
                <a href="https://github.com/Dead-Stone/ScorePAL" className="block hover:text-white transition-colors">GitHub</a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <div className="space-y-2 text-gray-400">
                <a href="#" className="block hover:text-white transition-colors">Privacy Policy</a>
                <a href="#" className="block hover:text-white transition-colors">Terms of Service</a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 ScorePAL. Built with ❤️ by Mohana Moganti. Open source and free forever.</p>
          </div>
        </div>
      </footer>
    </div>
  );
} 