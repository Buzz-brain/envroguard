import mongoose from 'mongoose';
import { Student } from '../student/model.js';
import { StudentAccount } from './model/StudentAccount.js';
import { OTP } from './model/OTP.js';
import { DepartmentAdmin } from '../departmentAdmin/model.js';
import { FacultyAdmin } from '../facultyAdmin/model.js';
import { EnvironmentalAdmin } from '../environmentalAdmin/model.js';
import jwt from 'jsonwebtoken';
import { generateOTP, hashOTP, compareOTP, ApiError } from '../../utils/index.js';
import { sendOTPEmail } from '../../services/email.service.js';
import { generateTokens } from '../../middleware/auth.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

const adminModelMap = {
  departmentAdmin: DepartmentAdmin,
  facultyAdmin: FacultyAdmin,
  environmentalAdmin: EnvironmentalAdmin,
};

// ─── Student Registration Flow ───────────────────────────────────────────

export const requestRegistrationOTPService = async (registrationNumber) => {
  const student = await Student.findOne({
    registrationNumber: registrationNumber.toUpperCase(),
  }).populate('faculty');

  if (!student) {
    throw new ApiError(404, 'Student record not found. Contact your department admin.');
  }

  if (!student.isEligible) {
    throw new ApiError(403, 'Your student record has been deactivated. Contact your department admin.');
  }

  const existingAccount = await StudentAccount.findOne({
    registrationNumber: student.registrationNumber,
  });

  if (existingAccount && existingAccount.isActive) {
    throw new ApiError(409, 'Account already exists for this registration number. Please login instead.');
  }

  // Invalidate any previous unused OTPs
  await OTP.updateMany(
    { email: student.email.toLowerCase(), purpose: 'registration', isUsed: false },
    { isUsed: true }
  );

  const otp = generateOTP();
  const otpHash = hashOTP(otp);
  const expiresAt = new Date(Date.now() + config.otp.expiryMinutes * 60 * 1000);

  await OTP.create({
    email: student.email.toLowerCase(),
    otpHash,
    purpose: 'registration',
    expiresAt,
  });

  await sendOTPEmail(student.email, otp, 'registration');

  logger.info('Registration OTP sent', {
    email: student.email,
    registrationNumber: student.registrationNumber,
  });

  return {
    message: `OTP sent to your school email (${maskEmail(student.email)})`,
    expiresAt,
  };
};

export const verifyRegistrationOTPService = async (registrationNumber, otp) => {
  const student = await Student.findOne({
    registrationNumber: registrationNumber.toUpperCase(),
  });

  if (!student) {
    throw new ApiError(404, 'Student record not found.');
  }

  const otpRecord = await OTP.findOne({
    email: student.email.toLowerCase(),
    purpose: 'registration',
    isUsed: false,
  })
    .sort({ createdAt: -1 });

  if (!otpRecord) {
    throw new ApiError(400, 'No active OTP found. Please request a new OTP.');
  }

  if (otpRecord.expiresAt < new Date()) {
    throw new ApiError(400, 'OTP has expired. Please request a new OTP.');
  }

  otpRecord.attempts += 1;

  if (otpRecord.attempts > otpRecord.maxAttempts) {
    otpRecord.isUsed = true;
    await otpRecord.save();
    throw new ApiError(400, 'Maximum OTP attempts exceeded. Please request a new OTP.');
  }

  if (!compareOTP(otp, otpRecord.otpHash)) {
    await otpRecord.save();
    throw new ApiError(401, 'Invalid OTP');
  }

  await otpRecord.save();

  // Issue a verification token (JWT) valid for 15 min
  const verificationToken = jwt.sign(
    { email: student.email, registrationNumber: student.registrationNumber },
    config.jwt.secret,
    { expiresIn: '15m' }
  );

  return {
    verificationToken,
    student: {
      registrationNumber: student.registrationNumber,
      fullName: student.fullName,
      email: student.email,
      department: student.department,
      level: student.level,
    },
  };
};

