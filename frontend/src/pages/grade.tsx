/**
 * ScorePAL - AI-Powered Academic Grading Assistant
 * Single & Batch Grading Interface
 * Statically generated at build time - data fetched client-side
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 * @repository https://github.com/Dead-Stone/ScorePAL
 */

import React, { useState, useEffect } from 'react';
import { GetStaticProps } from 'next';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { GradePageDocumentation } from '../components/PageDocumentation';
import { useAuth } from '../contexts/AuthContext';
import { CanvasIntegrationTab } from '../components/grading/CanvasIntegrationTab';
import { SingleGradingSteps } from '../components/grading/SingleGradingSteps';
import { CanvasGradingSteps } from '../components/grading/CanvasGradingSteps';
import { TopNavBar } from '../components/layout/TopNavBar';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { 
  User, 
  School, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { API_BASE_URL } from '@/config/api';
import ModelSelectionDialog from '../components/ModelSelectionDialog';

// Configure axios with base URL and default headers
axios.defaults.baseURL = API_BASE_URL;
axios.defaults.headers.common['Accept'] = 'application/json';
axios.defaults.headers.post['Content-Type'] = 'application/json';

// Type definitions
interface Rubric {
  id: string;
  name: string;
  total_points: number;
  sections: RubricSection[];
}

interface RubricSection {
  name: string;
  max_points: number;
  criteria: RubricCriterion[];
}

interface RubricCriterion {
  name: string;
  points: number;
  description: string;
  grading_scale: GradingScale[];
}

interface GradingScale {
  level: string;
  points: number;
  description: string;
}

interface ModelSelection {
  model_config_id: string;
  provider: string;
  model_name: string;
  custom_temperature?: number | null;
  custom_max_tokens?: number | null;
  use_streaming?: boolean;
}

// Styled components removed - using shadcn components instead

// TabPanel component removed - using TabsContent from shadcn instead

// Main component
// Static generation - compile at build time only
export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {},
    revalidate: 3600, // Revalidate every hour
  };
};

