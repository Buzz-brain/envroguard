import { ApiError } from '../utils/apiError.js';

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ApiError(403, 'You do not have permission to perform this action')
      );
    }

    next();
  };
};

export const authorizeFaculty = (req, res, next) => {
  if (!req.user) {
    return next(new ApiError(401, 'Authentication required'));
  }

  if (req.user.role === 'environmentalAdmin') {
    return next();
  }

  if (!req.user.faculty) {
    return next(
      new ApiError(403, 'You are not assigned to any faculty')
    );
  }

  const targetFaculty =
    req.params.facultyId ||
    req.body.faculty ||
    req.query.faculty;

  if (targetFaculty && (req.user.role === 'facultyAdmin' || req.user.role === 'departmentAdmin')) {
    if (req.user.faculty.toString() !== targetFaculty.toString()) {
      return next(
        new ApiError(
          403,
          'You can only manage resources within your assigned faculty'
        )
      );
    }
  }

  next();
};
