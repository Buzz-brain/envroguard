export { colors, spacing, borderRadius, typography, shadows } from './theme';

export const ROLES = {
  STUDENT: 'student',
  DEPARTMENT_ADMIN: 'departmentAdmin',
  FACULTY_ADMIN: 'facultyAdmin',
  ENVIRONMENTAL_ADMIN: 'environmentalAdmin',
} as const;

export const HAZARD_CATEGORIES = [
  'Flooding',
  'Waste Dumping',
  'Pollution',
  'Blocked Drainage',
  'Dirty Environment',
  'Others',
] as const;

export const REPORT_STATUS = {
  PENDING: 'pending',
  UNDER_REVIEW: 'under_review',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
} as const;

export const REPORT_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

import { Platform } from 'react-native';

const FALLBACK_API_BASE_URL = Platform.select({
  web: 'http://localhost:5000/api/v1',
  default: 'https://envroguard.onrender.com/api/v1',
});

declare const process: {
  env: { EXPO_PUBLIC_API_URL?: string };
};

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || FALLBACK_API_BASE_URL;

export const categoryColors: Record<string, string> = {
  Flooding: '#0EA5E9',
  'Waste Dumping': '#65A30D',
  Pollution: '#EF4444',
  'Blocked Drainage': '#8B5CF6',
  'Dirty Environment': '#F59E0B',
  Others: '#6B7280',
};

export const categoryBgColors: Record<string, string> = {
  Flooding: '#E0F2FE',
  'Waste Dumping': '#ECFCCB',
  Pollution: '#FEE2E2',
  'Blocked Drainage': '#F3E8FF',
  'Dirty Environment': '#FEF3C7',
  Others: '#F3F4F6',
};

export const categoryIcons: Record<string, string> = {
  Flooding: 'water',
  'Waste Dumping': 'trash',
  Pollution: 'flask',
  'Blocked Drainage': 'funnel',
  'Dirty Environment': 'brush',
  Others: 'alert-circle',
};

export const statusColors: Record<string, string> = {
  pending: '#F59E0B',
  under_review: '#3B82F6',
  in_progress: '#8B5CF6',
  resolved: '#10B981',
};

export const statusLabels: Record<string, string> = {
  pending: 'Pending',
  under_review: 'Under Review',
  in_progress: 'In Progress',
  resolved: 'Resolved',
};
