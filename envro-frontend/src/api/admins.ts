import api from './client';

export const adminsApi = {
  // Environmental Admin endpoints
  getEnvironmentalAdmins: (params?: { page?: number; limit?: number }) =>
    api.get('/environmental-admin', { params }),
  createEnvironmentalAdmin: (data: { fullName: string; email: string }) =>
    api.post('/environmental-admin', data),
  updateEnvironmentalAdmin: (id: string, data: { fullName?: string; email?: string }) =>
    api.patch(`/environmental-admin/${id}`, data),
  toggleEnvironmentalAdminStatus: (id: string) =>
    api.patch(`/environmental-admin/${id}/toggle-status`),
  deleteEnvironmentalAdmin: (id: string) =>
    api.delete(`/environmental-admin/${id}`),

  // Faculty Admin endpoints
  getFacultyAdmins: (params?: { page?: number; limit?: number }) =>
    api.get('/faculty-admin', { params }),
  getFacultyAdminById: (id: string) => api.get(`/faculty-admin/${id}`),
  createFacultyAdmin: (data: { fullName: string; email: string; faculty: string }) =>
    api.post('/faculty-admin', data),
  updateFacultyAdmin: (id: string, data: { fullName?: string; email?: string; faculty?: string }) =>
    api.patch(`/faculty-admin/${id}`, data),
  toggleFacultyAdminStatus: (id: string) =>
    api.patch(`/faculty-admin/${id}/toggle-status`),
  deleteFacultyAdmin: (id: string) => api.delete(`/faculty-admin/${id}`),

  // Department Admin endpoints
  getDepartmentAdmins: (params?: { page?: number; limit?: number }) =>
    api.get('/department-admin', { params }),
  createDepartmentAdmin: (data: { fullName: string; email: string; faculty: string; department: string }) =>
    api.post('/department-admin', data),
  updateDepartmentAdmin: (id: string, data: { fullName?: string; email?: string; faculty?: string; department?: string }) =>
    api.patch(`/department-admin/${id}`, data),
  toggleDepartmentAdminStatus: (id: string) =>
    api.patch(`/department-admin/${id}/toggle-status`),
  deleteDepartmentAdmin: (id: string) => api.delete(`/department-admin/${id}`),

  // Dashboard
  getDashboard: () => api.get('/environmental-admin/dashboard'),
};
