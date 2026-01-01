/**
 * StudentInsights - Personalized insights component for students
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 */

import React from 'react';
import { Card, CardHeader, CardContent, Alert } from '@mui/material';
import InsightsIcon from '@mui/icons-material/Insights';

interface StudentInsightsProps {
  insights: string[];
}

export const StudentInsights: React.FC<StudentInsightsProps> = ({ insights }) => {
  if (insights.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader
        title="Personalized Insights"
        avatar={<InsightsIcon color="primary" />}
      />
      <CardContent>
        {insights.map((insight, idx) => (
          <Alert key={idx} severity="info" sx={{ mb: 1 }}>
            {insight}
          </Alert>
        ))}
      </CardContent>
    </Card>
  );
};

