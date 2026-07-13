import { Router } from 'express';
import * as authController from './controller.js';
import * as authValidation from './validation.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { authRateLimit, otpRateLimit } from '../../middleware/rateLimiter.js';
import { ROLES } from '../../constants/roles.js';

const router = Router();

// ─── Public Routes ───────────────────────────────────────────────────────

// Student registration flow
router.post(
  '/student/request-otp',
  otpRateLimit,
  authValidation.requestRegistrationOTP,
  validate,
  authController.requestRegistrationOTP
);

router.post(
  '/student/verify-otp',
  authValidation.verifyRegistrationOTP,
  validate,
  authController.verifyRegistrationOTP
);

router.post(
  '/student/complete-registration',
  authValidation.completeRegistration,
  validate,
  authController.completeRegistration
);

// Student login
router.post(
  '/student/login',
  authRateLimit,
  authValidation.studentLogin,
  validate,
  authController.studentLogin
);

// Admin login (departmentAdmin, facultyAdmin, environmentalAdmin)
router.post(
  '/admin/login',
  authRateLimit,
  authValidation.adminLogin,
  validate,
  authController.adminLogin
);

// Admin registration flow
router.post(
  '/admin/registration-otp',
  otpRateLimit,
  authValidation.adminRegistrationOTP,
  validate,
  authController.adminRegistrationOTP
);

router.post(
  '/admin/complete-registration',
  authValidation.adminCompleteRegistration,
  validate,
  authController.adminCompleteRegistration
);

// Password reset
router.post(
  '/forgot-password',
  otpRateLimit,
  authValidation.requestPasswordReset,
  validate,
  authController.requestPasswordReset
);

router.post(
  '/reset-password',
  authValidation.resetPassword,
  validate,
  authController.resetPassword
);

// Admin password reset
router.post(
  '/admin/forgot-password',
  otpRateLimit,
  authValidation.adminForgotPassword,
  validate,
  authController.adminRequestPasswordReset
);

router.post(
  '/admin/reset-password',
  authValidation.adminResetPassword,
  validate,
  authController.adminResetPassword
);

// Token refresh
router.post(
  '/refresh-token',
  authValidation.tokenRefresh,
  validate,
  authController.refreshToken
);

// ─── Authenticated Routes ────────────────────────────────────────────────

router.use(authenticate);

// Get current user
router.get('/me', authController.getCurrentUser);

// Change password
router.post(
  '/change-password',
  authValidation.changePassword,
  validate,
  authController.changePassword
);

// Logout
router.post('/logout', authController.logout);

export default router;