export const completeRegistrationService = async (verificationToken, password) => {
  let payload;
  try {
    payload = jwt.verify(verificationToken, config.jwt.secret);
  } catch {
    throw new ApiError(401, 'Invalid or expired verification token. Please start registration again.');
  }

  const { email, registrationNumber } = payload;

  const student = await Student.findOne({
    email: email.toLowerCase(),
  });

  if (!student) {
    throw new ApiError(404, 'Student record not found.');
  }

  // Check existing account
  const existingAccount = await StudentAccount.findOne({
    registrationNumber: registrationNumber.toUpperCase(),
  });

  if (existingAccount) {
    throw new ApiError(409, 'Account already exists for this registration number.');
  }

  // Consume the OTP used for this registration
  await OTP.updateOne(
    { email: email.toLowerCase(), purpose: 'registration', isUsed: false },
    { isUsed: true }
  );

  // Create student account
  const studentAccount = await StudentAccount.create({
    student: student._id,
    registrationNumber: registrationNumber.toUpperCase(),
    password,
  });

  // Populate student data for response
  const populatedStudent = await Student.findById(student._id).populate('faculty');

  const { accessToken, refreshToken } = generateTokens(
    studentAccount._id,
    studentAccount.role
  );

  await StudentAccount.findByIdAndUpdate(studentAccount._id, {
    refreshToken,
  });

  logger.info('Student registration completed', {
    registrationNumber,
    accountId: studentAccount._id,
  });

  return {
    account: {
      id: studentAccount._id,
      registrationNumber: studentAccount.registrationNumber,
      fullName: populatedStudent.fullName,
      email: populatedStudent.email,
      department: populatedStudent.department,
      faculty: populatedStudent.faculty?.name,
      level: populatedStudent.level,
      role: studentAccount.role,
    },
    accessToken,
    refreshToken,
  };
};

// ─── Admin Registration Flow ────────────────────────────────────────────

export const adminRegistrationOTPService = async (email) => {
  const normalizedEmail = email.toLowerCase();

  // Find admin across all admin models
  const adminModels = [EnvironmentalAdmin, FacultyAdmin, DepartmentAdmin];
  let admin = null;
  let AdminModel = null;

  for (const Model of adminModels) {
    admin = await Model.findOne({ email: normalizedEmail });
    if (admin) {
      AdminModel = Model;
      break;
    }
  }

  if (!admin) {
    throw new ApiError(404, 'No admin account found with this email. Contact the admin who invited you.');
  }

  if (!admin.isActive) {
    throw new ApiError(403, 'Your account has been deactivated. Contact the super admin.');
  }

  if (admin.isOnboarded) {
    throw new ApiError(409, 'This admin account is already registered. Please login.');
  }

  // Invalidate previous unused OTPs
  await OTP.updateMany(
    { email: normalizedEmail, purpose: 'admin_registration', isUsed: false },
    { isUsed: true }
  );

  const otp = generateOTP();
  const otpHash = hashOTP(otp);
  const expiresAt = new Date(Date.now() + config.otp.expiryMinutes * 60 * 1000);

  await OTP.create({
    email: normalizedEmail,
    otpHash,
    purpose: 'admin_registration',
    expiresAt,
  });

  const emailSent = await sendOTPEmail(normalizedEmail, otp, 'registration');

  logger.info('Admin registration OTP generated', { email: normalizedEmail, emailSent });

  return {
    message: emailSent
      ? `OTP sent to your email (${maskEmail(normalizedEmail)})`
      : `OTP generated. Email delivery may be delayed. Check your inbox or try again shortly.`,
    expiresAt,
  };
};

