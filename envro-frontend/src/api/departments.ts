import api from './client';

export const departmentsApi = {
  getAll: (params?: { faculty?: string }) =>
    api.get('/departments', { params }),
  getById: (id: string) => api.get(`/departments/${id}`),
  create: (data: { name: string; code: string; faculty: string; description?: string }) =>
    api.post('/departments', data),
  update: (id: string, data: { name?: string; code?: string; description?: string }) =>
    api.patch(`/departments/${id}`, data),
  toggleStatus: (id: string) =>
    api.patch(`/departments/${id}/toggle-status`),
  delete: (id: string) => api.delete(`/departments/${id}`),
};
