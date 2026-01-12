/**
 * Grader Dashboard Header Component
 */

import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  FormControlLabel,
  Switch,
  Typography,
  Alert,
} from '@mui/material';
import {
  Person as PersonIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { Course } from './types';

interface GraderDashboardHeaderProps {
  courses: Course[];
  selectedCourseId: number | null;
  showStudentView: boolean;
  error: string | null;
  onCourseChange: (courseId: number | null) => void;
  onRefresh: () => void;
  onStudentViewToggle: (checked: boolean) => void;
  onErrorDismiss: () => void;
}

export const GraderDashboardHeader: React.FC<GraderDashboardHeaderProps> = ({
  courses,
  selectedCourseId,
  showStudentView,
  error,
  onCourseChange,
  onRefresh,
  onStudentViewToggle,
  onErrorDismiss,
}) => {
  return (
    <>
      <Box display="flex" justifyContent="flex-end" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box display="flex" alignItems="center" gap={2}>
          {courses.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Select Course</InputLabel>
              <Select
                value={selectedCourseId || ''}
                onChange={(e) => onCourseChange(e.target.value as number)}
                label="Select Course"
              >
                <MenuItem value={null}>All Courses</MenuItem>
                {courses.map((course) => (
                  <MenuItem key={course.id} value={course.id}>
                    {course.course_code} - {course.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <Button
            variant="outlined"
            size="small"
            onClick={onRefresh}
            startIcon={<RefreshIcon />}
          >
            Refresh
          </Button>
          <FormControlLabel
            control={
              <Switch
                checked={showStudentView}
                onChange={(e) => onStudentViewToggle(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <PersonIcon fontSize="small" />
                <Typography variant="body2">Student View</Typography>
              </Box>
            }
          />
        </Box>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 3 }} onClose={onErrorDismiss}>
          {error}
        </Alert>
      )}
    </>
  );
};
