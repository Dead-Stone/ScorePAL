/**
 * Submissions Table Component
 */

import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Chip,
  LinearProgress,
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { Submission } from './types';

interface SubmissionsTableProps {
  submissions: Submission[];
  selectedSubmissions: number[];
  loadingSubmissions: boolean;
  syncing: boolean;
  syncJobId: string | null;
  onToggleSubmission: (userId: number) => void;
  onToggleAll: () => void;
  onSync: () => void;
}

export const SubmissionsTable: React.FC<SubmissionsTableProps> = ({
  submissions,
  selectedSubmissions,
  loadingSubmissions,
  syncing,
  syncJobId,
  onToggleSubmission,
  onToggleAll,
  onSync,
}) => {
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Submissions</Typography>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={onSync}
              disabled={syncing}
            >
              {syncing ? 'Syncing...' : 'Sync Submissions'}
            </Button>
          </Box>
        </Box>

        {loadingSubmissions ? (
          <LinearProgress />
        ) : submissions.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedSubmissions.length === submissions.length && submissions.length > 0}
                      indeterminate={selectedSubmissions.length > 0 && selectedSubmissions.length < submissions.length}
                      onChange={onToggleAll}
                    />
                  </TableCell>
                  <TableCell>Student</TableCell>
                  <TableCell>Submitted</TableCell>
                  <TableCell align="right">Score</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow key={submission.user_id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedSubmissions.includes(submission.user_id)}
                        onChange={() => onToggleSubmission(submission.user_id)}
                      />
                    </TableCell>
                    <TableCell>{submission.user_name}</TableCell>
                    <TableCell>
                      {submission.submitted_at
                        ? new Date(submission.submitted_at).toLocaleDateString()
                        : 'Not submitted'}
                    </TableCell>
                    <TableCell align="right">
                      {submission.score !== null ? `${submission.score}` : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={submission.workflow_state}
                        size="small"
                        color={
                          submission.workflow_state === 'graded'
                            ? 'success'
                            : submission.workflow_state === 'submitted'
                            ? 'info'
                            : 'default'
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
            {syncJobId
              ? 'No submissions found. Click "Sync Submissions" to download submission data.'
              : 'Click "Sync Submissions" to fetch submission data from Canvas.'}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};
