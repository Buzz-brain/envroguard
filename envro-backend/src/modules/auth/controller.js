import { asyncHandler, apiResponse, ApiError } from '../../utils/index.js';
import { validate } from '../../middleware/validate.js';
import * as authService from './service.js';

// ─── Student Registration ────────────────────────────────────────────────

/**
 * POST /api/v1/auth/student/request-otp
 * Step 1: Student enters reg number, OTP sent to school email
 */
export const requestRegistrationOTP = asyncHandler(async (req, res) => {
  const result = await authService.requestRegistrationOTPService(
    req.body.registrationNumber
  );

  return apiResponse(res, 200, result.message, result);
});

/**
 * POST /api/v1/auth/student/verify-otp
 * Step 2: Student enters OTP for verification
 */
export const verifyRegistrationOTP = asyncHandler(async (req, res) => {
  const result = await authService.verifyRegistrationOTPService(
    req.body.registrationNumber,
    req.body.otp
  );

  return apiResponse(res, 200, 'OTP verified successfully', result);
});

/**
 * POST /api/v1/auth/student/complete-registration
 * Step 3: Student creates password after OTP verification
 */
export const completeRegistration = asyncHandler(async (req, res) => {
  const result = await authService.completeRegistrationService(
    req.body.verificationToken,
    req.body.password
  );

  return apiResponse(res, 201, 'Registration completed successfully', result);
});

// ─── Student Login ───────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/student/login
 * Student logs in with registration number and password
 */
export const studentLogin = asyncHandler(async (req, res) => {
  const result = await authService.studentLoginService(
    req.body.registrationNumber,
    req.body.password
  );

  return apiResponse(res, 200, 'Login successful', result);
});

// ─── Admin Login ─────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/admin/login
 * Admin logs in with email and password
 */
export const adminLogin = asyncHandler(async (req, res) => {
  const result = await authService.adminLoginService(
    req.body.email,
    req.body.password,
    req.body.role
  );

  return apiResponse(res, 200, 'Login successful', result);
});

// ─── Password Reset ──────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/forgot-password
 * Request password reset OTP
 */
export const requestPasswordReset = asyncHandler(async (req, res) => {
  const result = await authService.requestPasswordResetService(
    req.body.registrationNumber
  );

  return apiResponse(res, 200, result.message, result);
});

/**
 * POST /api/v1/auth/reset-password
 * Reset password with OTP
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPasswordService(
    req.body.registrationNumber,
    req.body.otp,
    req.body.password
  );

  return apiResponse(res, 200, result.message, result);
});

// ─── Admin Registration Flow ────────────────────────────────────────────

/**
 * POST /api/v1/auth/admin/registration-otp
 * Request OTP for admin registration
 */
export const adminRegistrationOTP = asyncHandler(async (req, res) => {
  const result = await authService.adminRegistrationOTPService(
    req.body.email
  );

  return apiResponse(res, 200, result.message, result);
});

/**
 * POST /api/v1/auth/admin/complete-registration
 * Verify OTP and set password for admin
 */
export const adminCompleteRegistration = asyncHandler(async (req, res) => {
  const result = await authService.adminCompleteRegistrationService(
    req.body.email,
    req.body.otp,
    req.body.password
  );

  return apiResponse(res, 200, 'Registration completed successfully', result);
});

// ─── Admin Password Reset ────────────────────────────────────────────────

/**
 * POST /api/v1/auth/admin/forgot-password
 * Request password reset OTP for admin
 */
export const adminRequestPasswordReset = asyncHandler(async (req, res) => {
  const result = await authService.adminRequestPasswordResetService(
    req.body.email
  );

  return apiResponse(res, 200, result.message, result);
});

/**
 * POST /api/v1/auth/admin/reset-password
 * Reset admin password with OTP
 */
export const adminResetPassword = asyncHandler(async (req, res) => {
  const result = await authService.adminResetPasswordService(
    req.body.email,
    req.body.otp,
    req.body.password
  );

  return apiResponse(res, 200, result.message, result);
});

