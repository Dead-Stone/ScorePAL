/**
 * ScorePAL - Modern Help & Documentation Page
 * Comprehensive help center with sleek design
 */

import React, { useState } from 'react';
import { GetStaticProps } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  BookOpen, 
  HelpCircle, 
  Mail, 
  MessageCircle,
  FileText,
  Video,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Zap,
  Github,
  ExternalLink,
  Search,
  Sparkles,
  GraduationCap,
  Lightbulb,
  Send,
} from 'lucide-react';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { TopNavBar } from '../components/layout/TopNavBar';
import { cn } from '@/lib/utils';

interface FAQItem {
  question: string;
  answer: string;
  category: 'general' | 'grading' | 'account' | 'technical';
}

const faqs: FAQItem[] = [
  {
    category: 'general',
    question: 'What is ScorePAL?',
    answer: 'ScorePAL is an AI-powered academic grading assistant that helps educators grade student submissions efficiently using advanced AI models. It supports single PDF grading, batch processing, and Canvas integration.'
  },
  {
    category: 'general',
    question: 'How does AI grading work?',
    answer: 'ScorePAL uses Mistral AI models to analyze student submissions based on rubrics and answer keys. The AI evaluates content, provides detailed feedback, and assigns scores according to your specified criteria and strictness level.'
  },
  {
    category: 'grading',
    question: 'What file formats are supported?',
    answer: 'ScorePAL supports PDF, DOCX, and image files (JPG, PNG). For batch processing, you can upload a ZIP file containing multiple submissions.'
  },
  {
    category: 'grading',
    question: 'How many free gradings do I get?',
    answer: 'New users get 10 free batch gradings. Single PDF submissions are unlimited and free. ScorePAL is completely free to use with no premium plans or subscriptions.'
  },
  {
    category: 'grading',
    question: 'What is the strictness level?',
    answer: 'Strictness (0.1-1.0) controls how detailed and rigorous the grading is. Lower values (0.1-0.3) are more lenient, medium (0.4-0.6) is balanced, and higher (0.7-1.0) is very strict and detailed.'
  },
  {
    category: 'account',
    question: 'How do I reset my password?',
    answer: 'Click "Forgot your password?" on the login page, enter your email, and you\'ll receive a reset link. The link expires in 24 hours for security.'
  },
  {
    category: 'account',
    question: 'Can I change my role?',
    answer: 'Your role (Teacher, Admin, Student, Grader) is set during registration. Contact support if you need to change your role.'
  },
  {
    category: 'technical',
    question: 'How do I integrate with Canvas?',
    answer: 'Go to Canvas Grading page, enter your Canvas API key and course details. ScorePAL will sync assignments and submissions automatically. You can then grade directly in Canvas.'
  },
  {
    category: 'technical',
    question: 'What if grading fails?',
    answer: 'Check your internet connection, ensure files are in supported formats, and verify your account has available gradings. If issues persist, contact support with the error message.'
  }
];

const quickGuides = [
  {
    title: 'Getting Started',
    description: 'Learn the basics of using ScorePAL',
    icon: <Zap className="w-5 h-5" />,
    color: 'blue',
    steps: [
      'Create an account or sign in',
      'Upload your assignment question paper',
      'Upload student submissions (PDF, DOCX, or images)',
      'Configure grading settings and rubric',
      'Review AI-generated grades and feedback'
    ]
  },
  {
    title: 'Batch Grading',
    description: 'Grade multiple submissions at once',
    icon: <FileText className="w-5 h-5" />,
    color: 'violet',
    steps: [
      'Prepare a ZIP file with all student submissions',
      'Upload the ZIP file in Batch Upload section',
      'Set your rubric and strictness level',
      'Wait for processing (may take a few minutes)',
      'Download results or view in Results Dashboard'
    ]
  },
  {
    title: 'Canvas Integration',
    description: 'Connect ScorePAL with Canvas LMS',
    icon: <MessageCircle className="w-5 h-5" />,
    color: 'emerald',
    steps: [
      'Navigate to Canvas Grading page',
      'Enter your Canvas API key and course ID',
      'Select an assignment to grade',
      'Choose submissions and configure settings',
      'Grades are automatically posted to Canvas'
    ]
  }
];

export const getStaticProps: GetStaticProps = async () => {
  return { props: {}, revalidate: 3600 };
};

