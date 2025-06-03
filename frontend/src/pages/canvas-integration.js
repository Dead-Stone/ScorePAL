import { useState } from 'react';
import {
  Container, Typography, TextField, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress, InputAdornment, IconButton, Alert
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import axios from 'axios';

const COURSE_ID = '1589225';
const ASSIGNMENT_ID = '7133587';
const CANVAS_URL = `https://sjsu.instructure.com/api/v1/courses/${COURSE_ID}/assignments/${ASSIGNMENT_ID}/submissions`;

export default function CanvasIntegrationPage() {
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [grading, setGrading] = useState(false);
  const [graded, setGraded] = useState({});

  const fetchSubmissions = async () => {
    setLoading(true);
    setError(null);
    setSubmissions([]);
    try {
      const response = await axios.get(CANVAS_URL, {
        headers: {
          Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
        },
      });
      setSubmissions(Array.isArray(response.data) ? response.data : [response.data]);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch submissions');
    } finally {
      setLoading(false);
    }
  };

  // Placeholder grading function
  const gradeSubmission = async (submission) => {
    setGrading(true);
    setError(null);
    try {
      // Here you would call your grading API or logic
      // For now, just simulate grading
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setGraded((prev) => ({ ...prev, [submission.id]: 'Graded!' }));
    } catch (err) {
      setError('Failed to grade submission');
    } finally {
      setGrading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Canvas Integration (Demo)
      </Typography>
      <Typography variant="subtitle1" gutterBottom>
        Fetch and grade submissions from Canvas using the public API
      </Typography>
      <TextField
        label="Bearer Token"
        variant="outlined"
        fullWidth
        margin="normal"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        type={showToken ? 'text' : 'password'}
        helperText="Enter your Canvas Bearer token"
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label={showToken ? 'Hide token' : 'Show token'}
                onClick={() => setShowToken((show) => !show)}
                edge="end"
              >
                {showToken ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      <Button
        variant="contained"
        color="primary"
        onClick={fetchSubmissions}
        disabled={loading || !token}
        sx={{ mt: 2, mb: 2 }}
      >
        {loading ? <CircularProgress size={24} /> : 'Fetch Submissions'}
      </Button>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {submissions.length > 0 && (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>User ID</TableCell>
                <TableCell>Score</TableCell>
                <TableCell>Grade</TableCell>
                <TableCell>Submitted At</TableCell>
                <TableCell>State</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {submissions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell>{sub.id}</TableCell>
                  <TableCell>{sub.user_id}</TableCell>
                  <TableCell>{sub.score}</TableCell>
                  <TableCell>{sub.grade}</TableCell>
                  <TableCell>{sub.submitted_at}</TableCell>
                  <TableCell>{sub.workflow_state}</TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => gradeSubmission(sub)}
                      disabled={grading || graded[sub.id]}
                    >
                      {graded[sub.id] ? 'Graded' : 'Grade'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
} 