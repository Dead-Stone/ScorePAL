/**
 * SingleGradingSteps - Step-by-step flow for single submission grading
 * Refactored to use modular step components
 */

import React, { useState } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Description as DescriptionIcon,
  Settings as SettingsIcon,
  PlayArrow as PlayArrowIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { UploadFilesStep } from './single/UploadFilesStep';
import { RubricStep } from './single/RubricStep';
import { SettingsStep } from './single/SettingsStep';
import { GradeStep } from './single/GradeStep';
import { ResultsStep } from './single/ResultsStep';
import { generateRubric, saveRubric } from './single/utils';

interface SingleGradingStepsProps {
  onComplete: (data: {
    studentName: string;
    assignmentName: string;
    questionPaper: File | null;
    submission: File | null;
    answerKey: File | null;
    rubricId: string;
    strictness: number;
    selectedModel?: any;
    generatedRubric?: any;
  }) => void;
  isLoading?: boolean;
  rubrics: any[];
  loadingRubrics: boolean;
  onModelSelect?: () => void;
  selectedModel?: any;
}

const steps = [
  { label: 'Upload Files', icon: <CloudUploadIcon /> },
  { label: 'Select Rubric', icon: <DescriptionIcon /> },
  { label: 'Configure Settings', icon: <SettingsIcon /> },
  { label: 'Grade Submission', icon: <PlayArrowIcon /> },
  { label: 'View Results', icon: <AssessmentIcon /> },
];

export const SingleGradingSteps: React.FC<SingleGradingStepsProps> = ({
  onComplete,
  isLoading = false,
  rubrics,
  loadingRubrics,
  onModelSelect,
  selectedModel,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [studentName, setStudentName] = useState('');
  const [assignmentName, setAssignmentName] = useState('');
  const [questionPaper, setQuestionPaper] = useState<File | null>(null);
  const [submission, setSubmission] = useState<File | null>(null);
  const [answerKey, setAnswerKey] = useState<File | null>(null);
  const [rubricId, setRubricId] = useState('');
  const [strictness, setStrictness] = useState(0.5);
  const [error, setError] = useState('');
  const [rubricMode, setRubricMode] = useState<'select' | 'generate'>('select');
  const [rubricNotes, setRubricNotes] = useState('');
  const [isGeneratingRubric, setIsGeneratingRubric] = useState(false);
  const [generatedRubric, setGeneratedRubric] = useState<any>(null);
  const [totalPoints, setTotalPoints] = useState('100');

  const handleNext = () => {
    if (activeStep === 0) {
      if (!studentName || !assignmentName || !questionPaper || !submission) {
        setError('Please fill in all required fields');
        return;
      }
      setError('');
    } else if (activeStep === 1) {
      if ((rubricMode === 'select' && !rubricId) || 
          (rubricMode === 'generate' && !generatedRubric && !rubricId)) {
        setError('Please select or generate a rubric');
        return;
      }
      setError('');
    } else if (activeStep === 3) {
      onComplete({
        studentName,
        assignmentName,
        questionPaper,
        submission,
        answerKey,
        rubricId,
        strictness,
        selectedModel,
        generatedRubric,
      });
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
    setError('');
  };

  const handleGenerateRubric = async () => {
    if (!questionPaper) {
      setError('Please upload a question paper first');
      return;
    }

    setIsGeneratingRubric(true);
    setError('');

    try {
      const generated = await generateRubric(questionPaper, rubricNotes, totalPoints);
      setGeneratedRubric(generated);
      setRubricId('generated');
    } catch (err: any) {
      console.error('Error generating rubric:', err);
      setError(err.response?.data?.detail || 'Error generating rubric');
    } finally {
      setIsGeneratingRubric(false);
    }
  };

  const handleSaveGeneratedRubric = async () => {
    if (!generatedRubric) return;

    try {
      const savedId = await saveRubric(assignmentName, generatedRubric, totalPoints, rubricNotes);
      setRubricId(savedId);
      setError('');
    } catch (err: any) {
      console.error('Error saving rubric:', err);
      setError(err.response?.data?.detail || 'Failed to save rubric');
    }
  };

  const handleUseGeneratedRubric = () => {
    setRubricId('generated');
    setError('');
  };

  const handleReset = () => {
    setActiveStep(0);
    setStudentName('');
    setAssignmentName('');
    setQuestionPaper(null);
    setSubmission(null);
    setAnswerKey(null);
    setRubricId('');
    setStrictness(0.5);
    setError('');
    setRubricMode('select');
    setRubricNotes('');
    setGeneratedRubric(null);
    setTotalPoints('100');
  };

  return (
    <Box>
      <Stepper activeStep={activeStep} orientation="vertical">
        <Step>
          <StepLabel StepIconComponent={() => <CloudUploadIcon />}>
            Upload Files
          </StepLabel>
          <StepContent>
            <UploadFilesStep
              studentName={studentName}
              assignmentName={assignmentName}
              questionPaper={questionPaper}
              submission={submission}
              answerKey={answerKey}
              error={error}
              onStudentNameChange={setStudentName}
              onAssignmentNameChange={setAssignmentName}
              onQuestionPaperChange={setQuestionPaper}
              onSubmissionChange={setSubmission}
              onAnswerKeyChange={setAnswerKey}
              onNext={handleNext}
            />
          </StepContent>
        </Step>

        <Step>
          <StepLabel StepIconComponent={() => <DescriptionIcon />}>
            Select or Generate Rubric
          </StepLabel>
          <StepContent>
            <RubricStep
              rubricMode={rubricMode}
              rubricId={rubricId}
              rubrics={rubrics}
              loadingRubrics={loadingRubrics}
              questionPaper={questionPaper}
              rubricNotes={rubricNotes}
              totalPoints={totalPoints}
              generatedRubric={generatedRubric}
              isGeneratingRubric={isGeneratingRubric}
              error={error}
              onRubricModeChange={setRubricMode}
              onRubricIdChange={setRubricId}
              onRubricNotesChange={setRubricNotes}
              onTotalPointsChange={setTotalPoints}
              onGenerateRubric={handleGenerateRubric}
              onSaveGeneratedRubric={handleSaveGeneratedRubric}
              onUseGeneratedRubric={handleUseGeneratedRubric}
              onBack={handleBack}
              onNext={handleNext}
            />
          </StepContent>
        </Step>

        <Step>
          <StepLabel StepIconComponent={() => <SettingsIcon />}>
            Configure Settings
          </StepLabel>
          <StepContent>
            <SettingsStep
              strictness={strictness}
              selectedModel={selectedModel}
              onStrictnessChange={setStrictness}
              onModelSelect={onModelSelect || (() => {})}
              onBack={handleBack}
              onNext={handleNext}
            />
          </StepContent>
        </Step>

        <Step>
          <StepLabel StepIconComponent={() => <PlayArrowIcon />}>
            Grade Submission
          </StepLabel>
          <StepContent>
            <GradeStep
              isLoading={isLoading}
              onBack={handleBack}
              onNext={handleNext}
            />
          </StepContent>
        </Step>

        <Step>
          <StepLabel StepIconComponent={() => <AssessmentIcon />}>
            View Results
          </StepLabel>
          <StepContent>
            <ResultsStep onReset={handleReset} />
          </StepContent>
        </Step>
      </Stepper>
    </Box>
  );
};
