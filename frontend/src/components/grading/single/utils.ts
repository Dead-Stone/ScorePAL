/**
 * Single Grading Utilities
 */

import axios from 'axios';
import { API_BASE_URL } from '@/config/api';

export const generateRubric = async (
  questionPaper: File,
  rubricNotes: string,
  totalPoints: string
): Promise<any> => {
  const formData = new FormData();
  formData.append('question_paper', questionPaper);
  formData.append('rubric_context', rubricNotes || 'Generate a comprehensive grading rubric based on this assignment.');
  formData.append('total_points', totalPoints);

  const response = await axios.post(`${API_BASE_URL}/api/grade-public/generate-rubric`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  if (response.data.status === 'success') {
    return response.data.rubric;
  } else {
    throw new Error('Failed to generate rubric');
  }
};

export const saveRubric = async (
  assignmentName: string,
  generatedRubric: any,
  totalPoints: string,
  rubricNotes: string
): Promise<string> => {
  const response = await axios.post('/api/rubrics', {
    name: `AI Generated Rubric - ${assignmentName || 'Assignment'}`,
    criteria: generatedRubric.criteria,
    total_points: generatedRubric.total_points || totalPoints,
    description: `AI-generated rubric based on question paper${rubricNotes ? ` and notes: ${rubricNotes}` : ''}`,
  });

  if (response.data?.rubric?.id) {
    return response.data.rubric.id;
  } else {
    throw new Error('Failed to save rubric');
  }
};
