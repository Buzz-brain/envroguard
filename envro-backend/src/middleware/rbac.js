import { ApiError } from '../utils/apiError.js';
import mongoose from 'mongoose';

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

/**
 * Enforces that a faculty/department admin can only operate on resources that
 * belong to their own faculty. The target resource's actual faculty is resolved
 * from the database (never trusted from the client). An environmental admin can
 * operate anywhere.
 */
export const authorizeFaculty = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    if (req.user.role === 'environmentalAdmin') {
      return next();
    }

    if (!req.user.faculty) {
      return next(new ApiError(403, 'You are not assigned to any faculty'));
    }

    const userFaculty = req.user.faculty.toString();

    // Client-supplied faculty claim (used on create where the resource does not
    // exist yet). Must match the admin's own faculty.
    const suppliedFaculty = req.body?.faculty || req.query?.faculty || req.params?.facultyId;
    if (suppliedFaculty && suppliedFaculty.toString() !== userFaculty) {
      return next(
        new ApiError(403, 'You can only manage resources within your assigned faculty')
      );
    }

    // DB-resolved faculty: for updates/toggles/deletes the target already exists.
    if (req.params?.id) {
      const Department = mongoose.model('Department');
      const department = await Department.findById(req.params.id).select('faculty').lean();

      if (!department) {
        return next(new ApiError(404, 'Department not found'));
      }

      if (!department.faculty || department.faculty.toString() !== userFaculty) {
        return next(
          new ApiError(403, 'You can only manage resources within your assigned faculty')
        );
      }
    } else if (!suppliedFaculty) {
      // Cannot prove scope on create without an explicit/valid faculty.
      return next(new ApiError(403, 'Unable to verify faculty scope'));
    }

    next();
  } catch (error) {
    next(error);
  }
};
