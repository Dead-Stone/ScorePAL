/**
 * Types for Single Grading Steps
 */

export interface SingleGradingData {
  studentName: string;
  assignmentName: string;
  questionPaper: File | null;
  submission: File | null;
  answerKey: File | null;
  rubricId: string;
  strictness: number;
  selectedModel?: any;
  generatedRubric?: any;
}
