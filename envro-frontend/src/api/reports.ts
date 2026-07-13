import api from './client';

export const reportsApi = {
  createReport: (formData: FormData) =>
    api.post('/reports', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

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
