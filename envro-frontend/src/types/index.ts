export interface User {
  id: string;
  fullName: string;
  email: string;
  role: 'student' | 'departmentAdmin' | 'facultyAdmin' | 'environmentalAdmin';
  isActive: boolean;
  lastLogin?: string;
  faculty?: string;
  department?: string;
  registrationNumber?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface Faculty {
  _id: string;
  name: string;
  code?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Department {
  _id: string;
  name: string;
  code: string;
  faculty: string | Faculty;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Location {
  type: 'Point';
  coordinates: [number, number];
  address: string;
}

export interface ReportImage {
  url: string;
  publicId: string;
}

export interface StatusHistoryEntry {
  status: ReportStatus;
  changedBy: string;
  changedByModel: 'EnvironmentalAdmin';
  note?: string;
  changedAt: string;
}

export type ReportStatus = 'pending' | 'under_review' | 'in_progress' | 'resolved';
export type ReportPriority = 'low' | 'medium' | 'high' | 'critical';

export interface HazardReport {
  _id: string;
  title: string;
  description: string;
  category: HazardCategory;
  images: ReportImage[];
  location: Location;
  reportedBy: string;
  studentInfo: {
    registrationNumber: string;
    fullName?: string;
    faculty?: string;
    department?: string;
  };
  faculty: string;
  status: ReportStatus;
  priority: ReportPriority;
  assignedTo?: string;
  statusHistory: StatusHistoryEntry[];
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type HazardCategory =
  | 'Flooding'
  | 'Waste Dumping'
  | 'Pollution'
  | 'Blocked Drainage'
  | 'Dirty Environment'
  | 'Others';

export interface Student {
  _id: string;
  registrationNumber: string;
  fullName: string;
  email: string;
  department: string;
  faculty: string | Faculty;
  level: string;
  isEligible: boolean;
  createdAt: string;
}

export interface Notification {
  _id: string;
  recipient: string;
  recipientModel: string;
  type: string;
  title: string;
  message: string;
  relatedReport?: string;
  isRead: boolean;
  readAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    pagination: PaginationMeta;
  };
}

export interface DashboardStats {
  totalReports: number;
  pendingReports: number;
  resolvedReports: number;
  inProgressReports: number;
  totalStudents: number;
  totalFaculties: number;
  totalDepartments?: number;
  reportsByCategory: { _id: string; count: number }[];
  reportsByStatus: { _id: string; count: number }[];
  recentReports: HazardReport[];
  monthlyTrend?: { _id: { year: number; month: number }; count: number }[];
  reportsThisMonth?: number;
  reportsThisWeek?: number;
}
