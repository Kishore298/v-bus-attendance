import { apiClient } from './client';

export const authApi = {
  login: (data) => apiClient.post('/auth/login', data).then((r) => r.data),
  me: () => apiClient.get('/auth/me').then((r) => r.data),
  changePassword: (data) => apiClient.post('/auth/change-password', data).then((r) => r.data),
};

export const userApi = {
  list: () => apiClient.get('/users').then((r) => r.data),
  create: (data) => apiClient.post('/users', data).then((r) => r.data),
  update: (id, data) => apiClient.patch(`/users/${id}`, data).then((r) => r.data),
};

export const employeeApi = {
  list: (params) => apiClient.get('/employees', { params }).then((r) => r.data),
  get: (id) => apiClient.get(`/employees/${id}`).then((r) => r.data),
  create: (data) => apiClient.post('/employees', data).then((r) => r.data),
  update: (id, data) => apiClient.patch(`/employees/${id}`, data).then((r) => r.data),
  remove: (id, data) => apiClient.delete(`/employees/${id}`, { data }).then((r) => r.data),
  updateSalary: (id, data) => apiClient.post(`/employees/${id}/salary`, data).then((r) => r.data),
  attendanceHistory: (id) => apiClient.get(`/employees/${id}/attendance-history`).then((r) => r.data),
};

export const attendanceApi = {
  createBatch: (data) => apiClient.post('/attendance/batches', data).then((r) => r.data),
  listBatches: (params) => apiClient.get('/attendance/batches', { params }).then((r) => r.data),
  getBatch: (id) => apiClient.get(`/attendance/batches/${id}`).then((r) => r.data),
  updateBatch: (id, data) => apiClient.put(`/attendance/batches/${id}`, data).then((r) => r.data),
  supervisorReview: (id, data) =>
    apiClient.post(`/attendance/batches/${id}/supervisor-review`, data).then((r) => r.data),
  ownerReview: (id, data) =>
    apiClient.post(`/attendance/batches/${id}/owner-review`, data).then((r) => r.data),
  reopenRecord: (recordId, reason) =>
    apiClient.post(`/attendance/records/${recordId}/reopen`, { reason }).then((r) => r.data),
  actionRequired: () => apiClient.get('/attendance/action-required').then((r) => r.data),
};

export const adjustmentApi = {
  list: (params) => apiClient.get('/adjustments', { params }).then((r) => r.data),
  create: (data) => apiClient.post('/adjustments', data).then((r) => r.data),
  cancel: (id) => apiClient.delete(`/adjustments/${id}`).then((r) => r.data),
};

export const payrollApi = {
  preview: (data) => apiClient.post('/payroll/preview', data).then((r) => r.data),
  list: (params) => apiClient.get('/payroll', { params }).then((r) => r.data),
  get: (id) => apiClient.get(`/payroll/${id}`).then((r) => r.data),
  finalize: (id) => apiClient.post(`/payroll/${id}/finalize`).then((r) => r.data),
  downloadPayslipPdf: (itemId) =>
    apiClient.get(`/payroll/items/${itemId}/payslip.pdf`, { responseType: 'blob' }).then((r) => r.data),
};

export const dashboardApi = {
  owner: () => apiClient.get('/dashboard/owner').then((r) => r.data),
  supervisor: () => apiClient.get('/dashboard/supervisor').then((r) => r.data),
  subSupervisor: () => apiClient.get('/dashboard/sub-supervisor').then((r) => r.data),
};

export const reportApi = {
  attendance: (params) => apiClient.get('/reports/attendance', { params }).then((r) => r.data),
  supervisorReview: (params) =>
    apiClient.get('/reports/supervisor-review', { params }).then((r) => r.data),
  payroll: (params) => apiClient.get('/reports/payroll', { params }).then((r) => r.data),
  adjustments: (params) => apiClient.get('/reports/adjustments', { params }).then((r) => r.data),
  exportCsv: (path, params) =>
    apiClient
      .get(`/reports/${path}`, { params: { ...params, format: 'csv' }, responseType: 'blob' })
      .then((r) => r.data),
};

export const miscApi = {
  notifications: () => apiClient.get('/notifications').then((r) => r.data),
  markRead: (id) => apiClient.patch(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => apiClient.patch('/notifications/read-all').then((r) => r.data),
  auditLogs: (params) => apiClient.get('/audit-logs', { params }).then((r) => r.data),
  settings: () => apiClient.get('/settings').then((r) => r.data),
  updateSettings: (data) => apiClient.put('/settings', data).then((r) => r.data),
};
