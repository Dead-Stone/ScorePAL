/**
 * Design Constants - Modern design system for ScorePAL
 * Centralized constants for consistent styling across the application
 */

export const DESIGN_CONSTANTS = {
  // Brand Colors
  colors: {
    primary: '#3B82F6',
    primaryDark: '#2563EB',
    primaryLight: '#60A5FA',
    secondary: '#8B5CF6',
    secondaryDark: '#7C3AED',
    secondaryLight: '#A78BFA',
    accent: {
      teal: '#14B8A6',
      amber: '#F59E0B',
      rose: '#F43F5E',
      emerald: '#10B981',
    },
    gradient: {
      primary: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
      secondary: 'linear-gradient(135deg, #14B8A6 0%, #3B82F6 100%)',
      accent: 'linear-gradient(135deg, #F59E0B 0%, #F43F5E 100%)',
      hero: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 50%, #EC4899 100%)',
      card: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%)',
    },
    background: {
      default: '#ffffff',
      secondary: '#f8fafc',
      tertiary: '#f1f5f9',
      gradient: 'page-gradient',
    },
    text: {
      primary: '#0f172a',
      secondary: '#475569',
      tertiary: '#94a3b8',
      muted: '#64748b',
    },
    status: {
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
    },
    border: {
      light: 'rgba(226, 232, 240, 0.6)',
      default: '#E2E8F0',
      dark: '#CBD5E1',
    },
  },

  // Spacing
  spacing: {
    pagePadding: 6,
    sectionGap: 8,
    cardPadding: 6,
    containerMaxWidth: 'xl',
    navBarHeight: 64,
    tabBarHeight: 48,
  },

  // Typography
  typography: {
    fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    monoFamily: "'JetBrains Mono', 'Fira Code', monospace",
    h1: {
      fontSize: '2rem',
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '1.5rem',
      fontWeight: 700,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    body: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.6,
    },
    label: {
      fontSize: '0.75rem',
      fontWeight: 500,
      letterSpacing: '0.05em',
      textTransform: 'uppercase' as const,
    },
  },

  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    glow: {
      blue: '0 0 20px rgba(59, 130, 246, 0.3)',
      violet: '0 0 20px rgba(139, 92, 246, 0.3)',
      teal: '0 0 20px rgba(20, 184, 166, 0.3)',
    },
  },

  // Border Radius
  borderRadius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.25rem',
    full: '9999px',
  },

  // Components
  components: {
    card: {
      borderRadius: '1rem',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
      padding: '1.5rem',
      border: '1px solid rgba(226, 232, 240, 0.6)',
    },
    button: {
      borderRadius: '0.75rem',
      textTransform: 'none' as const,
      fontWeight: 600,
      padding: '0.75rem 1.5rem',
    },
    input: {
      borderRadius: '0.75rem',
      padding: '0.75rem 1rem',
      border: '1px solid #E2E8F0',
    },
    badge: {
      borderRadius: '9999px',
      padding: '0.25rem 0.75rem',
      fontSize: '0.75rem',
      fontWeight: 600,
    },
  },

  // Transitions
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // Z-Index
  zIndex: {
    dropdown: 1000,
    modal: 1100,
    popover: 1200,
    tooltip: 1300,
    nav: 9999,
  },
} as const;

// Helper functions
export const getGradientText = () => ({
  background: DESIGN_CONSTANTS.colors.gradient.primary,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
});

export const getIconContainerStyle = (color: 'blue' | 'violet' | 'teal' | 'amber' | 'emerald' | 'rose') => {
  const colorMap = {
    blue: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3B82F6' },
    violet: { bg: 'rgba(139, 92, 246, 0.15)', text: '#8B5CF6' },
    teal: { bg: 'rgba(20, 184, 166, 0.15)', text: '#14B8A6' },
    amber: { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B' },
    emerald: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981' },
    rose: { bg: 'rgba(244, 63, 94, 0.15)', text: '#F43F5E' },
  };
  return colorMap[color];
};