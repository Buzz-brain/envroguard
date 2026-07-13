import api from './client';

export const notificationsApi = {
  getAll: (params?: { page?: number; limit?: number }) =>
    api.get('/notifications', { params }),

  getStats: () =>
    api.get('/notifications/stats'),

  markAsRead: (id: string) =>
    api.patch(`/notifications/${id}/read`),

  markAllAsRead: () =>
    api.patch('/notifications/mark-all-read'),

  delete: (id: string) =>
    api.delete(`/notifications/${id}`),
};
