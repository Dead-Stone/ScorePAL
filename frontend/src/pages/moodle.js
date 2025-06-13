import React, { useState } from 'react';
import {
  Container, Typography, TextField, Button, Box, MenuItem, Select, Card, CardContent, CircularProgress, Alert
} from '@mui/material';
import axios from 'axios';

export default function MoodleIntegration() {
  const [baseUrl, setBaseUrl] = useState('');
  const [token, setToken] = useState('');
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [gradeData, setGradeData] = useState({ userid: '', grade: '', textfeedback: '' });

  const apiData = { base_url: baseUrl, token };

  const fetchCourses = async () => {
    setLoading(true); setError('');
    try {
      const res = await axios.post('/api/moodle/courses', apiData);
      setCourses(res.data); setAssignments([]); setSubmissions([]);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const fetchAssignments = async () => {
    setLoading(true); setError('');
    try {
      const res = await axios.post('/api/moodle/assignments', { ...apiData, courseid: selectedCourse });
      setAssignments(res.data.courses[0]?.assignments || []);
      setSubmissions([]);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const fetchSubmissions = async () => {
    setLoading(true); setError('');
    try {
      const res = await axios.post('/api/moodle/submissions', { ...apiData, assignmentid: selectedAssignment });
      setSubmissions(res.data.assignments[0]?.submissions || []);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const handleGrade = async () => {
    setLoading(true); setError('');
    try {
      await axios.post('/api/moodle/grade', {
        ...apiData,
        assignmentid: selectedAssignment,
        userid: gradeData.userid,
        grade: gradeData.grade,
        textfeedback: gradeData.textfeedback
      });
      alert('Grade submitted!');
      fetchSubmissions();
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>Moodle Integration</Typography>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField label="Moodle Base URL" fullWidth value={baseUrl} onChange={e => setBaseUrl(e.target.value)} sx={{ mb: 2 }} />
          <TextField label="API Token" fullWidth value={token} onChange={e => setToken(e.target.value)} sx={{ mb: 2 }} />
          <Button variant="contained" onClick={fetchCourses} disabled={loading || !baseUrl || !token}>Connect & Fetch Courses</Button>
        </CardContent>
      </Card>
      {error && <Alert severity="error">{error}</Alert>}
      {loading && <CircularProgress />}
      {courses.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6">Select Course</Typography>
          <Select fullWidth value={selectedCourse} onChange={e => { setSelectedCourse(e.target.value); setAssignments([]); setSubmissions([]); }}>
            {courses.map(c => <MenuItem key={c.id} value={c.id}>{c.fullname}</MenuItem>)}
          </Select>
          <Button sx={{ mt: 2 }} variant="outlined" onClick={fetchAssignments} disabled={!selectedCourse}>Fetch Assignments</Button>
        </Box>
      )}
      {assignments.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6">Select Assignment</Typography>
          <Select fullWidth value={selectedAssignment} onChange={e => { setSelectedAssignment(e.target.value); setSubmissions([]); }}>
            {assignments.map(a => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
          </Select>
          <Button sx={{ mt: 2 }} variant="outlined" onClick={fetchSubmissions} disabled={!selectedAssignment}>Fetch Submissions</Button>
        </Box>
      )}
      {submissions.length > 0 && (
        <Box>
          <Typography variant="h6">Submissions</Typography>
          {submissions.map(sub => (
            <Card key={sub.userid} sx={{ mb: 2 }}>
              <CardContent>
                <Typography>User ID: {sub.userid}</Typography>
                <Typography>Status: {sub.status}</Typography>
                <TextField label="Grade" type="number" value={gradeData.userid === sub.userid ? gradeData.grade : ''} onChange={e => setGradeData({ ...gradeData, userid: sub.userid, grade: e.target.value })} sx={{ mr: 2 }} />
                <TextField label="Feedback" value={gradeData.userid === sub.userid ? gradeData.textfeedback : ''} onChange={e => setGradeData({ ...gradeData, userid: sub.userid, textfeedback: e.target.value })} sx={{ mr: 2 }} />
                <Button variant="contained" onClick={handleGrade} disabled={loading || gradeData.userid !== sub.userid}>Submit Grade</Button>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Container>
  );
} 