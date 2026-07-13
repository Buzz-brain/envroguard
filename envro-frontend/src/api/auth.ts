import api from './client';

export const authApi = {
  requestRegistrationOTP: (registrationNumber: string) =>
    api.post('/auth/student/request-otp', { registrationNumber }),

  verifyRegistrationOTP: (registrationNumber: string, otp: string) =>
    api.post('/auth/student/verify-otp', { registrationNumber, otp }),

  completeRegistration: (verificationToken: string, password: string, confirmPassword: string) =>
    api.post('/auth/student/complete-registration', { verificationToken, password, confirmPassword }),

  studentLogin: (registrationNumber: string, password: string) =>
    api.post('/auth/student/login', { registrationNumber, password }),

  adminLogin: (email: string, password: string, role: string) =>
    api.post('/auth/admin/login', { email, password, role }),

  forgotPassword: (registrationNumber: string) =>
    api.post('/auth/forgot-password', { registrationNumber }),

  resetPassword: (registrationNumber: string, otp: string, password: string, confirmPassword: string) =>
    api.post('/auth/reset-password', { registrationNumber, otp, password }),

  adminForgotPassword: (email: string) =>
    api.post('/auth/admin/forgot-password', { email }),

  adminResetPassword: (email: string, otp: string, password: string) =>
    api.post('/auth/admin/reset-password', { email, otp, password }),

  adminRegistrationOTP: (email: string) =>
    api.post('/auth/admin/registration-otp', { email }),

  adminCompleteRegistration: (email: string, otp: string, password: string) =>
    api.post('/auth/admin/complete-registration', { email, otp, password }),

  refreshToken: (refreshToken: string) =>
    api.post('/auth/refresh-token', { refreshToken }),

  getCurrentUser: () => api.get('/auth/me'),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),

  logout: () => api.post('/auth/logout'),
};
