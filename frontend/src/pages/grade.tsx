/**
 * ScorePAL - Modern Grading Interface
 * Sleek, step-based grading experience
 */

import React, { useState, useEffect } from 'react';
import { GetStaticProps } from 'next';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { GradePageDocumentation } from '../components/PageDocumentation';
import { useAuth } from '../contexts/AuthContext';
import { CanvasIntegrationTab } from '../components/grading/CanvasIntegrationTab';
import { SingleGradingSteps } from '../components/grading/SingleGradingSteps';
import { TopNavBar } from '../components/layout/TopNavBar';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  Loader2,
  AlertCircle,
  FileUp,
  Layers,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  X,
  Upload,
  Zap,
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { useRouter } from 'next/router';
import { API_BASE_URL } from '@/config/api';
import ModelSelectionDialog from '../components/ModelSelectionDialog';
import { cn } from '@/lib/utils';

axios.defaults.baseURL = API_BASE_URL;
axios.defaults.headers.common['Accept'] = 'application/json';
axios.defaults.headers.post['Content-Type'] = 'application/json';

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

export const getStaticProps: GetStaticProps = async () => {
  return { props: {}, revalidate: 3600 };
};

export default function GradePage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'single' | 'canvas'>('single');
  
  const [singleForm, setSingleForm] = useState({
    studentName: '',
    assignmentName: '',
    questionPaper: null as File | null,
    submission: null as File | null,
    answerKey: null as File | null,
    rubricId: '',
    generatedRubric: null as any,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning',
  });
  
  const [strictness, setStrictness] = useState(0.5);
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [loadingRubrics, setLoadingRubrics] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelSelection | null>(null);
  const [modelSelectionOpen, setModelSelectionOpen] = useState(false);
  const [estimatedTokens, setEstimatedTokens] = useState(0);
  
  // Load rubrics with caching for fast subsequent loads
  useEffect(() => {
    const fetchRubrics = async () => {
      // Check cache first for instant loading
      try {
        const cached = localStorage.getItem('scorepal_rubrics_cache');
        const timestamp = localStorage.getItem('scorepal_rubrics_timestamp');
        
        if (cached && timestamp) {
          const age = Date.now() - parseInt(timestamp, 10);
          // Use cached data if less than 5 minutes old
          if (age < 300000) {
            const cachedRubrics = JSON.parse(cached);
            if (Array.isArray(cachedRubrics)) {
              setRubrics(cachedRubrics);
              // Still fetch in background to refresh cache
              setLoadingRubrics(true);
            }
          }
        } else {
          setLoadingRubrics(true);
        }
      } catch (error) {
        setLoadingRubrics(true);
      }
      
      try {
        const response = await axios.get('/rubrics');
        const rubricsData = Array.isArray(response.data) ? response.data : [];
        setRubrics(rubricsData);
        
        // Cache for next time
        try {
          localStorage.setItem('scorepal_rubrics_cache', JSON.stringify(rubricsData));
          localStorage.setItem('scorepal_rubrics_timestamp', Date.now().toString());
        } catch (error) {
          // Storage might be full, silently fail
        }
      } catch (error) {
        // Only show error if we don't have cached data
        const cached = localStorage.getItem('scorepal_rubrics_cache');
        if (!cached) {
          setNotification({
            open: true,
            message: 'Failed to load rubrics. Using cached or default rubric instead.',
            severity: 'warning',
          });
        }
      } finally {
        setLoadingRubrics(false);
      }
    };
    
    fetchRubrics();
    
    // Prefetch on visibility change (user returns later)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refresh cache in background
        axios.get('/rubrics').then(response => {
          const rubricsData = Array.isArray(response.data) ? response.data : [];
          setRubrics(rubricsData);
          try {
            localStorage.setItem('scorepal_rubrics_cache', JSON.stringify(rubricsData));
            localStorage.setItem('scorepal_rubrics_timestamp', Date.now().toString());
          } catch (error) {
            // Silently fail
          }
        }).catch(() => {
          // Silently fail for background refresh
        });
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  const estimateTokensForGrading = () => {
    let totalText = '';
    if (singleForm.submission) {
      totalText += `Submission content (estimated): ${singleForm.submission.size / 4} characters\n`;
    }
    if (singleForm.answerKey) {
      totalText += `Answer key content (estimated): ${singleForm.answerKey.size / 4} characters\n`;
    }
    if (singleForm.questionPaper) {
      totalText += `Question content (estimated): ${singleForm.questionPaper.size / 4} characters\n`;
    }
    const estimated = Math.ceil(totalText.length / 4);
    setEstimatedTokens(Math.max(estimated, 500));
  };
  
  const handleSingleFormChange = (field: string, value: any) => {
    setSingleForm(prev => ({ ...prev, [field]: value }));
    if (field === 'submission' || field === 'answerKey' || field === 'questionPaper') {
      estimateTokensForGrading();
    }
  };
  
  const handleModelSelect = (modelSelection: ModelSelection) => {
    setSelectedModel(modelSelection);
    setModelSelectionOpen(false);
  };
  
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
  
  const submissionDropzone = useDropzone({
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    onDrop: acceptedFiles => {
      if (acceptedFiles.length > 0) {
        handleSingleFormChange('submission', acceptedFiles[0]);
      }
    },
  });
  
  const handleSingleSubmit = async () => {
    try {
      if (!singleForm.studentName) {
        setNotification({ open: true, message: 'Please enter a student name', severity: 'error' });
        return;
      }
      if (!singleForm.assignmentName) {
        setNotification({ open: true, message: 'Please enter an assignment name', severity: 'error' });
        return;
      }
      if (!singleForm.questionPaper) {
        setNotification({ open: true, message: 'Please upload a question paper', severity: 'error' });
        return;
      }
      if (!singleForm.submission) {
        setNotification({ open: true, message: 'Please upload a submission', severity: 'error' });
        return;
      }
      
      setIsLoading(true);
      
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
          formData.append('rubric_json', JSON.stringify(singleForm.generatedRubric));
        } else {
          formData.append('rubric_id', singleForm.rubricId);
        }
      }
      
      if (selectedModel) {
        formData.append('ai_model_selection', JSON.stringify(selectedModel));
      }
      
      const response = await axios.post('/upload-single', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      if (response.data && response.data.upload_id) {
        setNotification({
          open: true,
          message: 'Grading completed successfully! Results are displayed below.',
          severity: 'success',
        });
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      setNotification({
        open: true,
        message: 'Failed to submit form. Please try again.',
        severity: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };
  
  useEffect(() => {
    if (user?.role === 'student') {
      router.replace('/student');
    }
  }, [user, router]);

  if (user?.role === 'student') {
    return (
      <ProtectedRoute>
        <div className="min-h-screen page-gradient">
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
      <div className="min-h-screen page-gradient">
        <TopNavBar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pt-24">
          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Grade <span className="gradient-text">Submissions</span>
            </h1>
            <p className="text-gray-500">
              Upload submissions for AI-powered grading with detailed feedback
            </p>
          </div>

          {/* Documentation */}
          <GradePageDocumentation />

          {/* Notification Alert */}
          {notification.open && (
            <Alert className={cn(
              "mb-6 rounded-xl animate-fade-in-down",
              notification.severity === 'error' 
                ? 'border-rose-200 bg-rose-50 text-rose-800' 
                : notification.severity === 'warning'
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : notification.severity === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-blue-200 bg-blue-50 text-blue-800'
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {notification.severity === 'success' ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5" />
                  )}
                  <AlertDescription className="text-sm font-medium">{notification.message}</AlertDescription>
                </div>
                <button
                  onClick={handleCloseNotification}
                  className="p-1 rounded-lg hover:bg-black/5 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </Alert>
          )}

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 p-1.5 bg-gray-100/80 rounded-xl w-fit mb-8 animate-fade-in-up">
            <button
              onClick={() => setActiveTab('single')}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200",
                activeTab === 'single'
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
              )}
            >
              <FileUp className="w-4 h-4" />
              Single Submission
            </button>
            <button
              onClick={() => setActiveTab('canvas')}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200",
                activeTab === 'canvas'
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
              )}
            >
              <Layers className="w-4 h-4" />
              Canvas Integration
            </button>
          </div>
      
          {/* Single Submission Section */}
          {activeTab === 'single' && (
            <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <Card className="card-modern">
                <CardHeader className="border-b border-gray-100 bg-gray-50/50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-semibold text-gray-900">
                        AI-Powered Grading
                      </CardTitle>
                      <CardDescription className="text-gray-500">
                        Upload a single submission for detailed AI analysis and feedback
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <SingleGradingSteps
                    onComplete={async (data) => {
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
                      await handleSingleSubmit();
                    }}
                    isLoading={isLoading}
                    rubrics={rubrics}
                    loadingRubrics={loadingRubrics}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Canvas Integration Section */}
          {activeTab === 'canvas' && (
            <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <Card className="card-modern">
                <CardHeader className="border-b border-gray-100 bg-gray-50/50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-teal-500/25">
                      <Layers className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-semibold text-gray-900">
                        Canvas LMS Integration
                      </CardTitle>
                      <CardDescription className="text-gray-500">
                        Connect to Canvas and grade submissions directly from your courses
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <CanvasIntegrationTab />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Features Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <div className="p-6 rounded-2xl bg-white/70 border border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
                <Zap className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Fast Processing</h3>
              <p className="text-sm text-gray-500">
                Get detailed grading results in seconds with our advanced AI models
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-white/70 border border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center mb-4">
                <Sparkles className="w-5 h-5 text-violet-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Detailed Feedback</h3>
              <p className="text-sm text-gray-500">
                AI-generated feedback with strengths, weaknesses, and suggestions
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-white/70 border border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Rubric-Based</h3>
              <p className="text-sm text-gray-500">
                Consistent grading based on customizable rubrics and criteria
              </p>
            </div>
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