export const adminCompleteRegistrationService = async (email, otp, password) => {
  const normalizedEmail = email.toLowerCase();

  const otpRecord = await OTP.findOne({
    email: normalizedEmail,
    purpose: 'admin_registration',
    isUsed: false,
  }).sort({ createdAt: -1 });

  if (!otpRecord) {
    throw new ApiError(400, 'No active OTP found. Please request a new OTP.');
  }

  if (otpRecord.expiresAt < new Date()) {
    throw new ApiError(400, 'OTP has expired. Please request a new OTP.');
  }

  otpRecord.attempts += 1;

  if (otpRecord.attempts > otpRecord.maxAttempts) {
    otpRecord.isUsed = true;
    await otpRecord.save();
    throw new ApiError(400, 'Maximum OTP attempts exceeded. Please request a new OTP.');
  }

  if (!compareOTP(otp, otpRecord.otpHash)) {
    await otpRecord.save();
    throw new ApiError(401, 'Invalid OTP');
  }

  otpRecord.isUsed = true;
  await otpRecord.save();

  // Find admin and set password + isOnboarded
  const adminModels = [EnvironmentalAdmin, FacultyAdmin, DepartmentAdmin];
  let updatedAdmin = null;
  let role = null;
  let adminModel = null;

  for (const Model of adminModels) {
    const admin = await Model.findOne({ email: normalizedEmail }).select('+password');
    if (admin) {
      admin.password = password;
      admin.isOnboarded = true;
      await admin.save();
      updatedAdmin = admin;
      role = admin.role;
      adminModel = Model;
      break;
    }
  }

  if (!updatedAdmin || !adminModel) {
    throw new ApiError(404, 'Admin account not found.');
  }

  const { accessToken, refreshToken } = generateTokens(updatedAdmin._id, role);

  await adminModel.findByIdAndUpdate(updatedAdmin._id, {
    refreshToken,
    lastLogin: new Date(),
  });

  logger.info('Admin registration completed', {
    email: normalizedEmail,
    role,
    adminId: updatedAdmin._id,
  });

  let departmentInfo = null;
  let facultyInfo = null;
  if (role === 'departmentAdmin' && updatedAdmin.department) {
    const Department = mongoose.model('Department');
    departmentInfo = await Department.findById(updatedAdmin.department).select('name code');
  }
  if (updatedAdmin.faculty && role !== 'environmentalAdmin') {
    const Faculty = mongoose.model('Faculty');
    facultyInfo = await Faculty.findById(updatedAdmin.faculty).select('name code');
  }

  return {
    account: {
      id: updatedAdmin._id,
      fullName: updatedAdmin.fullName,
      email: updatedAdmin.email,
      role,
      faculty: facultyInfo || updatedAdmin.faculty || null,
      department: departmentInfo || updatedAdmin.department || null,
    },
    accessToken,
    refreshToken,
  };
};

// ─── Student Login ───────────────────────────────────────────────────────

export const studentLoginService = async (registrationNumber, password) => {
  const account = await StudentAccount.findOne({
    registrationNumber: registrationNumber.toUpperCase(),
  }).select('+password').populate('student');

  if (!account) {
    throw new ApiError(401, 'No account found for this registration number. Please register first.');
  }

  if (!account.isActive) {
    throw new ApiError(403, 'Your account has been deactivated. Contact support.');
  }

  const isPasswordValid = await account.comparePassword(password);

  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid registration number or password');
  }

  const student = await Student.findById(account.student).populate('faculty');

  const { accessToken, refreshToken } = generateTokens(account._id, account.role);

  await StudentAccount.findByIdAndUpdate(account._id, {
    refreshToken,
    lastLogin: new Date(),
  });

  return {
    account: {
      id: account._id,
      registrationNumber: account.registrationNumber,
      fullName: student.fullName,
      email: student.email,
      department: student.department,
      faculty: student.faculty?.name,
      facultyId: student.faculty?._id,
      level: student.level,
      role: account.role,
    },
    accessToken,
    refreshToken,
  };
};

// ─── Admin Login ─────────────────────────────────────────────────────────

export const adminLoginService = async (email, password, role) => {
  const Model = adminModelMap[role];

  if (!Model) {
    throw new ApiError(400, 'Invalid admin role specified');
  }

  const admin = await Model.findOne({ email: email.toLowerCase() }).select('+password');
  let departmentInfo = null;

  if (!admin) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (!admin.isOnboarded) {
    throw new ApiError(401, 'Please complete your registration first.');
  }

  if (!admin.isActive) {
    throw new ApiError(403, 'Your account has been deactivated. Contact the super admin.');
  }

  const isPasswordValid = await admin.comparePassword(password);

  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const { accessToken, refreshToken } = generateTokens(admin._id, role);

  await Model.findByIdAndUpdate(admin._id, {
    refreshToken,
    lastLogin: new Date(),
  });

  let facultyInfo = null;
  if (admin.faculty && role !== 'environmentalAdmin') {
    const Faculty = mongoose.model('Faculty');
    facultyInfo = await Faculty.findById(admin.faculty).select('name code');
  }

  if (role === 'departmentAdmin' && admin.department) {
    const Department = mongoose.model('Department');
    try {
      departmentInfo = await Department.findById(admin.department).select('name code');
    } catch {}
    if (!departmentInfo && typeof admin.department === 'string') {
      departmentInfo = await Department.findOne({ code: admin.department }).select('name code');
    }
    if (!departmentInfo && admin.faculty) {
      departmentInfo = await Department.findOne({ faculty: admin.faculty }).select('name code');
    }
  }

  return {
    account: {
      id: admin._id,
      fullName: admin.fullName,
      email: admin.email,
      role: admin.role,
      isActive: admin.isActive,
      faculty: admin.faculty || null,
      facultyName: facultyInfo?.name || null,
      facultyCode: facultyInfo?.code || null,
      department: admin.department || null,
      departmentName: departmentInfo?.name || null,
      departmentCode: departmentInfo?.code || null,
    },
    accessToken,
    refreshToken,
  };
};

