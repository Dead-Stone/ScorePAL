/**
 * Reusable Assignment Table Component for Analytics
 */

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Chip,
  Link as MuiLink,
  Typography,
} from '@mui/material';
import { Card, CardContent, CardHeader } from '@mui/material';

interface Assignment {
  assignment_id: string;
  name: string;
  course_name?: string;
  submissions_count: number;
  average_score?: number;
  average_percentage?: number;
  pass_rate?: number;
  status?: string;
}

interface AssignmentTableProps {
  title?: string;
  assignments: Assignment[];
  onAssignmentClick?: (assignmentId: string) => void;
  showCourse?: boolean;
  showStatus?: boolean;
  detailLinkPath?: string;
}

type SortField = 'name' | 'submissions_count' | 'average_percentage' | 'pass_rate';
type SortDirection = 'asc' | 'desc';

export const AssignmentTable: React.FC<AssignmentTableProps> = ({
  title = 'Assignments',
  assignments,
  onAssignmentClick,
  showCourse = true,
  showStatus = true,
  detailLinkPath
}) => {
  const [sortField, setSortField] = React.useState<SortField>('name');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedAssignments = [...assignments].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    if (sortField === 'name') {
      aValue = aValue?.toLowerCase() || '';
      bValue = bValue?.toLowerCase() || '';
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <Card>
      {title && <CardHeader title={title} />}
      <CardContent>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={sortField === 'name'}
                    direction={sortField === 'name' ? sortDirection : 'asc'}
                    onClick={() => handleSort('name')}
                  >
                    <strong>Assignment Name</strong>
                  </TableSortLabel>
                </TableCell>
                {showCourse && (
                  <TableCell><strong>Course</strong></TableCell>
                )}
                <TableCell align="right">
                  <TableSortLabel
                    active={sortField === 'submissions_count'}
                    direction={sortField === 'submissions_count' ? sortDirection : 'asc'}
                    onClick={() => handleSort('submissions_count')}
                  >
                    <strong>Submissions</strong>
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={sortField === 'average_percentage'}
                    direction={sortField === 'average_percentage' ? sortDirection : 'asc'}
                    onClick={() => handleSort('average_percentage')}
                  >
                    <strong>Avg Score</strong>
                  </TableSortLabel>
                </TableCell>
                {sortField === 'pass_rate' && (
                  <TableCell align="right">
                    <TableSortLabel
                      active={sortField === 'pass_rate'}
                      direction={sortDirection}
                      onClick={() => handleSort('pass_rate')}
                    >
                      <strong>Pass Rate</strong>
                    </TableSortLabel>
                  </TableCell>
                )}
                {showStatus && (
                  <TableCell><strong>Status</strong></TableCell>
                )}
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedAssignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showCourse && showStatus ? 7 : 5} align="center">
                    <Typography color="text.secondary">No assignments found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                sortedAssignments.map((assignment) => (
                  <TableRow key={assignment.assignment_id} hover>
                    <TableCell>{assignment.name}</TableCell>
                    {showCourse && (
                      <TableCell>{assignment.course_name || 'Uncategorized'}</TableCell>
                    )}
                    <TableCell align="right">{assignment.submissions_count}</TableCell>
                    <TableCell align="right">
                      {assignment.average_percentage?.toFixed(1) || assignment.average_score?.toFixed(1) || '0'}%
                    </TableCell>
                    {assignment.pass_rate !== undefined && (
                      <TableCell align="right">
                        {assignment.pass_rate.toFixed(1)}%
                      </TableCell>
                    )}
                    {showStatus && assignment.status && (
                      <TableCell>
                        <Chip
                          label={assignment.status}
                          size="small"
                          color={
                            assignment.status === 'published' ? 'success' :
                            assignment.status === 'draft' ? 'default' : 'warning'
                          }
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      {detailLinkPath ? (
                        <MuiLink
                          href={`${detailLinkPath}/${assignment.assignment_id}`}
                          component="a"
                          variant="body2"
                        >
                          View Details
                        </MuiLink>
                      ) : (
                        <MuiLink
                          component="button"
                          variant="body2"
                          onClick={() => onAssignmentClick?.(assignment.assignment_id)}
                        >
                          View Details
                        </MuiLink>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

