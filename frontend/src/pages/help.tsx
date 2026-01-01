/**
 * ScorePAL - Help & Documentation Page
 * Comprehensive help center with guides, FAQs, and support information
 * Statically generated at build time
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 */

import React, { useState } from 'react';
import { GetStaticProps } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
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
  AlertCircle,
  Info,
  Zap,
  ArrowRight,
  Github,
  ExternalLink
} from 'lucide-react';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { PageLayout } from '../components/layout/PageLayout';
import { PageHeader } from '../components/common/PageHeader';

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
    steps: [
      'Navigate to Canvas Grading page',
      'Enter your Canvas API key and course ID',
      'Select an assignment to grade',
      'Choose submissions and configure settings',
      'Grades are automatically posted to Canvas'
    ]
  }
];

// Static generation - compile at build time only
export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {},
    revalidate: 3600, // Revalidate every hour
  };
};

export default function HelpPage() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('general');
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  const categories = ['general', 'grading', 'account', 'technical'] as const;
  const categoryLabels = {
    general: 'General',
    grading: 'Grading',
    account: 'Account',
    technical: 'Technical'
  };

  const filteredFAQs = expandedCategory 
    ? faqs.filter(faq => faq.category === expandedCategory)
    : faqs;

  return (
    <ProtectedRoute>
      <PageLayout maxWidth="lg">
        <PageHeader
          title="Help & Support"
          subtitle="Find answers, guides, and get the help you need"
        />

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="border-blue-200 hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Mail className="w-5 h-5 mr-2 text-blue-600" />
                  Contact Support
                </CardTitle>
                <CardDescription>
                  Get personalized help from our team
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.location.href = 'mailto:mohana@scorepal.ai'}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Email Us
                </Button>
              </CardContent>
            </Card>

            <Card className="border-green-200 hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <BookOpen className="w-5 h-5 mr-2 text-green-600" />
                  Documentation
                </CardTitle>
                <CardDescription>
                  Detailed guides and tutorials
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open('https://github.com/Dead-Stone/ScorePAL', '_blank', 'noopener,noreferrer')}
                >
                  <Github className="w-4 h-4 mr-2" />
                  View Docs
                </Button>
              </CardContent>
            </Card>

            <Card className="border-purple-200 hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Video className="w-5 h-5 mr-2 text-purple-600" />
                  Video Tutorials
                </CardTitle>
                <CardDescription>
                  Watch step-by-step guides
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled
                >
                  <Video className="w-4 h-4 mr-2" />
                  Coming Soon
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Quick Guides */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Zap className="w-6 h-6 mr-2 text-blue-600" />
              Quick Start Guides
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {quickGuides.map((guide, index) => (
                <Card key={index} className="border-gray-200">
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3 text-blue-600">
                        {guide.icon}
                      </div>
                      {guide.title}
                    </CardTitle>
                    <CardDescription>{guide.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ol className="space-y-2">
                      {guide.steps.map((step, stepIndex) => (
                        <li key={stepIndex} className="flex items-start text-sm text-gray-700">
                          <span className="font-semibold text-blue-600 mr-2">{stepIndex + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <HelpCircle className="w-6 h-6 mr-2 text-blue-600" />
              Frequently Asked Questions
            </h2>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2 mb-6">
              <Button
                variant={expandedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setExpandedCategory(null)}
              >
                All
              </Button>
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={expandedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExpandedCategory(category)}
                >
                  {categoryLabels[category]}
                </Button>
              ))}
            </div>

            {/* FAQ Items */}
            <div className="space-y-3">
              {filteredFAQs.map((faq, index) => (
                <Card key={index} className="border-gray-200">
                  <CardHeader
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                  >
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center">
                        <HelpCircle className="w-4 h-4 mr-2 text-blue-600" />
                        {faq.question}
                      </CardTitle>
                      {expandedFAQ === index ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <Badge variant="outline" className="mt-2">
                      {categoryLabels[faq.category]}
                    </Badge>
                  </CardHeader>
                  {expandedFAQ === index && (
                    <CardContent>
                      <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>

          {/* Additional Resources */}
          <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Info className="w-5 h-5 mr-2 text-blue-600" />
                Additional Resources
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Account & Settings</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>• View your profile and settings</li>
                    <li>• Check grading usage and limits</li>
                    <li>• Manage your account preferences</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Technical Support</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>• API documentation and integration</li>
                    <li>• Troubleshooting common issues</li>
                    <li>• System requirements and compatibility</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Section */}
          <Card className="mt-8 border-2 border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageCircle className="w-5 h-5 mr-2 text-blue-600" />
                Still Need Help?
              </CardTitle>
              <CardDescription>
                Our support team is here to assist you
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={() => window.location.href = 'mailto:mohana@scorepal.ai?subject=ScorePAL Support Request'}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Email Support
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.open('https://github.com/Dead-Stone/ScorePAL', '_blank', 'noopener,noreferrer')}
                >
                  <Github className="w-4 h-4 mr-2" />
                  GitHub Repository
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </div>
              <p className="text-sm text-gray-600 mt-4 text-center">
                Response time: Usually within 24 hours
              </p>
            </CardContent>
          </Card>
      </PageLayout>
    </ProtectedRoute>
  );
}