// ─── Admin Password Reset ────────────────────────────────────────────────

export const adminRequestPasswordResetService = async (email) => {
  const normalizedEmail = email.toLowerCase();

  // Find admin across all admin models
  const adminModels = [EnvironmentalAdmin, FacultyAdmin, DepartmentAdmin];
  let admin = null;
  let AdminModel = null;

  for (const Model of adminModels) {
    admin = await Model.findOne({ email: normalizedEmail });
    if (admin) {
      AdminModel = Model;
      break;
    }
  }

  if (!admin) {
    throw new ApiError(404, 'No admin account found with this email.');
  }

  if (!admin.isActive) {
    throw new ApiError(403, 'Your account has been deactivated. Contact the super admin.');
  }

  // Invalidate previous unused OTPs
  await OTP.updateMany(
    { email: normalizedEmail, purpose: 'password_reset', isUsed: false },
    { isUsed: true }
  );

  const otp = generateOTP();
  const otpHash = hashOTP(otp);
  const expiresAt = new Date(Date.now() + config.otp.expiryMinutes * 60 * 1000);

  await OTP.create({
    email: normalizedEmail,
    otpHash,
    purpose: 'password_reset',
    expiresAt,
  });

  await sendOTPEmail(normalizedEmail, otp, 'password_reset');

  logger.info('Admin password reset OTP sent', { email: normalizedEmail });

  return {
    message: `OTP sent to your email (${maskEmail(normalizedEmail)})`,
    expiresAt,
  };
};

export const adminResetPasswordService = async (email, otp, newPassword) => {
  const normalizedEmail = email.toLowerCase();

  const otpRecord = await OTP.findOne({
    email: normalizedEmail,
    purpose: 'password_reset',
    isUsed: false,
  })
    .sort({ createdAt: -1 });

  if (!otpRecord) {
    throw new ApiError(400, 'No active OTP found. Please request a new OTP.');
  }

  if (otpRecord.expiresAt < new Date()) {
    throw new ApiError(400, 'OTP has expired. Please request a new OTP.');
  }

  otpRecord.attempts += 1;

  if (otpRecord.attempts > otpRecord.maxAttempts) {
    otpRecord.isUsed = true;
    await otpRecord.save();
    throw new ApiError(400, 'Maximum OTP attempts exceeded. Please request a new OTP.');
  }

  if (!compareOTP(otp, otpRecord.otpHash)) {
    await otpRecord.save();
    throw new ApiError(401, 'Invalid OTP');
  }

  otpRecord.isUsed = true;
  await otpRecord.save();

  // Update password in whichever model the admin belongs to
  const adminModels = [EnvironmentalAdmin, FacultyAdmin, DepartmentAdmin];
  let updated = false;

  for (const Model of adminModels) {
    const admin = await Model.findOne({ email: normalizedEmail }).select('+password');
    if (admin) {
      admin.password = newPassword;
      await admin.save();
      updated = true;
      break;
    }
  }

  if (!updated) {
    throw new ApiError(404, 'Admin account not found.');
  }

  logger.info('Admin password reset completed', { email: normalizedEmail });

  return {
    message: 'Password reset successful. You can now login with your new password.',
  };
};

