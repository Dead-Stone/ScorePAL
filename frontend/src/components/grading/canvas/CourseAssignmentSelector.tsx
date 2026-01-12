/**
 * Course and Assignment Selector Component
 */

import React from 'react';
import { Grid, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { Course, Assignment } from './types';

interface CourseAssignmentSelectorProps {
  courses: Course[];
  assignments: Assignment[];
  selectedCourseId: number | null;
  selectedAssignmentId: number | null;
  loading: boolean;
  loadingAssignments: boolean;
  onCourseChange: (courseId: number | null) => void;
  onAssignmentChange: (assignmentId: number | null) => void;
}

export const CourseAssignmentSelector: React.FC<CourseAssignmentSelectorProps> = ({
  courses,
  assignments,
  selectedCourseId,
  selectedAssignmentId,
  loading,
  loadingAssignments,
  onCourseChange,
  onAssignmentChange,
}) => {
  return (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel>Select Course</InputLabel>
          <Select
            value={selectedCourseId || ''}
            onChange={(e) => onCourseChange(e.target.value as number)}
            label="Select Course"
            disabled={loading}
          >
            {courses.map((course) => (
              <MenuItem key={course.id} value={course.id}>
                {course.course_code || course.name} - {course.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} md={6}>
        <FormControl fullWidth disabled={!selectedCourseId || loadingAssignments}>
          <InputLabel>Select Assignment</InputLabel>
          <Select
            value={selectedAssignmentId || ''}
            onChange={(e) => onAssignmentChange(e.target.value as number)}
            label="Select Assignment"
          >
            {assignments.map((assignment) => (
              <MenuItem key={assignment.id} value={assignment.id}>
                {assignment.name} ({assignment.points_possible} pts)
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
    </Grid>
  );
};
