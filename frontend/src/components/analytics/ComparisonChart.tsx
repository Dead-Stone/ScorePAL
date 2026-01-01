/**
 * Reusable Comparison Chart Component for Analytics
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@mui/material';
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('react-chartjs-2').then(mod => mod.Bar), { ssr: false });

interface ComparisonChartProps {
  title: string;
  labels: string[];
  data: number[];
  dataLabel?: string;
  backgroundColor?: string;
  borderColor?: string;
  maxValue?: number;
}

export const ComparisonChart: React.FC<ComparisonChartProps> = ({
  title,
  labels,
  data,
  dataLabel = 'Value',
  backgroundColor = 'rgba(54, 162, 235, 0.6)',
  borderColor = 'rgba(54, 162, 235, 1)',
  maxValue
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const importChartjs = async () => {
      const { Chart, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } = await import('chart.js');
      Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
    };
    importChartjs();
  }, []);

  if (!mounted) return null;

  const chartData = {
    labels,
    datasets: [{
      label: dataLabel,
      data,
      backgroundColor,
      borderColor,
      borderWidth: 1
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { display: true },
      title: { display: false }
    },
    scales: {
      y: {
        beginAtZero: true,
        ...(maxValue && { max: maxValue })
      }
    }
  };

  return (
    <Card>
      <CardHeader title={title} />
      <CardContent>
        <Chart data={chartData} options={options} />
      </CardContent>
    </Card>
  );
};