export const requestPasswordResetService = async (registrationNumber) => {
  const account = await StudentAccount.findOne({
    registrationNumber: registrationNumber.toUpperCase(),
  }).populate('student');

  if (!account) {
    throw new ApiError(404, 'No account found for this registration number.');
  }

  if (!account.isActive) {
    throw new ApiError(403, 'Your account has been deactivated.');
  }

  const student = account.student;

  // Invalidate previous unused OTPs
  await OTP.updateMany(
    { email: student.email.toLowerCase(), purpose: 'password_reset', isUsed: false },
    { isUsed: true }
  );

  const otp = generateOTP();
  const otpHash = hashOTP(otp);
  const expiresAt = new Date(Date.now() + config.otp.expiryMinutes * 60 * 1000);

  await OTP.create({
    email: student.email.toLowerCase(),
    otpHash,
    purpose: 'password_reset',
    expiresAt,
  });

  await sendOTPEmail(student.email, otp, 'password_reset');

  logger.info('Password reset OTP sent', {
    email: student.email,
    registrationNumber: account.registrationNumber,
  });

  return {
    message: `OTP sent to your school email (${maskEmail(student.email)})`,
    expiresAt,
  };
};

export const resetPasswordService = async (registrationNumber, otp, newPassword) => {
  const account = await StudentAccount.findOne({
    registrationNumber: registrationNumber.toUpperCase(),
  }).populate('student');

  if (!account) {
    throw new ApiError(404, 'No account found for this registration number.');
  }

  const student = account.student;

  const otpRecord = await OTP.findOne({
    email: student.email.toLowerCase(),
    purpose: 'password_reset',
    isUsed: false,
  })
    .sort({ createdAt: -1 });

  if (!otpRecord) {
    throw new ApiError(400, 'No active OTP found. Please request a new OTP.');
  }

  if (otpRecord.expiresAt < new Date()) {
    throw new ApiError(400, 'OTP has expired. Please request a new OTP.');
  }

  otpRecord.attempts += 1;

  if (otpRecord.attempts > otpRecord.maxAttempts) {
    otpRecord.isUsed = true;
    await otpRecord.save();
    throw new ApiError(400, 'Maximum OTP attempts exceeded. Please request a new OTP.');
  }

  if (!compareOTP(otp, otpRecord.otpHash)) {
    await otpRecord.save();
    throw new ApiError(401, 'Invalid OTP');
  }

  otpRecord.isUsed = true;
  await otpRecord.save();

  account.password = newPassword;
  await account.save();

  logger.info('Password reset completed', {
    registrationNumber,
    accountId: account._id,
  });

  return {
    message: 'Password reset successful. You can now login with your new password.',
  };
};

// ─── Token Refresh ───────────────────────────────────────────────────────

export const refreshTokenService = async (refreshToken) => {
  let decoded;

  try {
    decoded = jwt.verify(
      refreshToken,
      config.jwt.refreshSecret
    );
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const Model = adminModelMap[decoded.role] || StudentAccount;

  const user = await Model.findOne({
    _id: decoded.userId,
    refreshToken,
    isActive: true,
  });

  if (!user) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  const { accessToken, refreshToken: newRefreshToken } = generateTokens(
    decoded.userId,
    decoded.role
  );

  await Model.findByIdAndUpdate(decoded.userId, {
    refreshToken: newRefreshToken,
  });

  return { accessToken, refreshToken: newRefreshToken };
};

// ─── Change Password (authenticated) ─────────────────────────────────────

const changePasswordModelMap = {
  student: 'StudentAccount',
  departmentAdmin: 'DepartmentAdmin',
  facultyAdmin: 'FacultyAdmin',
  environmentalAdmin: 'EnvironmentalAdmin',
};

export const changePasswordService = async (userId, role, currentPassword, newPassword) => {
  const Model = mongoose.model(changePasswordModelMap[role]);
  const account = await Model.findById(userId).select('+password');

  if (!account) {
    throw new ApiError(404, 'Account not found');
  }

  const isCurrentValid = await account.comparePassword(currentPassword);

  if (!isCurrentValid) {
    throw new ApiError(401, 'Current password is incorrect');
  }

  account.password = newPassword;
  await account.save();

  return { message: 'Password changed successfully' };
};

// ─── Helper ──────────────────────────────────────────────────────────────

const maskEmail = (email) => {
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `***@${domain}`;
  return `${local[0]}***${local.slice(-1)}@${domain}`;
};