// ─── Token Refresh ───────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/refresh-token
 * Refresh access token
 */
export const refreshToken = asyncHandler(async (req, res) => {
  const result = await authService.refreshTokenService(
    req.body.refreshToken
  );

  return apiResponse(res, 200, 'Token refreshed successfully', result);
});

// ─── Change Password ─────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/change-password
 * Change password (authenticated)
 */
export const changePassword = asyncHandler(async (req, res) => {
  const result = await authService.changePasswordService(
    req.user.id,
    req.user.role,
    req.body.currentPassword,
    req.body.newPassword
  );

  return apiResponse(res, 200, result.message);
});

// ─── Me (get current user) ───────────────────────────────────────────────

/**
 * GET /api/v1/auth/me
 * Get current authenticated user info
 */
export const getCurrentUser = asyncHandler(async (req, res) => {
  const { StudentAccount } = await import('./model/StudentAccount.js');
  const { DepartmentAdmin } = await import('../departmentAdmin/model.js');
  const { FacultyAdmin } = await import('../facultyAdmin/model.js');
  const { EnvironmentalAdmin } = await import('../environmentalAdmin/model.js');
  const { Student } = await import('../student/model.js');

  const modelMap = {
    student: StudentAccount,
    departmentAdmin: DepartmentAdmin,
    facultyAdmin: FacultyAdmin,
    environmentalAdmin: EnvironmentalAdmin,
  };

  const Model = modelMap[req.user.role];
  const user = await Model.findById(req.user.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  let profileData = {
    id: user._id,
    email: user.email,
    fullName: user.fullName || null,
    role: user.role,
    isActive: user.isActive,
  };

  if (req.user.role === 'student') {
    const studentRecord = await Student.findOne({
      registrationNumber: user.registrationNumber,
    }).populate('faculty');

    profileData = {
      ...profileData,
      registrationNumber: user.registrationNumber,
      fullName: studentRecord?.fullName,
      department: studentRecord?.department,
      faculty: studentRecord?.faculty?.name,
      facultyId: studentRecord?.faculty?._id,
      level: studentRecord?.level,
      lastLogin: user.lastLogin,
    };
  }

  if (req.user.role === 'departmentAdmin') {
    const { Department } = await import('../department/model.js');
    const { Faculty } = await import('../faculty/model.js');
    let dept = null;
    try {
      dept = user.department ? await Department.findById(user.department).select('name code') : null;
    } catch {}
    if (!dept && typeof user.department === 'string') {
      dept = await Department.findOne({ code: user.department }).select('name code');
    }
    if (!dept && user.faculty) {
      dept = await Department.findOne({ faculty: user.faculty }).select('name code');
    }
    const fac = user.faculty ? await Faculty.findById(user.faculty).select('name code') : null;
    profileData = {
      ...profileData,
      faculty: user.faculty,
      facultyName: fac?.name || null,
      facultyCode: fac?.code || null,
      department: user.department,
      departmentName: dept?.name || null,
      departmentCode: dept?.code || null,
    };
  }

  if (req.user.role === 'facultyAdmin') {
    profileData = {
      ...profileData,
      faculty: user.faculty,
    };
  }

  return apiResponse(res, 200, 'User profile retrieved', profileData);
});

// ─── Logout ──────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/logout
 * Logout and invalidate refresh token
 */
export const logout = asyncHandler(async (req, res) => {
  const { StudentAccount } = await import('./model/StudentAccount.js');
  const { DepartmentAdmin } = await import('../departmentAdmin/model.js');
  const { FacultyAdmin } = await import('../facultyAdmin/model.js');
  const { EnvironmentalAdmin } = await import('../environmentalAdmin/model.js');

  const modelMap = {
    student: StudentAccount,
    departmentAdmin: DepartmentAdmin,
    facultyAdmin: FacultyAdmin,
    environmentalAdmin: EnvironmentalAdmin,
  };

  const Model = modelMap[req.user.role];
  await Model.findByIdAndUpdate(req.user.id, { refreshToken: null });

  return apiResponse(res, 200, 'Logged out successfully');
});
