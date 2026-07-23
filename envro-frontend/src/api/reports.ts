import api from './client';

export interface ReportImageData {
  url: string;
  publicId: string;
}

export interface CreateReportPayload {
  title: string;
  description: string;
  category: string;
  address: string;
  latitude?: number;
  longitude?: number;
  faculty?: string;
  images: ReportImageData[];
}

export const reportsApi = {
  createReport: (payload: CreateReportPayload) =>
    api.post('/reports', payload),

  getMyReports: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/reports/my-reports', { params }),

  getAllReports: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    faculty?: string;
    search?: string;
  }) => api.get('/reports', { params }),

  getReportById: (id: string) => api.get(`/reports/${id}`),

  updateReportStatus: (id: string, status: string, note?: string) =>
    api.patch(`/reports/${id}/status`, { status, note }),

  assignReport: (id: string, adminId: string) =>
    api.patch(`/reports/${id}/assign`, { adminId }),

  deleteReport: (id: string) => api.delete(`/reports/${id}`),

  getReportStats: () => api.get('/reports/stats'),
};
