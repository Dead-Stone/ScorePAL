/**
 * Page Documentation Component for ScorePAL
 * Provides helpful documentation and guides for each page
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  BookOpen, 
  ChevronDown, 
  ChevronUp, 
  HelpCircle, 
  FileText, 
  Zap, 
  Users, 
  Settings,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';

interface DocumentationStep {
  title: string;
  description: string;
  icon?: React.ReactNode;
  type?: 'info' | 'warning' | 'success';
}

interface PageDocumentationProps {
  title: string;
  description: string;
  steps: DocumentationStep[];
  tips?: string[];
  requirements?: string[];
  isOpen?: boolean;
}

export const PageDocumentation: React.FC<PageDocumentationProps> = ({
  title,
  description,
  steps,
  tips = [],
  requirements = [],
  isOpen = false
}) => {
  const [expanded, setExpanded] = useState(isOpen);

  const getStepIcon = (type?: string) => {
    switch (type) {
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const getStepColor = (type?: string) => {
    switch (type) {
      case 'warning':
        return 'border-l-amber-400 bg-amber-50';
      case 'success':
        return 'border-l-green-400 bg-green-50';
      default:
        return 'border-l-blue-400 bg-blue-50';
    }
  };

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg text-blue-900">{title}</CardTitle>
              <CardDescription className="text-blue-700 mt-1">
                {description}
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
          >
            {expanded ? (
              <>
                Hide Guide <ChevronUp className="w-4 h-4 ml-1" />
              </>
            ) : (
              <>
                Show Guide <ChevronDown className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-6">
          {/* Requirements */}
          {requirements.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Settings className="w-4 h-4 mr-2" />
                Requirements
              </h4>
              <div className="space-y-2">
                {requirements.map((requirement, index) => (
                  <div key={index} className="flex items-center text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    {requirement}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Steps */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              Step-by-Step Guide
            </h4>
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className={`border-l-4 p-4 rounded-r-lg ${getStepColor(step.type)}`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs px-2 py-1">
                        {index + 1}
                      </Badge>
                      {step.icon || getStepIcon(step.type)}
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900 mb-1">{step.title}</h5>
                      <p className="text-sm text-gray-700">{step.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          {tips.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Zap className="w-4 h-4 mr-2" />
                Pro Tips
              </h4>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <ul className="space-y-2">
                  {tips.map((tip, index) => (
                    <li key={index} className="flex items-start text-sm text-yellow-800">
                      <ArrowRight className="w-4 h-4 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Help Link */}
          <div className="pt-4 border-t border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-700">Need more help?</span>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                onClick={() => window.open('mailto:mohana@scorepal.ai', '_blank')}
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                Contact Support
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

// Predefined documentation for different pages
export const GradePageDocumentation = () => (
  <PageDocumentation
    title="AI-Powered Grading Guide"
    description="Learn how to use ScorePAL's intelligent grading system to evaluate student submissions efficiently."
    requirements={[
      "PDF, Word, or image files of student submissions",
      "Question paper or assignment description",
      "Optional: Answer key or rubric for better accuracy",
      "Valid ScorePAL account with available gradings"
    ]}
    steps={[
      {
        title: "Choose Grading Type",
        description: "Select between single submission grading (free for PDFs) or batch grading (10 free batch operations).",
        type: "info"
      },
      {
        title: "Upload Assignment Details",
        description: "Upload the question paper or provide assignment description. This helps our AI understand the context.",
        type: "info"
      },
      {
        title: "Upload Student Submissions",
        description: "Upload individual files or a ZIP archive containing multiple submissions. Supported formats: PDF, DOCX, images.",
        type: "info"
      },
      {
        title: "Configure Grading Settings",
        description: "Set strictness level (0.1-1.0) and choose or create a rubric. Higher strictness means more detailed evaluation.",
        type: "info"
      },
      {
        title: "Review AI Results",
        description: "Our agentic AI system will provide detailed feedback, scores, and suggestions. Review and adjust as needed.",
        type: "success"
      }
    ]}
    tips={[
      "Use clear, high-quality scans for handwritten submissions",
      "Provide answer keys for more accurate grading",
      "Start with medium strictness (0.5) and adjust based on results",
      "Batch processing is more efficient for multiple submissions",
      "Review AI suggestions - they're designed to assist, not replace your judgment"
    ]}
  />
);

export const CanvasPageDocumentation = () => (
  <PageDocumentation
    title="Canvas LMS Integration Guide"
    description="Seamlessly integrate ScorePAL with your Canvas courses for automated grading workflows."
    requirements={[
      "Canvas instructor account with API access",
      "Course with assignments to grade",
      "Canvas API token (generated in Account Settings)",
      "ScorePAL account with teacher or admin role"
    ]}
    steps={[
      {
        title: "Generate Canvas API Token",
        description: "Go to Canvas Account Settings → Approved Integrations → New Access Token. Copy the generated token.",
        type: "info"
      },
      {
        title: "Connect to Canvas",
        description: "Enter your Canvas API token to establish connection. ScorePAL will verify and fetch your courses.",
        type: "info"
      },
      {
        title: "Select Course & Assignment",
        description: "Choose the course and specific assignment you want to grade. ScorePAL will display assignment details.",
        type: "info"
      },
      {
        title: "Configure Grading Parameters",
        description: "Set up rubrics, strictness levels, and grading criteria. These will be applied to all submissions.",
        type: "warning",
        icon: <Settings className="w-4 h-4 text-amber-600" />
      },
      {
        title: "Start Automated Grading",
        description: "ScorePAL will fetch submissions, grade them using AI, and prepare results for review.",
        type: "info"
      },
      {
        title: "Review & Post Grades",
        description: "Review the AI-generated grades and feedback, make adjustments, then post back to Canvas.",
        type: "success"
      }
    ]}
    tips={[
      "Keep your API token secure - don't share it with others",
      "Test with a small assignment first to familiarize yourself",
      "Review all AI-generated feedback before posting to Canvas",
      "Use Canvas speedgrader for final review and adjustments",
      "ScorePAL respects Canvas assignment settings and due dates"
    ]}
  />
); 