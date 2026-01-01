/**
 * Student Utilities - Helper functions for student dashboard
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 */

interface Result {
  percentage: number;
  score: number;
  total_points: number;
  grade_letter: string;
  weaknesses?: string[];
  strengths?: string[];
}

interface StudentStats {
  totalAssignments: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  totalPoints: number;
  totalPossible: number;
  gradeDistribution: Record<string, number>;
  trend: 'up' | 'down' | 'stable';
}

/**
 * Calculate statistics from student results
 */
export const calculateStudentStats = (results: Result[]): StudentStats => {
  if (results.length === 0) {
    return {
      totalAssignments: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      totalPoints: 0,
      totalPossible: 0,
      gradeDistribution: {},
      trend: 'stable',
    };
  }

  const scores = results.map(r => r.percentage);
  const averageScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  const highestScore = Math.max(...scores);
  const lowestScore = Math.min(...scores);
  const totalPoints = results.reduce((sum, r) => sum + r.score, 0);
  const totalPossible = results.reduce((sum, r) => sum + r.total_points, 0);

  // Grade distribution
  const gradeDistribution: Record<string, number> = {};
  results.forEach(r => {
    gradeDistribution[r.grade_letter] = (gradeDistribution[r.grade_letter] || 0) + 1;
  });

  // Calculate trend (compare last 3 vs previous 3)
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (results.length >= 6) {
    const recent = results.slice(0, 3).map(r => r.percentage);
    const previous = results.slice(3, 6).map(r => r.percentage);
    const recentAvg = recent.reduce((sum, s) => sum + s, 0) / recent.length;
    const previousAvg = previous.reduce((sum, s) => sum + s, 0) / previous.length;
    if (recentAvg > previousAvg + 2) trend = 'up';
    else if (recentAvg < previousAvg - 2) trend = 'down';
  }

  return {
    totalAssignments: results.length,
    averageScore,
    highestScore,
    lowestScore,
    totalPoints,
    totalPossible,
    gradeDistribution,
    trend,
  };
};

/**
 * Generate personalized insights for students
 */
export const generateStudentInsights = (results: Result[], stats: StudentStats): string[] => {
  const insights: string[] = [];

  if (results.length === 0) {
    return ['No grades yet. Submit assignments to see your progress!'];
  }

  if (stats.trend === 'up') {
    insights.push('📈 Great job! Your grades are improving!');
  } else if (stats.trend === 'down') {
    insights.push('📉 Your recent grades have decreased. Consider reviewing feedback.');
  }

  if (stats.averageScore >= 90) {
    insights.push('🌟 Excellent work! You\'re maintaining high grades.');
  } else if (stats.averageScore >= 80) {
    insights.push('👍 Good performance! Keep up the great work.');
  } else if (stats.averageScore < 70) {
    insights.push('💪 Focus on areas with lower scores. Review feedback for improvement.');
  }

  // Find most common weakness
  const allWeaknesses = results
    .flatMap(r => r.weaknesses || [])
    .filter(w => w);
  if (allWeaknesses.length > 0) {
    const weaknessCounts: Record<string, number> = {};
    allWeaknesses.forEach(w => {
      weaknessCounts[w] = (weaknessCounts[w] || 0) + 1;
    });
    const topWeakness = Object.entries(weaknessCounts)
      .sort((a, b) => b[1] - a[1])[0];
    if (topWeakness) {
      insights.push(`🎯 Focus area: ${topWeakness[0]} (appears in ${topWeakness[1]} assignments)`);
    }
  }

  return insights;
};