export default function GradePage() {
  const router = useRouter();
  const { user, checkGradingPermission, incrementGradingCount } = useAuth();
  
  // Tab state
  
  // State for single submission form
  const [singleForm, setSingleForm] = useState({
    studentName: '',
    assignmentName: '',
    questionPaper: null as File | null,
    submission: null as File | null,
    answerKey: null as File | null,
    rubricId: '',
    generatedRubric: null as any,
  });
  
  // Loading and notification state
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning',
  });
  
  // Add a state for strictness
  const [strictness, setStrictness] = useState(0.5);
  
  // State for rubrics
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [loadingRubrics, setLoadingRubrics] = useState(false);
  
  // State for AI model selection
  const [selectedModel, setSelectedModel] = useState<ModelSelection | null>(null);
  const [modelSelectionOpen, setModelSelectionOpen] = useState(false);
  const [estimatedTokens, setEstimatedTokens] = useState(0);
  
  // Fetch rubrics on component mount
  useEffect(() => {
    const fetchRubrics = async () => {
      try {
        setLoadingRubrics(true);
        const response = await axios.get('/rubrics');
        if (response.data && Array.isArray(response.data.rubrics)) {
          setRubrics(response.data.rubrics);
        }
      } catch (error) {
        console.error('Error fetching rubrics:', error);
        setNotification({
          open: true,
          message: 'Failed to load rubrics. Using default rubric instead.',
          severity: 'warning',
        });
      } finally {
        setLoadingRubrics(false);
      }
    };
    
    fetchRubrics();
  }, []);
  
  // Estimate tokens for grading
  const estimateTokensForGrading = () => {
    let totalText = '';
    
    // Add text content from files (simplified estimation)
    if (singleForm.submission) {
      totalText += `Submission content (estimated): ${singleForm.submission.size / 4} characters\n`;
    }
    if (singleForm.answerKey) {
      totalText += `Answer key content (estimated): ${singleForm.answerKey.size / 4} characters\n`;
    }
    if (singleForm.questionPaper) {
      totalText += `Question content (estimated): ${singleForm.questionPaper.size / 4} characters\n`;
    }
    
    // Rough token estimation: ~4 characters per token
    const estimated = Math.ceil(totalText.length / 4);
    setEstimatedTokens(Math.max(estimated, 500)); // Minimum estimate for grading prompt
  };
  
  // Handle single form field changes
  const handleSingleFormChange = (field: string, value: any) => {
    setSingleForm(prev => ({ ...prev, [field]: value }));
    
    // Estimate tokens when content changes
    if (field === 'submission' || field === 'answerKey' || field === 'questionPaper') {
      estimateTokensForGrading();
    }
  };
  
  // Handle model selection
  const handleModelSelect = (modelSelection: ModelSelection) => {
    setSelectedModel(modelSelection);
    setModelSelectionOpen(false);
  };
  
  // Open model selection dialog
  const openModelSelection = () => {
    estimateTokensForGrading();
    setModelSelectionOpen(true);
  };
  
  // Dropzone for question paper in single mode
  const questionPaperDropzone = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
    },
    maxFiles: 1,
    onDrop: acceptedFiles => {
      if (acceptedFiles.length > 0) {
          handleSingleFormChange('questionPaper', acceptedFiles[0]);
      }
    },
  });
  
  // Dropzone for answer key
  const answerKeyDropzone = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    onDrop: acceptedFiles => {
      if (acceptedFiles.length > 0) {
        handleSingleFormChange('answerKey', acceptedFiles[0]);
      }
    },
  });
  
  // Dropzone for submission in single mode
  const submissionDropzone = useDropzone({
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    onDrop: acceptedFiles => {
      if (acceptedFiles.length > 0) {
        handleSingleFormChange('submission', acceptedFiles[0]);
      }
    },
  });
  
  // Handle submission of single form
  const handleSingleSubmit = async () => {
    try {
      // Validate form
      if (!singleForm.studentName) {
        setNotification({
          open: true,
          message: 'Please enter a student name',
          severity: 'error',
        });
        return;
      }
      
      if (!singleForm.assignmentName) {
        setNotification({
          open: true,
          message: 'Please enter an assignment name',
          severity: 'error',
        });
        return;
      }
      
      if (!singleForm.questionPaper) {
        setNotification({
          open: true,
          message: 'Please upload a question paper',
          severity: 'error',
        });
        return;
      }
      
      if (!singleForm.submission) {
        setNotification({
          open: true,
          message: 'Please upload a submission',
          severity: 'error',
        });
        return;
      }
      
      setIsLoading(true);
      
      // Create form data
      const formData = new FormData();
      formData.append('student_name', singleForm.studentName);
      formData.append('assignment_name', singleForm.assignmentName);
      formData.append('question_paper', singleForm.questionPaper);
      formData.append('submission', singleForm.submission);
      formData.append('strictness', strictness.toString());
      
      if (singleForm.answerKey) {
        formData.append('answer_key', singleForm.answerKey);
      }
      
      if (singleForm.rubricId) {
        if (singleForm.rubricId === 'generated' && singleForm.generatedRubric) {
          // If using generated rubric, send it as JSON
          formData.append('rubric_json', JSON.stringify(singleForm.generatedRubric));
        } else {
          formData.append('rubric_id', singleForm.rubricId);
        }
      }
      
      // Include AI model selection if available
      if (selectedModel) {
        formData.append('ai_model_selection', JSON.stringify(selectedModel));
      }
      
      // Send request
      const response = await axios.post('/upload-single', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Handle response
      if (response.data && response.data.upload_id) {
        // Show success message - results will be displayed inline
        setNotification({
          open: true,
          message: 'Grading completed successfully! Results are displayed below.',
          severity: 'success',
        });
        // Results will be shown inline in SingleGradingSteps
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setNotification({
        open: true,
        message: 'Failed to submit form. Please try again.',
        severity: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle close notification
  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };
  
  // Redirect students - they should not access grading
  useEffect(() => {
    if (user?.role === 'student') {
      router.replace('/student');
    }
  }, [user, router]);

  if (user?.role === 'student') {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
          <TopNavBar />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
            <div className="flex items-center justify-center min-h-[60vh]">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['teacher', 'admin', 'grader']}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <TopNavBar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pt-28">
          {/* Documentation */}
          <GradePageDocumentation />

          {/* Notification Alert */}
          {notification.open && (
            <Alert className={`mb-4 ${
              notification.severity === 'error' 
                ? 'border-red-200 bg-red-50' 
                : notification.severity === 'warning'
                ? 'border-yellow-200 bg-yellow-50'
                : 'border-blue-200 bg-blue-50'
            }`}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{notification.message}</AlertDescription>
              <button
                onClick={handleCloseNotification}
                className="ml-auto text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </Alert>
          )}
      
          {/* Single Submission Section */}
          <div className="mb-8">
            <Card className="border-0 shadow-md">
              <CardContent className="p-6">
                <SingleGradingSteps
                  onComplete={async (data) => {
                    // Update form state with step data
                    setSingleForm({
                      studentName: data.studentName,
                      assignmentName: data.assignmentName,
                      questionPaper: data.questionPaper,
                      submission: data.submission,
                      answerKey: data.answerKey,
                      rubricId: data.rubricId,
                      generatedRubric: data.generatedRubric,
                    });
                    setStrictness(data.strictness);
                    if (data.selectedModel) {
                      setSelectedModel(data.selectedModel);
                    }
                    // Trigger the actual grading
                    await handleSingleSubmit();
                  }}
                  isLoading={isLoading}
                  rubrics={rubrics}
                  loadingRubrics={loadingRubrics}
                />
              </CardContent>
            </Card>
          </div>

          {/* Canvas Integration Section */}
          <div className="mb-8">
            <Card className="border-0 shadow-md">
              <CardContent className="p-6">
                <CanvasIntegrationTab />
              </CardContent>
            </Card>
          </div>

          {/* Model Selection Dialog */}
          <ModelSelectionDialog
            open={modelSelectionOpen}
            onClose={() => setModelSelectionOpen(false)}
            onSelect={handleModelSelect}
            currentSelection={selectedModel as any}
            estimatedTokens={estimatedTokens}
          />
        </div>
      </div>
      </ProtectedRoute>
    );
  }