import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { config } from '../config/index.js';
import { ApiError } from '../utils/apiError.js';
import { ROLES } from '../constants/roles.js';

const roleModelMap = {
  [ROLES.STUDENT]: 'StudentAccount',
  [ROLES.DEPARTMENT_ADMIN]: 'DepartmentAdmin',
  [ROLES.FACULTY_ADMIN]: 'FacultyAdmin',
  [ROLES.ENVIRONMENTAL_ADMIN]: 'EnvironmentalAdmin',
};

const verifyToken = (token, type) => {
  const secret =
    type === 'access'
      ? config.jwt.secret
      : config.jwt.refreshSecret;

  return jwt.verify(token, secret);
};

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Access token is required');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token, 'access');

    const Model = mongoose.model(roleModelMap[decoded.role]);
    const user = await Model.findById(decoded.userId).select('-refreshToken');

    if (!user || !user.isActive) {
      throw new ApiError(401, 'User not found or account is deactivated');
    }

    const userData = {
      id: user._id,
      role: decoded.role,
      email: user.email,
      faculty: user.faculty || null,
    };

    if (user.role === 'departmentAdmin') {
      userData.department = user.department;
      if (user.department) {
        const Department = mongoose.model('Department');
        const dept = await Department.findById(user.department).select('name code');
        userData.departmentName = dept?.name;
        userData.departmentCode = dept?.code;
      }
    }

    req.user = userData;

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    next(new ApiError(401, 'Invalid or expired token'));
  }
};

export const generateTokens = (userId, role) => {
  const accessToken = jwt.sign(
    { userId, role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  const refreshToken = jwt.sign(
    { userId, role },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );

  return { accessToken, refreshToken };
};

export const authenticateOptional = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token, 'access');

    const Model = mongoose.model(roleModelMap[decoded.role]);
    const user = await Model.findById(decoded.userId).select('-refreshToken');

    if (!user || !user.isActive) {
      req.user = null;
      return next();
    }

    const userData = {
      id: user._id,
      role: decoded.role,
      email: user.email,
      faculty: user.faculty || null,
    };

    if (user.role === 'departmentAdmin') {
      userData.department = user.department;
    }

    req.user = userData;

    next();
  } catch {
    req.user = null;
    next();
  }
};
