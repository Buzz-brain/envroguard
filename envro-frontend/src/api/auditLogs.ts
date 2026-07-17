import api from './client';

export const auditLogsApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    entityType?: string;
    action?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }) =>
    api.get('/audit-logs', { params }),
};
