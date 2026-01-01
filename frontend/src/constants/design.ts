/**
 * Design Constants - Centralized design system for ScorePAL
 * Makes it easy to update design across the entire application
 */

export const DESIGN_CONSTANTS = {
  // Brand Colors
  colors: {
    primary: '#1D80C3',
    primaryDark: '#1565A0',
    primaryLight: '#4F9DD6',
    secondary: '#4F46E5',
    secondaryDark: '#4338CA',
    secondaryLight: '#6366F1',
    gradient: {
      primary: 'linear-gradient(135deg, #1D80C3 0%, #4F46E5 100%)',
      hero: 'linear-gradient(135deg, #1D80C3 0%, #4F46E5 50%, #7C3AED 100%)',
      card: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
    },
    background: {
      default: '#ffffff',
      secondary: '#f8fafc',
      tertiary: '#f1f5f9',
      gradient: 'bg-gradient-to-br from-gray-50 via-white to-gray-50',
    },
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
      tertiary: '#94a3b8',
    },
    status: {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
  },

  // Spacing
  spacing: {
    pagePadding: { xs: 12, sm: 12 },
    sectionGap: 4,
    cardPadding: 3,
    containerMaxWidth: 'xl',
  },

  // Typography
  typography: {
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 700,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    gradientText: {
      background: 'linear-gradient(135deg, #1D80C3 0%, #4F46E5 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    },
  },

  // Components
  components: {
    card: {
      borderRadius: 2,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      padding: 3,
    },
    button: {
      borderRadius: 2,
      textTransform: 'none' as const,
      fontWeight: 600,
    },
    input: {
      borderRadius: 2,
    },
  },

  // Layout
  layout: {
    navBarHeight: 64,
    containerPadding: { xs: 3, sm: 4, md: 6 },
  },
} as const;


