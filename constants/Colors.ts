export const BrandColors = {
  primary: '#F9CF35',        // Your main brand color (yellow/gold)
  primaryLight: '#FBDA5F',   // Lighter variant
  primaryDark: '#E6B82A',    // Darker variant
  secondary: '#3756C7',      // Blue accent/secondary color
  accent: '#FF6B47',         // Orange accent for highlights
  success: '#10B981',        // Success states
  warning: '#F59E0B',        // Warning states
  error: '#EF4444',          // Error states
  info: '#3B82F6',          // Info states
  
  // New gradient colors from your design
  gradientStart: '#F9CF35',  // Primary gradient start (yellow)
  gradientEnd: '#E6B82A',    // Primary gradient end (darker yellow)
  cardBackground: '#ffffff', // Clean white for cards
  inputBackground: '#f6f6f6', // Light gray for inputs
  textPrimary: '#333333',    // Dark text
  textSecondary: '#777777',  // Gray text
  textTertiary: '#999999',   // Light gray text
  borderLight: '#e5e5e5',    // Light borders
};



// Semantic Colors - Based on usage context
const tintColorLight = BrandColors.primary;
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    surface: '#fff',
    card: '#f8f9fa',
    border: '#e1e5e9',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    // Brand colors
    primary: BrandColors.primary,
    primaryLight: BrandColors.primaryLight,
    primaryDark: BrandColors.primaryDark,
    secondary: BrandColors.secondary,
    accent: BrandColors.accent,
    success: BrandColors.success,
    warning: BrandColors.warning,
    error: BrandColors.error,
    // New gradient colors
    gradientStart: BrandColors.gradientStart,
    gradientEnd: BrandColors.gradientEnd,
    cardBackground: BrandColors.cardBackground,
    inputBackground: BrandColors.inputBackground,
    textPrimary: BrandColors.textPrimary,
    textSecondary: BrandColors.textSecondary,
    textTertiary: BrandColors.textTertiary,
    borderLight: BrandColors.borderLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    surface: '#1f2937',
    card: '#374151',
    border: '#4b5563',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    // Brand colors (same across themes)
    primary: BrandColors.primary,
    primaryLight: BrandColors.primaryLight,
    primaryDark: BrandColors.primaryDark,
    secondary: BrandColors.secondary,
    accent: BrandColors.accent,
    success: BrandColors.success,
    warning: BrandColors.warning,
    error: BrandColors.error,
    // New gradient colors - adjusted for dark mode
    gradientStart: BrandColors.gradientStart,
    gradientEnd: BrandColors.gradientEnd,
    cardBackground: '#2d3748',
    inputBackground: '#4a5568',
    textPrimary: '#f7fafc',
    textSecondary: '#cbd5e0',
    textTertiary: '#a0aec0',
    borderLight: '#4a5568',
  },
};

// Typography scale with Nunito
export const Typography = {
  fontFamilies: {
    primary: 'Nunito',        // For headers, brand, buttons
    body: 'Nunito',          // For body text, descriptions
    monospace: 'SpaceMono',  // For special cases
  },
  fontSizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  fontWeights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

// Spacing scale
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
};

// Gradient combinations for easy use
export const Gradients = {
  primary: [BrandColors.gradientStart, BrandColors.gradientEnd],
  primaryReverse: [BrandColors.gradientEnd, BrandColors.gradientStart],
  subtle: [BrandColors.primaryLight, BrandColors.primary],
  secondary: [BrandColors.secondary, '#2642B3'], // Blue gradient
};