export default function HelpPage() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('general');
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const categories = ['general', 'grading', 'account', 'technical'] as const;
  const categoryLabels = {
    general: 'General',
    grading: 'Grading',
    account: 'Account',
    technical: 'Technical'
  };

  const filteredFAQs = faqs.filter(faq => {
    const matchesCategory = !expandedCategory || faq.category === expandedCategory;
    const matchesSearch = !searchTerm || 
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string, icon: string, text: string }> = {
      blue: { bg: 'bg-blue-100', icon: 'text-blue-600', text: 'text-blue-600' },
      violet: { bg: 'bg-violet-100', icon: 'text-violet-600', text: 'text-violet-600' },
      emerald: { bg: 'bg-emerald-100', icon: 'text-emerald-600', text: 'text-emerald-600' },
    };
    return colors[color] || colors.blue;
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen page-gradient">
        <TopNavBar />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pt-24">
          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Help & <span className="gradient-text">Support</span>
            </h1>
            <p className="text-gray-500">
              Find answers, guides, and get the help you need
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 animate-fade-in-up">
            <Card className="card-interactive group">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-transform">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">Contact Support</h3>
                    <p className="text-sm text-gray-500 mb-3">Get personalized help from our team</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => window.location.href = 'mailto:mohana@scorepal.ai'}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Email Us
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-interactive group">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/25 group-hover:scale-110 transition-transform">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">Documentation</h3>
                    <p className="text-sm text-gray-500 mb-3">Detailed guides and tutorials</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => window.open('https://github.com/Dead-Stone/ScorePAL', '_blank')}
                    >
                      <Github className="w-4 h-4 mr-2" />
                      View Docs
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-interactive group">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 group-hover:scale-110 transition-transform">
                    <Video className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">Video Tutorials</h3>
                    <p className="text-sm text-gray-500 mb-3">Watch step-by-step guides</p>
                    <Button variant="outline" size="sm" className="w-full" disabled>
                      <Video className="w-4 h-4 mr-2" />
                      Coming Soon
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Guides */}
          <div className="mb-10 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="icon-container-amber w-10 h-10">
                <Lightbulb className="w-5 h-5 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Quick Start Guides</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {quickGuides.map((guide, index) => {
                const colors = getColorClasses(guide.color);
                return (
                  <Card key={index} className="card-modern">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", colors.bg)}>
                          <div className={colors.icon}>{guide.icon}</div>
                        </div>
                        <div>
                          <CardTitle className="text-base">{guide.title}</CardTitle>
                        </div>
                      </div>
                      <CardDescription>{guide.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ol className="space-y-2">
                        {guide.steps.map((step, stepIndex) => (
                          <li key={stepIndex} className="flex items-start text-sm text-gray-600">
                            <span className={cn("font-bold mr-2", colors.text)}>{stepIndex + 1}.</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* FAQ Section */}
          <div className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="icon-container-blue w-10 h-10">
                <HelpCircle className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Frequently Asked Questions</h2>
            </div>

            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search FAQs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-modern pl-12"
              />
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2 mb-6">
              <Button
                variant={expandedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setExpandedCategory(null)}
                className={cn(
                  "rounded-xl",
                  expandedCategory === null && "bg-blue-600"
                )}
              >
                All
              </Button>
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={expandedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExpandedCategory(category)}
                  className={cn(
                    "rounded-xl",
                    expandedCategory === category && "bg-blue-600"
                  )}
                >
                  {categoryLabels[category]}
                </Button>
              ))}
            </div>

            {/* FAQ Items */}
            <div className="space-y-3">
              {filteredFAQs.map((faq, index) => (
                <Card 
                  key={index} 
                  className={cn(
                    "card-modern cursor-pointer transition-all",
                    expandedFAQ === index && "ring-2 ring-blue-200"
                  )}
                  onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                >
                  <CardHeader className="pb-0">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-3 font-semibold text-gray-900">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                          <HelpCircle className="w-4 h-4 text-blue-600" />
                        </div>
                        {faq.question}
                      </CardTitle>
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                        expandedFAQ === index ? "bg-blue-100" : "bg-gray-100"
                      )}>
                        {expandedFAQ === index ? (
                          <ChevronUp className="w-4 h-4 text-blue-600" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                    <span className={cn(
                      "badge-modern text-xs ml-11",
                      faq.category === 'general' ? 'badge-blue' :
                      faq.category === 'grading' ? 'badge-violet' :
                      faq.category === 'account' ? 'badge-amber' :
                      'badge-green'
                    )}>
                      {categoryLabels[faq.category]}
                    </span>
                  </CardHeader>
                  {expandedFAQ === index && (
                    <CardContent className="pt-4 pb-5">
                      <p className="text-gray-600 leading-relaxed ml-11">{faq.answer}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>

            {filteredFAQs.length === 0 && (
              <div className="empty-state py-12">
                <div className="empty-state-icon">
                  <Search className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-gray-500 font-medium">No FAQs found</p>
                <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
              </div>
            )}
          </div>

          {/* Contact Section */}
          <Card className="card-modern mt-10 border-2 border-blue-200 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white shadow-lg">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Still Need Help?</h3>
                  <p className="text-gray-500">Our support team is here to assist you. Response time: usually within 24 hours.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    className="btn-primary"
                    onClick={() => window.location.href = 'mailto:mohana@scorepal.ai?subject=ScorePAL Support Request'}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Email Support
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => window.open('https://github.com/Dead-Stone/ScorePAL', '_blank')}
                  >
                    <Github className="w-4 h-4 mr-2" />
                    GitHub
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
