/**
 * ImmediateResultsView - Shows grading results immediately after grading
 * Results are displayed but not saved until user explicitly saves
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  LinearProgress,
  IconButton,
  Collapse,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  Save as SaveIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
  ContentCopy as ContentCopyIcon,
  Grade as GradeIcon,
  CloudUpload as CloudUploadIcon,
} from '@mui/icons-material';
import apiClient from '@/utils/apiClient';

interface CriterionScore {
  name: string;
  points: number;
  max_points: number;
  feedback: string;
}

interface GradingResult {
  id?: string;
  student_name: string;
  assignment_name: string;
  score: number;
  total_points: number;
  percentage: number;
  grade_letter: string;
  overall_feedback: string;
  criteria_scores: CriterionScore[];
  mistakes?: Record<string, any>;
  ai_model_used?: string;
  graded_at?: string;
  is_saved?: boolean;
}

interface ImmediateResultsViewProps {
  result: GradingResult;
  onSave?: (result: GradingResult) => Promise<void>;
  onDiscard?: () => void;
  onRegrade?: () => void;
  onPostToCanvas?: (result: GradingResult) => Promise<void>;
  canvasEnabled?: boolean;
}

export const ImmediateResultsView: React.FC<ImmediateResultsViewProps> = ({
  result,
  onSave,
  onDiscard,
  onRegrade,
  onPostToCanvas,
  canvasEnabled = false,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [saved, setSaved] = useState(result.is_saved || false);
  const [expandedCriteria, setExpandedCriteria] = useState<string[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editedResult, setEditedResult] = useState<GradingResult>(result);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const getScoreColor = (percentage: number): 'success' | 'warning' | 'error' => {
    if (percentage >= 70) return 'success';
    if (percentage >= 50) return 'warning';
    return 'error';
  };

  const getGradeColor = (grade: string): string => {
    const gradeColors: Record<string, string> = {
      'A+': '#2e7d32', 'A': '#388e3c', 'A-': '#43a047',
      'B+': '#1976d2', 'B': '#1e88e5', 'B-': '#42a5f5',
      'C+': '#f9a825', 'C': '#fbc02d', 'C-': '#fdd835',
      'D+': '#ef6c00', 'D': '#f57c00', 'D-': '#fb8c00',
      'F': '#c62828',
    };
    return gradeColors[grade] || '#757575';
  };

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave(editedResult);
      setSaved(true);
      setNotification({ type: 'success', message: 'Results saved successfully!' });
    } catch (err) {
      setNotification({ type: 'error', message: 'Failed to save results' });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePostToCanvas = async () => {
    if (!onPostToCanvas) return;
    setIsPosting(true);
    try {
      await onPostToCanvas(editedResult);
      setNotification({ type: 'success', message: 'Grade posted to Canvas!' });
    } catch (err) {
      setNotification({ type: 'error', message: 'Failed to post to Canvas' });
    } finally {
      setIsPosting(false);
    }
  };

  const toggleCriteria = (name: string) => {
    setExpandedCriteria(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const downloadResults = () => {
    const dataStr = JSON.stringify(editedResult, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grading_result_${editedResult.student_name}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleEditScore = (criterionIndex: number, newScore: number) => {
    const updatedCriteria = [...editedResult.criteria_scores];
    updatedCriteria[criterionIndex] = {
      ...updatedCriteria[criterionIndex],
      points: newScore,
    };
    
    const newTotal = updatedCriteria.reduce((sum, c) => sum + c.points, 0);
    const maxTotal = updatedCriteria.reduce((sum, c) => sum + c.max_points, 0);
    const newPercentage = (newTotal / maxTotal) * 100;
    
    setEditedResult({
      ...editedResult,
      criteria_scores: updatedCriteria,
      score: newTotal,
      percentage: newPercentage,
      grade_letter: calculateGrade(newPercentage),
    });
    setSaved(false);
  };

  const calculateGrade = (percentage: number): string => {
    if (percentage >= 97) return 'A+';
    if (percentage >= 93) return 'A';
    if (percentage >= 90) return 'A-';
    if (percentage >= 87) return 'B+';
    if (percentage >= 83) return 'B';
    if (percentage >= 80) return 'B-';
    if (percentage >= 77) return 'C+';
    if (percentage >= 73) return 'C';
    if (percentage >= 70) return 'C-';
    if (percentage >= 67) return 'D+';
    if (percentage >= 63) return 'D';
    if (percentage >= 60) return 'D-';
    return 'F';
  };

  return (
    <Box>
      {/* Unsaved Warning Banner */}
      {!saved && (
        <Alert 
          severity="warning" 
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <CircularProgress size={20} /> : 'Save Now'}
            </Button>
          }
        >
          <Typography variant="body2">
            <strong>Unsaved Results</strong> - These results are not yet saved. Click "Save Results" to preserve them.
          </Typography>
        </Alert>
      )}

      {notification && (
        <Alert 
          severity={notification.type} 
          sx={{ mb: 3 }}
          onClose={() => setNotification(null)}
        >
          {notification.message}
        </Alert>
      )}

      {/* Score Overview Card */}
      <Card 
        sx={{ 
          mb: 3, 
          background: `linear-gradient(135deg, ${getGradeColor(editedResult.grade_letter)}15 0%, ${getGradeColor(editedResult.grade_letter)}05 100%)`,
          border: `2px solid ${getGradeColor(editedResult.grade_letter)}30`,
        }}
      >
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={3}>
              <Box textAlign="center">
                <Box
                  sx={{
                    width: 100,
                    height: 100,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: getGradeColor(editedResult.grade_letter),
                    color: 'white',
                    mx: 'auto',
                    mb: 1,
                    fontSize: '2.5rem',
                    fontWeight: 'bold',
                  }}
                >
                  {editedResult.grade_letter}
                </Box>
                <Typography variant="h4" fontWeight="bold">
                  {editedResult.percentage.toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {editedResult.score}/{editedResult.total_points} points
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                {editedResult.student_name}
              </Typography>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                {editedResult.assignment_name}
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap" mt={2}>
                <Chip
                  icon={<GradeIcon />}
                  label={`Score: ${editedResult.score}/${editedResult.total_points}`}
                  color={getScoreColor(editedResult.percentage)}
                  variant="outlined"
                />
                {editedResult.ai_model_used && (
                  <Chip
                    label={`AI: ${editedResult.ai_model_used}`}
                    size="small"
                    variant="outlined"
                  />
                )}
                {!saved && (
                  <Chip
                    icon={<WarningIcon />}
                    label="Unsaved"
                    color="warning"
                    size="small"
                  />
                )}
                {saved && (
                  <Chip
                    icon={<CheckCircleIcon />}
                    label="Saved"
                    color="success"
                    size="small"
                  />
                )}
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box display="flex" flexDirection="column" gap={1}>
                <Button
                  variant="contained"
                  startIcon={isSaving ? <CircularProgress size={20} /> : <SaveIcon />}
                  onClick={handleSave}
                  disabled={isSaving || saved}
                  fullWidth
                  color={saved ? 'success' : 'primary'}
                >
                  {saved ? 'Saved' : 'Save Results'}
                </Button>
                {canvasEnabled && (
                  <Button
                    variant="outlined"
                    startIcon={isPosting ? <CircularProgress size={20} /> : <CloudUploadIcon />}
                    onClick={handlePostToCanvas}
                    disabled={isPosting || !saved}
                    fullWidth
                  >
                    Post to Canvas
                  </Button>
                )}
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={downloadResults}
                  fullWidth
                >
                  Download
                </Button>
                {onRegrade && (
                  <Button
                    variant="text"
                    startIcon={<RefreshIcon />}
                    onClick={onRegrade}
                    fullWidth
                  >
                    Re-grade
                  </Button>
                )}
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Rubric Breakdown */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight="bold">
              Rubric Breakdown
            </Typography>
            <Tooltip title="Edit scores">
              <IconButton onClick={() => setEditDialogOpen(true)}>
                <EditIcon />
              </IconButton>
            </Tooltip>
          </Box>
          
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Criterion</strong></TableCell>
                  <TableCell align="center"><strong>Score</strong></TableCell>
                  <TableCell align="center"><strong>Max</strong></TableCell>
                  <TableCell align="center"><strong>%</strong></TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {editedResult.criteria_scores.map((criterion, index) => {
                  const pct = (criterion.points / criterion.max_points) * 100;
                  return (
                    <React.Fragment key={criterion.name}>
                      <TableRow 
                        hover 
                        sx={{ cursor: 'pointer' }}
                        onClick={() => toggleCriteria(criterion.name)}
                      >
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            {pct >= 70 ? (
                              <CheckCircleIcon fontSize="small" color="success" />
                            ) : pct >= 50 ? (
                              <WarningIcon fontSize="small" color="warning" />
                            ) : (
                              <ErrorIcon fontSize="small" color="error" />
                            )}
                            {criterion.name}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={criterion.points.toFixed(1)}
                            size="small"
                            color={getScoreColor(pct)}
                          />
                        </TableCell>
                        <TableCell align="center">{criterion.max_points}</TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={pct}
                              sx={{ width: 60, height: 8, borderRadius: 1 }}
                              color={getScoreColor(pct)}
                            />
                            <Typography variant="body2">{pct.toFixed(0)}%</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <IconButton size="small">
                            {expandedCriteria.includes(criterion.name) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={5} sx={{ py: 0 }}>
                          <Collapse in={expandedCriteria.includes(criterion.name)}>
                            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, my: 1 }}>
                              <Typography variant="subtitle2" gutterBottom>Feedback:</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {criterion.feedback || 'No specific feedback provided.'}
                              </Typography>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Overall Feedback */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Overall Feedback
          </Typography>
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 2, 
              bgcolor: 'grey.50',
              whiteSpace: 'pre-wrap',
            }}
          >
            <Typography variant="body1">
              {editedResult.overall_feedback || 'No overall feedback provided.'}
            </Typography>
          </Paper>
          <Box display="flex" justifyContent="flex-end" mt={2}>
            <Tooltip title="Copy feedback">
              <IconButton
                onClick={() => {
                  navigator.clipboard.writeText(editedResult.overall_feedback);
                  setNotification({ type: 'info', message: 'Feedback copied to clipboard' });
                }}
              >
                <ContentCopyIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mt={3}>
        <Button
          variant="outlined"
          color="error"
          onClick={onDiscard}
        >
          Discard Results
        </Button>
        <Box display="flex" gap={2}>
          {!saved && (
            <Button
              variant="contained"
              startIcon={isSaving ? <CircularProgress size={20} /> : <SaveIcon />}
              onClick={handleSave}
              disabled={isSaving}
            >
              Save Results
            </Button>
          )}
        </Box>
      </Box>

      {/* Edit Scores Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Scores</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Adjust individual criterion scores. Changes will update the overall grade automatically.
          </Typography>
          <Grid container spacing={2}>
            {editedResult.criteria_scores.map((criterion, index) => (
              <Grid item xs={12} sm={6} key={criterion.name}>
                <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    {criterion.name}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={2}>
                    <TextField
                      type="number"
                      size="small"
                      value={criterion.points}
                      onChange={(e) => handleEditScore(index, parseFloat(e.target.value) || 0)}
                      inputProps={{ min: 0, max: criterion.max_points, step: 0.5 }}
                      sx={{ width: 100 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      / {criterion.max_points}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(criterion.points / criterion.max_points) * 100}
                      sx={{ flex: 1, height: 8, borderRadius: 1 }}
                      color={getScoreColor((criterion.points / criterion.max_points) * 100)}
                    />
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
          <Box sx={{ mt: 3, p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
            <Typography variant="subtitle1">
              New Total: <strong>{editedResult.score.toFixed(1)}/{editedResult.total_points}</strong> ({editedResult.percentage.toFixed(1)}%)
            </Typography>
            <Typography variant="subtitle1">
              New Grade: <strong style={{ color: getGradeColor(editedResult.grade_letter) }}>{editedResult.grade_letter}</strong>
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Close</Button>
          <Button 
            variant="contained" 
            onClick={() => {
              setEditDialogOpen(false);
              setSaved(false);
            }}
          >
            Apply Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ImmediateResultsView;


