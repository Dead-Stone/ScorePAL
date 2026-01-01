/**
 * ScorePAL - Demo Page
 * Interactive demo for grading a single submission with rubric options
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { TopNavBar } from '../components/layout/TopNavBar';
import { 
  Upload, 
  FileText, 
  Sparkles, 
  Settings, 
  CheckCircle, 
  XCircle,
  Loader2,
  ArrowLeft,
  Brain,
  Edit,
  Download,
  Award
} from 'lucide-react';
import dynamic from 'next/dynamic';
import axios from 'axios';
import { API_BASE_URL } from '@/config/api';
import { GetStaticProps } from 'next';

// Static generation for demo page
export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {},
    revalidate: 3600, // Revalidate every hour
  };
};

interface RubricCriterion {
  name: string;
  max_points: number;
  description: string;
}

interface Rubric {
  criteria: RubricCriterion[];
  total_points: number;
}

interface GradingResult {
  status: string;
  result: {
    score: number;
    max_score: number;
    percentage: number;
    feedback: string;
    criteria_scores?: Record<string, any>;
    rubric_breakdown?: Array<{
      criterion_name: string;
      points_awarded: number;
      max_points: number;
      feedback: string;
    }>;
  };
  student_name: string;
  assignment_name: string;
}

export default function DemoPage() {
  const [step, setStep] = useState<'upload' | 'rubric' | 'grading' | 'results'>('upload');
  const [questionPaper, setQuestionPaper] = useState<File | null>(null);
  const [submission, setSubmission] = useState<File | null>(null);
  const [answerKey, setAnswerKey] = useState<File | null>(null);
  const [studentName, setStudentName] = useState('Demo Student');
  const [assignmentName, setAssignmentName] = useState('Demo Assignment');
  const [strictness, setStrictness] = useState(0.5);
  
  // Rubric state
  const [rubricMode, setRubricMode] = useState<'ai' | 'manual'>('ai');
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [isGeneratingRubric, setIsGeneratingRubric] = useState(false);
  const [manualRubric, setManualRubric] = useState<Rubric>({
    criteria: [
      { name: 'Content', max_points: 40, description: 'Quality and accuracy of content' },
      { name: 'Analysis', max_points: 30, description: 'Critical thinking and analysis' },
      { name: 'Organization', max_points: 20, description: 'Structure and clarity' },
      { name: 'Language', max_points: 10, description: 'Grammar and mechanics' }
    ],
    total_points: 100
  });
  
  // Grading state
  const [isGrading, setIsGrading] = useState(false);
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (type: 'question' | 'submission' | 'answer', file: File | null) => {
    if (type === 'question') setQuestionPaper(file);
    else if (type === 'submission') setSubmission(file);
    else if (type === 'answer') setAnswerKey(file);
  };

  const generateRubric = async () => {
    if (!questionPaper) {
      setError('Please upload a question paper first');
      return;
    }

    setIsGeneratingRubric(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('question_paper', questionPaper);
      formData.append('rubric_context', 'Generate a comprehensive grading rubric based on this assignment.');
      formData.append('total_points', '100');

      const response = await axios.post(`${API_BASE_URL}/api/grade-public/generate-rubric`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.status === 'success') {
        const generatedRubric = response.data.rubric;
        setRubric(generatedRubric);
        setStep('rubric');
      } else {
        setError('Failed to generate rubric');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error generating rubric');
    } finally {
      setIsGeneratingRubric(false);
    }
  };

  const handleRubricNext = () => {
    if (rubricMode === 'ai' && !rubric) {
      setError('Please generate a rubric first');
      return;
    }
    if (rubricMode === 'manual') {
      setRubric(manualRubric);
    }
    setStep('grading');
    gradeSubmission();
  };

  const gradeSubmission = async () => {
    if (!questionPaper || !submission || !rubric) {
      setError('Please complete all required fields');
      return;
    }

    setIsGrading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('student_name', studentName);
      formData.append('assignment_name', assignmentName);
      formData.append('question_paper', questionPaper);
      formData.append('submission', submission);
      formData.append('strictness', strictness.toString());
      formData.append('rubric_json', JSON.stringify(rubric));
      
      if (answerKey) {
        formData.append('answer_key', answerKey);
      }

      const response = await axios.post(`${API_BASE_URL}/api/grade-public/grade-single`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.status === 'success') {
        setGradingResult(response.data);
        setStep('results');
      } else {
        setError('Grading failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error grading submission');
    } finally {
      setIsGrading(false);
    }
  };

  const addCriterion = () => {
    setManualRubric({
      ...manualRubric,
      criteria: [...manualRubric.criteria, { name: 'New Criterion', max_points: 10, description: '' }]
    });
  };

  const updateCriterion = (index: number, field: keyof RubricCriterion, value: any) => {
    const updated = { ...manualRubric };
    updated.criteria[index] = { ...updated.criteria[index], [field]: value };
    const total = updated.criteria.reduce((sum, c) => sum + c.max_points, 0);
    updated.total_points = total;
    setManualRubric(updated);
  };

  const removeCriterion = (index: number) => {
    const updated = { ...manualRubric };
    updated.criteria = updated.criteria.filter((_, i) => i !== index);
    const total = updated.criteria.reduce((sum, c) => sum + c.max_points, 0);
    updated.total_points = total;
    setManualRubric(updated);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 w-full z-[9999] bg-white/80 backdrop-blur-lg border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <img
                src="/scorePAL-logo-2.svg"
                alt="ScorePAL Logo"
                width={32}
                height={32}
                className="rounded-lg"
              />
            </Link>
            <Link href="/">
              <Button variant="ghost">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </nav>
      {/* Spacer for fixed nav */}
      <div className="h-16"></div>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 px-4 py-1 bg-blue-100 text-blue-700 border-blue-200">
            Interactive Demo
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Try ScorePAL AI Grading
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Experience ScorePAL's optional AI-powered grading feature. Upload a question paper and student submission 
            to see how our agentic AI agents provide detailed feedback and consistent scoring.
          </p>
          <p className="text-sm text-gray-500 mt-3 max-w-2xl mx-auto">
            Note: ScorePAL is primarily a Canvas analytics and insights platform. This demo showcases our optional AI grading feature.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-12">
          {[
            { key: 'upload', label: 'Upload', icon: Upload },
            { key: 'rubric', label: 'Rubric', icon: Settings },
            { key: 'grading', label: 'Grading', icon: Sparkles },
            { key: 'results', label: 'Results', icon: Award }
          ].map((s, index) => {
            const Icon = s.icon;
            const isActive = step === s.key;
            const isCompleted = ['upload', 'rubric', 'grading', 'results'].indexOf(step) > index;
            
            return (
              <React.Fragment key={s.key}>
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                    isActive ? 'bg-blue-600 border-blue-600 text-white' :
                    isCompleted ? 'bg-green-500 border-green-500 text-white' :
                    'bg-white border-gray-300 text-gray-400'
                  }`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className={`text-sm mt-2 font-medium ${
                    isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    {s.label}
                  </span>
                </div>
                {index < 3 && (
                  <div className={`w-24 h-1 mx-4 transition-all ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Error Display */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 text-red-700">
                <XCircle className="w-5 h-5" />
                <p>{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl">Upload Files</CardTitle>
              <CardDescription>Upload your question paper and student submission</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student Name
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter student name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assignment Name
                </label>
                <input
                  type="text"
                  value={assignmentName}
                  onChange={(e) => setAssignmentName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter assignment name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Paper <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc"
                    onChange={(e) => handleFileUpload('question', e.target.files?.[0] || null)}
                    className="hidden"
                    id="question-upload"
                  />
                  <label htmlFor="question-upload" className="cursor-pointer">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      {questionPaper ? questionPaper.name : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">PDF, DOCX, or DOC</p>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student Submission <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc,.txt"
                    onChange={(e) => handleFileUpload('submission', e.target.files?.[0] || null)}
                    className="hidden"
                    id="submission-upload"
                  />
                  <label htmlFor="submission-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      {submission ? submission.name : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">PDF, DOCX, DOC, or TXT</p>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Answer Key (Optional)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc,.txt"
                    onChange={(e) => handleFileUpload('answer', e.target.files?.[0] || null)}
                    className="hidden"
                    id="answer-upload"
                  />
                  <label htmlFor="answer-upload" className="cursor-pointer">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      {answerKey ? answerKey.name : 'Optional: Upload answer key'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">PDF, DOCX, DOC, or TXT</p>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grading Strictness: {strictness.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={strictness}
                  onChange={(e) => setStrictness(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Lenient</span>
                  <span>Moderate</span>
                  <span>Strict</span>
                </div>
              </div>

              <Button
                onClick={() => setStep('rubric')}
                disabled={!questionPaper || !submission}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                size="lg"
              >
                Next: Configure Rubric
                <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Rubric */}
        {step === 'rubric' && (
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl">Configure Rubric</CardTitle>
              <CardDescription>Choose how to create your grading rubric</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <button
                  onClick={() => setRubricMode('ai')}
                  className={`p-6 rounded-lg border-2 transition-all ${
                    rubricMode === 'ai'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Brain className={`w-8 h-8 mb-3 ${rubricMode === 'ai' ? 'text-blue-600' : 'text-gray-400'}`} />
                  <h3 className="font-bold text-lg mb-2">AI-Generated Rubric</h3>
                  <p className="text-sm text-gray-600">
                    Let AI analyze your question paper and generate a comprehensive rubric automatically
                  </p>
                </button>

                <button
                  onClick={() => setRubricMode('manual')}
                  className={`p-6 rounded-lg border-2 transition-all ${
                    rubricMode === 'manual'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Edit className={`w-8 h-8 mb-3 ${rubricMode === 'manual' ? 'text-blue-600' : 'text-gray-400'}`} />
                  <h3 className="font-bold text-lg mb-2">Manual Rubric</h3>
                  <p className="text-sm text-gray-600">
                    Define your own grading criteria and point allocations
                  </p>
                </button>
              </div>

              {rubricMode === 'ai' && (
                <div className="space-y-4">
                  <Button
                    onClick={generateRubric}
                    disabled={isGeneratingRubric || !questionPaper}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    size="lg"
                  >
                    {isGeneratingRubric ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating Rubric...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Rubric with AI
                      </>
                    )}
                  </Button>

                  {rubric && (
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="pt-6">
                        <div className="flex items-center space-x-2 text-green-700 mb-4">
                          <CheckCircle className="w-5 h-5" />
                          <span className="font-semibold">Rubric Generated Successfully!</span>
                        </div>
                        <div className="space-y-2">
                          {rubric.criteria.map((criterion, idx) => (
                            <div key={idx} className="flex justify-between items-center p-2 bg-white rounded">
                              <div>
                                <span className="font-medium">{criterion.name}</span>
                                <span className="text-sm text-gray-600 ml-2">- {criterion.description}</span>
                              </div>
                              <Badge>{criterion.max_points} pts</Badge>
                            </div>
                          ))}
                          <div className="pt-2 border-t border-green-200">
                            <div className="flex justify-between font-bold">
                              <span>Total Points:</span>
                              <span>{rubric.total_points}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {rubricMode === 'manual' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold">Rubric Criteria</h4>
                    <Button onClick={addCriterion} variant="outline" size="sm">
                      Add Criterion
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {manualRubric.criteria.map((criterion, index) => (
                      <Card key={index} className="p-4">
                        <div className="grid md:grid-cols-3 gap-4">
                          <div>
                            <label className="text-xs text-gray-600 mb-1 block">Criterion Name</label>
                            <input
                              type="text"
                              value={criterion.name}
                              onChange={(e) => updateCriterion(index, 'name', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600 mb-1 block">Max Points</label>
                            <input
                              type="number"
                              value={criterion.max_points}
                              onChange={(e) => updateCriterion(index, 'max_points', parseInt(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                          <div className="flex items-end space-x-2">
                            <div className="flex-1">
                              <label className="text-xs text-gray-600 mb-1 block">Description</label>
                              <input
                                type="text"
                                value={criterion.description}
                                onChange={(e) => updateCriterion(index, 'description', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                placeholder="What this criterion assesses"
                              />
                            </div>
                            <Button
                              onClick={() => removeCriterion(index)}
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total Points:</span>
                      <span>{manualRubric.total_points}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex space-x-4">
                <Button
                  onClick={() => setStep('upload')}
                  variant="outline"
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleRubricNext}
                  disabled={(rubricMode === 'ai' && !rubric) || (rubricMode === 'manual' && manualRubric.criteria.length === 0)}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  size="lg"
                >
                  Start Grading
                  <Sparkles className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Grading */}
        {step === 'grading' && isGrading && (
          <Card className="shadow-xl">
            <CardContent className="pt-12 pb-12 text-center">
              <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Grading in Progress</h3>
              <p className="text-gray-600">
                Our AI agents are analyzing the submission and providing detailed feedback...
              </p>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Results */}
        {step === 'results' && gradingResult && (
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl">Grading Results</CardTitle>
              <CardDescription>
                {gradingResult.student_name} - {gradingResult.assignment_name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Overall Score */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 text-center">
                <div className="text-5xl font-bold text-blue-600 mb-2">
                  {gradingResult.result.score} / {gradingResult.result.max_score}
                </div>
                <div className="text-2xl font-semibold text-gray-700 mb-2">
                  {gradingResult.result.percentage.toFixed(1)}%
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 h-3 rounded-full transition-all"
                    style={{ width: `${gradingResult.result.percentage}%` }}
                  />
                </div>
              </div>

              {/* Feedback */}
              <div>
                <h4 className="font-semibold text-lg mb-2">Overall Feedback</h4>
                <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg">
                  {gradingResult.result.feedback || 'No feedback provided.'}
                </p>
              </div>

              {/* Rubric Breakdown */}
              {gradingResult.result.rubric_breakdown && (
                <div>
                  <h4 className="font-semibold text-lg mb-4">Rubric Breakdown</h4>
                  <div className="space-y-3">
                    {gradingResult.result.rubric_breakdown.map((item: any, idx: number) => (
                      <Card key={idx} className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h5 className="font-semibold">{item.criterion_name}</h5>
                            <p className="text-sm text-gray-600 mt-1">{item.feedback}</p>
                          </div>
                          <Badge variant="secondary" className="ml-4">
                            {item.points_awarded} / {item.max_points}
                          </Badge>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${(item.points_awarded / item.max_points) * 100}%` }}
                          />
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex space-x-4 pt-4">
                <Button
                  onClick={() => {
                    setStep('upload');
                    setGradingResult(null);
                    setRubric(null);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Grade Another
                </Button>
                <Link href="/" className="flex-1">
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                    Get Started
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

