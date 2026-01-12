/**
 * DashboardCharts - Clean, minimalistic charts for the dashboard
 * Includes: Line graph, Histogram, Pie chart, and Bar chart
 */

import React from 'react';
import dynamic from 'next/dynamic';
import { ChartWrapper } from '../charts/ChartWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Loader2 } from 'lucide-react';

const Bar = dynamic(() => import('react-chartjs-2').then(mod => mod.Bar), { ssr: false });
const Line = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), { ssr: false });
const Pie = dynamic(() => import('react-chartjs-2').then(mod => mod.Pie), { ssr: false });
const Doughnut = dynamic(() => import('react-chartjs-2').then(mod => mod.Doughnut), { ssr: false });

interface GradingResult {
  percentage?: number;
  score?: number;
  total_points?: number;
  created_at?: string;
  assignment_name?: string;
  student_name?: string;
}

interface DashboardChartsProps {
  gradings: GradingResult[];
  loading?: boolean;
}

// Minimalistic chart options
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'top' as const,
      labels: {
        usePointStyle: true,
        padding: 12,
        font: {
          size: 11,
          family: "'Inter', sans-serif",
        },
      },
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: 8,
      titleFont: {
        size: 12,
      },
      bodyFont: {
        size: 11,
      },
      cornerRadius: 6,
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        font: {
          size: 10,
        },
        color: '#6B7280',
      },
    },
    y: {
      grid: {
        color: '#F3F4F6',
        drawBorder: false,
      },
      ticks: {
        font: {
          size: 10,
        },
        color: '#6B7280',
      },
    },
  },
};

const lineChartOptions = {
  ...chartOptions,
  elements: {
    line: {
      tension: 0.4,
      borderWidth: 2,
    },
    point: {
      radius: 3,
      hoverRadius: 5,
    },
  },
};

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ gradings, loading = false }) => {
  if (loading || !gradings.length) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-0 shadow-md">
            <CardContent className="p-6 h-64 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Prepare data for charts
  const prepareLineChartData = () => {
    // Group gradings by date
    const dateMap = new Map<string, number[]>();
    gradings.forEach((g) => {
      if (g.created_at) {
        const date = new Date(g.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const score = g.percentage || (g.score && g.total_points ? (g.score / g.total_points) * 100 : 0);
        if (!dateMap.has(date)) {
          dateMap.set(date, []);
        }
        dateMap.get(date)!.push(score);
      }
    });

    const dates = Array.from(dateMap.keys()).slice(-10); // Last 10 dates
    const averages = dates.map((date) => {
      const scores = dateMap.get(date)!;
      return scores.reduce((a, b) => a + b, 0) / scores.length;
    });

    return {
      labels: dates,
      datasets: [
        {
          label: 'Average Score',
          data: averages,
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
        },
      ],
    };
  };

  const prepareHistogramData = () => {
    // Score distribution (0-100 in bins of 10)
    const bins = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const counts = new Array(bins.length - 1).fill(0);

    gradings.forEach((g) => {
      const score = g.percentage || (g.score && g.total_points ? (g.score / g.total_points) * 100 : 0);
      for (let i = 0; i < bins.length - 1; i++) {
        if (score >= bins[i] && score < bins[i + 1]) {
          counts[i]++;
          break;
        }
      }
    });

    return {
      labels: bins.slice(0, -1).map((b, i) => `${b}-${bins[i + 1]}`),
      datasets: [
        {
          label: 'Number of Gradings',
          data: counts,
          backgroundColor: 'rgba(59, 130, 246, 0.6)',
          borderColor: '#3B82F6',
          borderWidth: 1,
        },
      ],
    };
  };

  const preparePieChartData = () => {
    // Grade distribution (A, B, C, D, F)
    const grades = { A: 0, B: 0, C: 0, D: 0, F: 0 };

    gradings.forEach((g) => {
      const score = g.percentage || (g.score && g.total_points ? (g.score / g.total_points) * 100 : 0);
      if (score >= 90) grades.A++;
      else if (score >= 80) grades.B++;
      else if (score >= 70) grades.C++;
      else if (score >= 60) grades.D++;
      else grades.F++;
    });

    return {
      labels: Object.keys(grades),
      datasets: [
        {
          data: Object.values(grades),
          backgroundColor: [
            'rgba(34, 197, 94, 0.8)',   // Green for A
            'rgba(59, 130, 246, 0.8)',   // Blue for B
            'rgba(251, 191, 36, 0.8)',   // Yellow for C
            'rgba(249, 115, 22, 0.8)',   // Orange for D
            'rgba(239, 68, 68, 0.8)',    // Red for F
          ],
          borderColor: [
            '#22C55E',
            '#3B82F6',
            '#FBBF24',
            '#F97316',
            '#EF4444',
          ],
          borderWidth: 2,
        },
      ],
    };
  };

  const prepareAssignmentBarData = () => {
    // Top 5 assignments by average score
    const assignmentMap = new Map<string, number[]>();
    gradings.forEach((g) => {
      const assignmentName = g.assignment_name || 'Unknown';
      const score = g.percentage || (g.score && g.total_points ? (g.score / g.total_points) * 100 : 0);
      if (!assignmentMap.has(assignmentName)) {
        assignmentMap.set(assignmentName, []);
      }
      assignmentMap.get(assignmentName)!.push(score);
    });

    const assignments = Array.from(assignmentMap.entries())
      .map(([name, scores]) => ({
        name: name.length > 20 ? name.substring(0, 20) + '...' : name,
        avg: scores.reduce((a, b) => a + b, 0) / scores.length,
        count: scores.length,
      }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5);

    return {
      labels: assignments.map((a) => a.name),
      datasets: [
        {
          label: 'Average Score (%)',
          data: assignments.map((a) => a.avg),
          backgroundColor: 'rgba(139, 92, 246, 0.6)',
          borderColor: '#8B5CF6',
          borderWidth: 1,
        },
      ],
    };
  };

  const lineData = prepareLineChartData();
  const histogramData = prepareHistogramData();
  const pieData = preparePieChartData();
  const barData = prepareAssignmentBarData();

  return (
    <div className="space-y-4">
      {/* Top Row - Two Larger Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Line Chart - Grading Trends */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-xs font-medium text-gray-600 uppercase tracking-wide">Grading Trends</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            <div className="h-56">
              <ChartWrapper minHeight={224}>
                <Line data={lineData} options={lineChartOptions} />
              </ChartWrapper>
            </div>
          </CardContent>
        </Card>

        {/* Histogram - Score Distribution */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-xs font-medium text-gray-600 uppercase tracking-wide">Score Distribution</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            <div className="h-56">
              <ChartWrapper minHeight={224}>
                <Bar data={histogramData} options={chartOptions} />
              </ChartWrapper>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row - Two Smaller Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pie Chart - Grade Distribution */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-xs font-medium text-gray-600 uppercase tracking-wide">Grade Distribution</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            <div className="h-48">
              <ChartWrapper minHeight={192}>
                <Doughnut 
                  data={pieData} 
                  options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      legend: {
                        ...chartOptions.plugins.legend,
                        position: 'bottom' as const,
                      },
                    },
                  }} 
                />
              </ChartWrapper>
            </div>
          </CardContent>
        </Card>

        {/* Bar Chart - Top Assignments */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-xs font-medium text-gray-600 uppercase tracking-wide">Top Assignments</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            <div className="h-48">
              <ChartWrapper minHeight={192}>
                <Bar data={barData} options={chartOptions} />
              </ChartWrapper>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

