import api from './client';

export const facultiesApi = {
  getAll: () => api.get('/faculties'),
  getById: (id: string) => api.get(`/faculties/${id}`),
  create: (data: { name: string; code?: string; description?: string }) =>
    api.post('/faculties', data),
  update: (id: string, data: { name?: string; code?: string; description?: string }) =>
    api.patch(`/faculties/${id}`, data),
  toggleStatus: (id: string) =>
    api.patch(`/faculties/${id}/toggle-status`),
  delete: (id: string) => api.delete(`/faculties/${id}`),
};
