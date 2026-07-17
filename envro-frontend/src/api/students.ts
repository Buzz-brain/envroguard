import api from './client';

export const studentsApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string; faculty?: string }) =>
    api.get('/students', { params }),

  getById: (id: string) => api.get(`/students/${id}`),

  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/students/${id}`, data),

  delete: (id: string) => api.delete(`/students/${id}`),

  importStudents: (formData: FormData) =>
    api.post('/students/import', formData, {
      headers: { 'Content-Type': null },
    }),

  batchCreate: (students: Array<{
    registrationNumber: string;
    fullName: string;
    email: string;
    department: string;
    level: string;
  }>) =>
    api.post('/students/batch', { students }),

  search: (query: string) =>
    api.get('/students/search', { params: { q: query } }),

  getStats: () => api.get('/students/stats'),
};
