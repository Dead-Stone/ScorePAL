/**
 * Student Details Tab Component
 */

import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
} from '@mui/material';
import dynamic from 'next/dynamic';
import { GradingResults, StudentResult } from './types';
import { getStudentResult } from './utils';
import { StudentOverviewCard } from './StudentOverviewCard';
import { RubricAnalysis } from './RubricAnalysis';
import { MistakesTable } from './MistakesTable';
import { TextContentCard } from './TextContentCard';

const ChatInterface = dynamic(() => import('../ChatInterface'), { ssr: false });

interface StudentDetailsTabProps {
  results: GradingResults;
  selectedStudent: string | null;
  assignmentId: string;
}

export const StudentDetailsTab: React.FC<StudentDetailsTabProps> = ({ 
  results, 
  selectedStudent,
  assignmentId 
}) => {
  const studentResult = getStudentResult(results, selectedStudent);
  const studentName = selectedStudent || results.student_name || 'Student';

  if (!studentResult) {
    return (
      <Box textAlign="center" py={4}>
        <Typography variant="h6" color="text.secondary">
          Select a student to view details
        </Typography>
      </Box>
    );
  }

  const criteriaScores = studentResult.criteria_scores || [];
  const mistakes = studentResult.mistakes || {};

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <StudentOverviewCard 
          studentResult={studentResult} 
          studentName={studentName}
        />
      </Grid>
      
      <Grid item xs={12} md={8}>
        <RubricAnalysis criteriaScores={criteriaScores} />
      </Grid>
      
      {Object.keys(mistakes).length > 0 && (
        <Grid item xs={12}>
          <MistakesTable mistakes={mistakes} />
        </Grid>
      )}
      
      {!results.student_results && results.student_name && (
        <>
          {results.question_text && (
            <Grid item xs={12} md={6}>
              <TextContentCard 
                title="Question Paper" 
                content={results.question_text} 
              />
            </Grid>
          )}
          
          {results.submission_text && (
            <Grid item xs={12} md={6}>
              <TextContentCard 
                title="Student Submission" 
                content={results.submission_text} 
              />
            </Grid>
          )}
          
          {results.answer_key && (
            <Grid item xs={12}>
              <TextContentCard 
                title="Answer Key" 
                content={results.answer_key} 
              />
            </Grid>
          )}
        </>
      )}

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              AI Assistant
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ height: 400 }}>
              <ChatInterface 
                assignmentId={assignmentId}
                submissionId={selectedStudent ? `${assignmentId}_${selectedStudent}` : assignmentId}
                studentName={studentName}
                questionText={results.question_text}
                submissionText={results.submission_text}
                gradingFeedback={studentResult.grading_feedback}
                rubric={results.rubric}
                criteriaScores={criteriaScores}
                mistakes={mistakes}
                score={studentResult.score}
                maxScore={studentResult.total}
                percentage={studentResult.percentage}
                gradeLetter={studentResult.grade_letter}
                answerKey={results.answer_key}
                assignmentName={results.assignment_name}
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};
