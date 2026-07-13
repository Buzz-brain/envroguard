import { body, param } from 'express-validator';

// ─── Student Registration Flow ───────────────────────────────────────────

export const requestRegistrationOTP = [
  body('registrationNumber')
    .trim()
    .notEmpty()
    .withMessage('Registration number is required')
    .isLength({ min: 11, max: 11 })
    .withMessage('Registration number must be exactly 11 digits')
    .matches(/^\d+$/)
    .withMessage('Registration number must contain only digits'),
];

export const verifyRegistrationOTP = [
  body('registrationNumber')
    .trim()
    .notEmpty()
    .withMessage('Registration number is required')
    .isLength({ min: 11, max: 11 })
    .withMessage('Registration number must be exactly 11 digits')
    .matches(/^\d+$/)
    .withMessage('Registration number must contain only digits'),
  body('otp')
    .trim()
    .notEmpty()
    .withMessage('OTP is required')
    .isLength({ min: 4, max: 8 })
    .withMessage('Invalid OTP format'),
];

export const completeRegistration = [
  body('verificationToken')
    .trim()
    .notEmpty()
    .withMessage('Verification token is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
];

// ─── Student Login ───────────────────────────────────────────────────────

export const studentLogin = [
  body('registrationNumber')
    .trim()
    .notEmpty()
    .withMessage('Registration number is required')
    .isLength({ min: 11, max: 11 })
    .withMessage('Registration number must be exactly 11 digits')
    .matches(/^\d+$/)
    .withMessage('Registration number must contain only digits'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

// ─── Admin Login ─────────────────────────────────────────────────────────

export const adminLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

// ─── Password Reset ──────────────────────────────────────────────────────

export const requestPasswordReset = [
  body('registrationNumber')
    .trim()
    .notEmpty()
    .withMessage('Registration number is required')
    .isLength({ min: 11, max: 11 })
    .withMessage('Registration number must be exactly 11 digits')
    .matches(/^\d+$/)
    .withMessage('Registration number must contain only digits'),
];

export const resetPassword = [
  body('registrationNumber')
    .trim()
    .notEmpty()
    .withMessage('Registration number is required')
    .isLength({ min: 11, max: 11 })
    .withMessage('Registration number must be exactly 11 digits')
    .matches(/^\d+$/)
    .withMessage('Registration number must contain only digits'),
  body('otp')
    .trim()
    .notEmpty()
    .withMessage('OTP is required')
    .isLength({ min: 4, max: 8 })
    .withMessage('Invalid OTP format'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/)
    .withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
];

// ─── Admin Password Reset ───────────────────────────────────────────────

export const adminForgotPassword = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format'),
];

export const adminResetPassword = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format'),
  body('otp')
    .trim()
    .notEmpty()
    .withMessage('OTP is required')
    .isLength({ min: 4, max: 8 })
    .withMessage('Invalid OTP format'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/)
    .withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
];

// ─── Admin Registration Flow ────────────────────────────────────────────

export const adminRegistrationOTP = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format'),
];

export const adminCompleteRegistration = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format'),
  body('otp')
    .trim()
    .notEmpty()
    .withMessage('OTP is required')
    .isLength({ min: 4, max: 8 })
    .withMessage('Invalid OTP format'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/)
    .withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
];

// ─── Token Refresh ───────────────────────────────────────────────────────

export const tokenRefresh = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
    .isString()
    .withMessage('Refresh token must be a string'),
];

// ─── Change Password ─────────────────────────────────────────────────────

export const changePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/)
    .withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
];
