/**
 * Course and Assignment Selector Component - Enhanced with access status indicators
 */

import React from 'react';
import {
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import LockIcon from '@mui/icons-material/Lock';
import SchoolIcon from '@mui/icons-material/School';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { Course, Assignment, CourseWithAccess, AssignmentWithAccess, ApiError } from './types';

interface CourseAssignmentSelectorProps {
  courses: (Course | CourseWithAccess)[];
  assignments: (Assignment | AssignmentWithAccess)[];
  selectedCourseId: number | null;
  selectedAssignmentId: number | null;
  loading: boolean;
  loadingAssignments: boolean;
  onCourseChange: (courseId: number | null) => void;
  onAssignmentChange: (assignmentId: number | null) => void;
  courseError?: ApiError | null;
  assignmentError?: ApiError | null;
}

const isAccessible = (item: Course | CourseWithAccess | Assignment | AssignmentWithAccess): boolean => {
  return 'accessible' in item ? item.accessible !== false : true;
};

const hasPartialAccess = (item: Course | CourseWithAccess | Assignment | AssignmentWithAccess): boolean => {
  return 'partialAccess' in item ? item.partialAccess === true : false;
};

export const CourseAssignmentSelector: React.FC<CourseAssignmentSelectorProps> = ({
  courses,
  assignments,
  selectedCourseId,
  selectedAssignmentId,
  loading,
  loadingAssignments,
  onCourseChange,
  onAssignmentChange,
  courseError,
  assignmentError,
}) => {
  const accessibleCourses = courses.filter(isAccessible);
  const restrictedCourses = courses.filter(c => !isAccessible(c));
  const accessibleAssignments = assignments.filter(isAccessible);

  return (
    <Box>
      {/* Error Alerts */}
      {courseError && (
        <Alert 
          severity={courseError.type === 'access_denied' ? 'warning' : 'error'} 
          sx={{ mb: 2 }}
          icon={courseError.type === 'access_denied' ? <LockIcon /> : undefined}
        >
          <Typography variant="body2" fontWeight="medium">
            {courseError.message}
          </Typography>
          {courseError.details && (
            <Typography variant="caption" color="text.secondary">
              {courseError.details}
            </Typography>
          )}
        </Alert>
      )}

      {assignmentError && (
        <Alert 
          severity={assignmentError.type === 'access_denied' ? 'warning' : 'error'} 
          sx={{ mb: 2 }}
          icon={assignmentError.type === 'access_denied' ? <LockIcon /> : undefined}
        >
          <Typography variant="body2" fontWeight="medium">
            {assignmentError.message}
          </Typography>
          {assignmentError.details && (
            <Typography variant="caption" color="text.secondary">
              {assignmentError.details}
            </Typography>
          )}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 2 }}>
        {/* Course Selector */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>
              <Box display="flex" alignItems="center" gap={1}>
                <SchoolIcon fontSize="small" />
                Select Course
              </Box>
            </InputLabel>
            <Select
              value={selectedCourseId || ''}
              onChange={(e) => onCourseChange(e.target.value as number || null)}
              label="Select Course"
              disabled={loading || courses.length === 0}
              renderValue={(value) => {
                const course = courses.find(c => c.id === value);
                if (!course) return '';
                return (
                  <Box display="flex" alignItems="center" gap={1}>
                    {isAccessible(course) ? (
                      <CheckCircleIcon fontSize="small" color="success" />
                    ) : (
                      <LockIcon fontSize="small" color="warning" />
                    )}
                    {course.course_code || course.name}
                  </Box>
                );
              }}
            >
              {/* Accessible Courses */}
              {accessibleCourses.length > 0 && (
                <MenuItem disabled sx={{ opacity: 0.7, fontWeight: 'bold' }}>
                  <CheckCircleIcon fontSize="small" color="success" sx={{ mr: 1 }} />
                  Available Courses ({accessibleCourses.length})
                </MenuItem>
              )}
              {accessibleCourses.map((course) => (
                <MenuItem key={course.id} value={course.id}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {course.course_code || course.name}
                      </Typography>
                      {course.course_code && (
                        <Typography variant="caption" color="text.secondary">
                          {course.name}
                        </Typography>
                      )}
                    </Box>
                    {hasPartialAccess(course) && (
                      <Tooltip title="Partial access - some data may be restricted">
                        <WarningIcon fontSize="small" color="warning" />
                      </Tooltip>
                    )}
                  </Box>
                </MenuItem>
              ))}

              {/* Restricted Courses */}
              {restrictedCourses.length > 0 && (
                <>
                  <MenuItem disabled sx={{ opacity: 0.7, fontWeight: 'bold', mt: 1 }}>
                    <LockIcon fontSize="small" color="warning" sx={{ mr: 1 }} />
                    Restricted Courses ({restrictedCourses.length})
                  </MenuItem>
                  {restrictedCourses.map((course) => (
                    <MenuItem key={course.id} value={course.id} disabled>
                      <Box display="flex" alignItems="center" gap={1} sx={{ opacity: 0.6 }}>
                        <LockIcon fontSize="small" color="warning" />
                        <Box>
                          <Typography variant="body2">
                            {course.course_code || course.name}
                          </Typography>
                          <Typography variant="caption" color="error">
                            {'accessError' in course ? course.accessError : 'Access denied'}
                          </Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </>
              )}
            </Select>
          </FormControl>
          {loading && <LinearProgress sx={{ mt: 0.5, borderRadius: 1 }} />}
        </Grid>

        {/* Assignment Selector */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth disabled={!selectedCourseId || loadingAssignments}>
            <InputLabel>
              <Box display="flex" alignItems="center" gap={1}>
                <AssignmentIcon fontSize="small" />
                Select Assignment
              </Box>
            </InputLabel>
            <Select
              value={selectedAssignmentId || ''}
              onChange={(e) => onAssignmentChange(e.target.value as number || null)}
              label="Select Assignment"
              renderValue={(value) => {
                const assignment = assignments.find(a => a.id === value);
                if (!assignment) return '';
                return (
                  <Box display="flex" alignItems="center" gap={1}>
                    {isAccessible(assignment) ? (
                      <CheckCircleIcon fontSize="small" color="success" />
                    ) : (
                      <LockIcon fontSize="small" color="warning" />
                    )}
                    {assignment.name}
                  </Box>
                );
              }}
            >
              {loadingAssignments && (
                <MenuItem disabled>
                  <Box display="flex" alignItems="center" gap={2}>
                    <CircularProgress size={20} />
                    <Typography variant="body2">Loading assignments...</Typography>
                  </Box>
                </MenuItem>
              )}
              {!loadingAssignments && assignments.length === 0 && selectedCourseId && (
                <MenuItem disabled>
                  <Typography variant="body2" color="text.secondary">
                    No assignments found
                  </Typography>
                </MenuItem>
              )}
              {accessibleAssignments.map((assignment) => (
                <MenuItem key={assignment.id} value={assignment.id}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {assignment.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {assignment.points_possible} pts
                        {assignment.due_at && ` • Due: ${new Date(assignment.due_at).toLocaleDateString()}`}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      {assignment.published ? (
                        <Chip label="Published" size="small" color="success" variant="outlined" />
                      ) : (
                        <Chip label="Draft" size="small" variant="outlined" />
                      )}
                    </Box>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {loadingAssignments && <LinearProgress sx={{ mt: 0.5, borderRadius: 1 }} />}
        </Grid>
      </Grid>

      {/* Status Summary */}
      <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
        {courses.length > 0 && (
          <Chip
            icon={<SchoolIcon />}
            label={`${accessibleCourses.length} of ${courses.length} courses available`}
            size="small"
            color={restrictedCourses.length > 0 ? 'warning' : 'success'}
            variant="outlined"
          />
        )}
        {selectedCourseId && assignments.length > 0 && (
          <Chip
            icon={<AssignmentIcon />}
            label={`${accessibleAssignments.length} assignments`}
            size="small"
            color="primary"
            variant="outlined"
          />
        )}
      </Box>
    </Box>
  );
};
