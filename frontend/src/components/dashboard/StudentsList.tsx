/**
 * StudentsList - Component for displaying list of students in a course
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 */

import React, { useState, useEffect, useTransition } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  InputAdornment,
  Box,
  Typography,
  Avatar,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import GroupIcon from '@mui/icons-material/Group';
import apiClient from '@/utils/apiClient';
import { StudentGradesDetail } from './StudentGradesDetail';

interface Student {
  id: number;
  name: string;
  email?: string;
  avatar_url?: string;
  total_points?: number;
  total_possible?: number;
  overall_percentage?: number;
  submissions_count?: number;
  graded_count?: number;
  assignments?: Array<{
    assignment_id: number;
    assignment_name: string;
    score: number;
    points_possible: number;
    percentage: number;
    grade: string;
  }>;
}

interface StudentsListProps {
  courseId: number;
}

export const StudentsList: React.FC<StudentsListProps> = ({ courseId }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'divisions'>('list');
  const [selectedStudent, setSelectedStudent] = useState<{ id: number; name: string } | null>(null);
  const [gradesDialogOpen, setGradesDialogOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !courseId) return;
    
    startTransition(() => {
      fetchStudents();
    });
  }, [courseId, mounted]);

  const fetchStudents = async () => {
    if (!mounted) return;
    
    try {
      startTransition(() => {
        setLoading(true);
        setError(null);
      });
      
      const response = await apiClient.get(`/api/settings/canvas/data/courses/${courseId}/students?include_performance=true`);
      
      if (response.data?.students) {
        startTransition(() => {
          setStudents(response.data.students);
        });
      }
    } catch (err: any) {
      console.error('Error fetching students:', err);
      startTransition(() => {
        setError(err.response?.data?.detail || 'Failed to load students');
      });
    } finally {
      startTransition(() => {
        setLoading(false);
      });
    }
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getGradeColor = (percentage?: number) => {
    if (!percentage) return 'default';
    if (percentage >= 90) return 'success';
    if (percentage >= 80) return 'info';
    if (percentage >= 70) return 'warning';
    return 'error';
  };

  const getGradeDivision = (percentage?: number): string => {
    if (!percentage && percentage !== 0) return 'Ungraded';
    if (percentage >= 90) return 'A (90-100%)';
    if (percentage >= 80) return 'B (80-89%)';
    if (percentage >= 70) return 'C (70-79%)';
    if (percentage >= 60) return 'D (60-69%)';
    return 'F (Below 60%)';
  };

  const getDivisionColor = (division: string) => {
    if (division.startsWith('A')) return 'success';
    if (division.startsWith('B')) return 'info';
    if (division.startsWith('C')) return 'warning';
    if (division.startsWith('D')) return 'error';
    if (division.startsWith('F')) return 'error';
    return 'default';
  };

  // Group students by performance division
  const studentsByDivision = React.useMemo(() => {
    const divisions: Record<string, Student[]> = {
      'A (90-100%)': [],
      'B (80-89%)': [],
      'C (70-79%)': [],
      'D (60-69%)': [],
      'F (Below 60%)': [],
      'Ungraded': [],
    };

    filteredStudents.forEach((student) => {
      const division = getGradeDivision(student.overall_percentage);
      if (divisions[division]) {
        divisions[division].push(student);
      } else {
        divisions['Ungraded'].push(student);
      }
    });

    return divisions;
  }, [filteredStudents]);

  const handleViewDetails = (student: Student) => {
    setSelectedStudent({ id: student.id, name: student.name });
    setGradesDialogOpen(true);
  };

  if (!mounted || loading || isPending) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <>
      <Card>
        <CardHeader
          title={`Students (${students.length})`}
          action={
            <Box display="flex" gap={2} alignItems="center">
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>View Mode</InputLabel>
                <Select
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value as 'list' | 'divisions')}
                  label="View Mode"
                >
                  <MenuItem value="list">List View</MenuItem>
                  <MenuItem value="divisions">By Division</MenuItem>
                </Select>
              </FormControl>
              <TextField
                size="small"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ width: 250 }}
              />
            </Box>
          }
        />
        <CardContent>
          {viewMode === 'list' ? (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Student</TableCell>
                    <TableCell align="right">Total Points</TableCell>
                    <TableCell align="right">Overall %</TableCell>
                    <TableCell align="right">Division</TableCell>
                    <TableCell align="right">Assignments</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                          {searchTerm ? 'No students match your search' : 'No students found'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map((student) => (
                      <TableRow key={student.id} hover>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={2}>
                            <Avatar
                              src={student.avatar_url}
                              alt={student.name}
                              sx={{ width: 32, height: 32 }}
                            >
                              {student.name.charAt(0).toUpperCase()}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {student.name}
                              </Typography>
                              {student.email && (
                                <Typography variant="caption" color="text.secondary">
                                  {student.email}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          {(() => {
                            if (student.total_points == null || student.total_possible == null) {
                              return 'N/A';
                            }
                            // Check if total_points is actually a percentage (when it's <= 100 and total_possible is much larger)
                            // If so, calculate actual points from percentage
                            let actualPoints = student.total_points;
                            if (student.total_points <= 100 && student.total_possible > 100 && student.overall_percentage != null) {
                              // total_points appears to be a percentage, calculate from overall_percentage
                              actualPoints = (student.overall_percentage / 100) * student.total_possible;
                            }
                            return `${actualPoints.toFixed(1)} / ${student.total_possible.toFixed(0)}`;
                          })()}
                        </TableCell>
                        <TableCell align="right">
                          {student.overall_percentage != null && typeof student.overall_percentage === 'number' ? (
                            <Chip
                              label={`${student.overall_percentage.toFixed(1)}%`}
                              color={getGradeColor(student.overall_percentage) as any}
                              size="small"
                            />
                          ) : (
                            'N/A'
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={getGradeDivision(student.overall_percentage)}
                            color={getDivisionColor(getGradeDivision(student.overall_percentage)) as any}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">
                          {student.graded_count != null && student.submissions_count != null
                            ? `${student.graded_count} / ${student.submissions_count}`
                            : 'N/A'}
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="View Detailed Grades">
                            <IconButton
                              size="small"
                              onClick={() => handleViewDetails(student)}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box>
              {Object.entries(studentsByDivision).map(([division, divisionStudents]) => {
                if (divisionStudents.length === 0) return null;
                return (
                  <Box key={division} sx={{ mb: 3 }}>
                    <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box display="flex" alignItems="center" gap={1}>
                          <GroupIcon />
                          <Typography variant="h6">
                            {division}
                          </Typography>
                          <Chip
                            label={`${divisionStudents.length} student${divisionStudents.length !== 1 ? 's' : ''}`}
                            size="small"
                            color={getDivisionColor(division) as any}
                          />
                        </Box>
                      </Box>
                    </Paper>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Student</TableCell>
                            <TableCell align="right">Total Points</TableCell>
                            <TableCell align="right">Overall %</TableCell>
                            <TableCell align="right">Assignments</TableCell>
                            <TableCell align="center">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {divisionStudents.map((student) => (
                            <TableRow key={student.id} hover>
                              <TableCell>
                                <Box display="flex" alignItems="center" gap={2}>
                                  <Avatar
                                    src={student.avatar_url}
                                    alt={student.name}
                                    sx={{ width: 28, height: 28 }}
                                  >
                                    {student.name.charAt(0).toUpperCase()}
                                  </Avatar>
                                  <Box>
                                    <Typography variant="body2" fontWeight="medium">
                                      {student.name}
                                    </Typography>
                                    {student.email && (
                                      <Typography variant="caption" color="text.secondary">
                                        {student.email}
                                      </Typography>
                                    )}
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell align="right">
                                {(() => {
                                  if (student.total_points == null || student.total_possible == null) {
                                    return 'N/A';
                                  }
                                  // Check if total_points is actually a percentage (when it's <= 100 and total_possible is much larger)
                                  // If so, calculate actual points from percentage
                                  let actualPoints = student.total_points;
                                  if (student.total_points <= 100 && student.total_possible > 100 && student.overall_percentage != null) {
                                    // total_points appears to be a percentage, calculate from overall_percentage
                                    actualPoints = (student.overall_percentage / 100) * student.total_possible;
                                  }
                                  return `${actualPoints.toFixed(1)} / ${student.total_possible.toFixed(0)}`;
                                })()}
                              </TableCell>
                              <TableCell align="right">
                                {student.overall_percentage != null && typeof student.overall_percentage === 'number' ? (
                                  <Chip
                                    label={`${student.overall_percentage.toFixed(1)}%`}
                                    color={getGradeColor(student.overall_percentage) as any}
                                    size="small"
                                  />
                                ) : (
                                  'N/A'
                                )}
                              </TableCell>
                              <TableCell align="right">
                                {student.graded_count != null && student.submissions_count != null
                                  ? `${student.graded_count} / ${student.submissions_count}`
                                  : 'N/A'}
                              </TableCell>
                              <TableCell align="center">
                                <Tooltip title="View Detailed Grades">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleViewDetails(student)}
                                  >
                                    <VisibilityIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                );
              })}
            </Box>
          )}
        </CardContent>
      </Card>

      {selectedStudent && (
        <StudentGradesDetail
          open={gradesDialogOpen}
          onClose={() => {
            setGradesDialogOpen(false);
            setSelectedStudent(null);
          }}
          courseId={courseId}
          studentId={selectedStudent.id}
          studentName={selectedStudent.name}
        />
      )}
    </>
  );
};

