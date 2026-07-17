export const lightColors = {
  primary: '#059669',
  primaryDark: '#047857',
  primaryLight: '#A7F3D0',
  primaryBg: '#ECFDF5',

  secondary: '#F59E0B',
  secondaryLight: '#FEF3C7',

  danger: '#DC2626',
  dangerLight: '#FEE2E2',

  success: '#10B981',
  successLight: '#D1FAE5',

  info: '#3B82F6',
  infoLight: '#DBEAFE',

  background: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceAlt: '#ECECF1',

  text: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',

  border: '#E5E7EB',
  borderLight: '#F3F4F6',

  overlay: 'rgba(0,0,0,0.5)',
  shadow: 'rgba(0,0,0,0.08)',

  statusPending: '#F59E0B',
  statusUnderReview: '#3B82F6',
  statusInProgress: '#8B5CF6',
  statusResolved: '#10B981',

  categoryFlooding: '#0EA5E9',
  categoryWaste: '#65A30D',
  categoryPollution: '#EF4444',
  categoryDrainage: '#8B5CF6',
  categoryDirty: '#F59E0B',
  categoryOther: '#6B7280',

  hazFlooding: '#E0F2FE',
  hazWaste: '#ECFCCB',
  hazPollution: '#FEE2E2',
  hazDrainage: '#F3E8FF',
  hazDirty: '#FEF3C7',
  hazOther: '#F3F4F6',
};

export const darkColors: typeof lightColors = {
  primary: '#34D399',
  primaryDark: '#6EE7B7',
  primaryLight: '#064E3B',
  primaryBg: '#022C22',

  secondary: '#FBBF24',
  secondaryLight: '#78350F',

  danger: '#F87171',
  dangerLight: '#450A0A',

  success: '#34D399',
  successLight: '#064E3B',

  info: '#60A5FA',
  infoLight: '#1E3A5F',

  background: '#0F172A',
  surface: '#1E293B',
  surfaceAlt: '#334155',

  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  textInverse: '#0F172A',

  border: '#334155',
  borderLight: '#475569',

  overlay: 'rgba(0,0,0,0.7)',
  shadow: 'rgba(0,0,0,0.3)',

  statusPending: '#FBBF24',
  statusUnderReview: '#60A5FA',
  statusInProgress: '#A78BFA',
  statusResolved: '#34D399',

  categoryFlooding: '#38BDF8',
  categoryWaste: '#84CC16',
  categoryPollution: '#F87171',
  categoryDrainage: '#A78BFA',
  categoryDirty: '#FBBF24',
  categoryOther: '#94A3B8',

  hazFlooding: '#0C4A6E',
  hazWaste: '#1A2E0A',
  hazPollution: '#450A0A',
  hazDrainage: '#2E1065',
  hazDirty: '#452A04',
  hazOther: '#1E293B',
};

export const colors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

const plusJakartaSans = {
  400: 'PlusJakartaSans_400Regular',
  500: 'PlusJakartaSans_500Medium',
  600: 'PlusJakartaSans_600SemiBold',
  700: 'PlusJakartaSans_700Bold',
};

export const typography = {
  h1: { fontFamily: plusJakartaSans[700], fontSize: 32, fontWeight: '700' as const, lineHeight: 40, letterSpacing: -0.5 },
  h2: { fontFamily: plusJakartaSans[700], fontSize: 24, fontWeight: '700' as const, lineHeight: 32, letterSpacing: -0.3 },
  h3: { fontFamily: plusJakartaSans[600], fontSize: 20, fontWeight: '600' as const, lineHeight: 28 },
  h4: { fontFamily: plusJakartaSans[600], fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  body: { fontFamily: plusJakartaSans[400], fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodySmall: { fontFamily: plusJakartaSans[400], fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  caption: { fontFamily: plusJakartaSans[400], fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  button: { fontFamily: plusJakartaSans[600], fontSize: 16, fontWeight: '600' as const, lineHeight: 24 },
  label: { fontFamily: plusJakartaSans[500], fontSize: 14, fontWeight: '500' as const, lineHeight: 20 },
};

import { Platform } from 'react-native';

const shadowProps = Platform.select({
  web: {
    sm: { boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
    md: { boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
    lg: { boxShadow: '0 4px 8px rgba(0,0,0,0.12)' },
  },
  default: {
    sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
    md: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 5 },
  },
});

export const shadows = shadowProps;
