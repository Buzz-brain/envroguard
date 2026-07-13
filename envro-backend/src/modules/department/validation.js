import { body, param } from 'express-validator';

export const createDepartment = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Department name is required')
    .isLength({ max: 200 })
    .withMessage('Department name cannot exceed 200 characters'),
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Department code is required')
    .isLength({ max: 20 })
    .withMessage('Department code cannot exceed 20 characters')
    .toUpperCase(),
  body('faculty')
    .isMongoId()
    .withMessage('Valid faculty ID is required'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
];

export const updateDepartment = [
  param('id').isMongoId().withMessage('Invalid department ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Department name cannot exceed 200 characters'),
  body('code')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Department code cannot exceed 20 characters')
    .toUpperCase(),
  body('faculty')
    .optional()
    .isMongoId()
    .withMessage('Valid faculty ID is required'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
];
