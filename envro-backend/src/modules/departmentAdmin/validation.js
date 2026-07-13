import { body, param } from 'express-validator';

export const createDepartmentAdmin = [
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ max: 150 })
    .withMessage('Full name cannot exceed 150 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format'),
  body('faculty')
    .isMongoId()
    .withMessage('Valid faculty ID is required'),
  body('department')
    .isMongoId()
    .withMessage('Valid department ID is required'),
];

export const updateDepartmentAdmin = [
  param('id').isMongoId().withMessage('Invalid admin ID'),
  body('fullName')
    .optional()
    .trim()
    .isLength({ max: 150 })
    .withMessage('Full name cannot exceed 150 characters'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email format'),
  body('faculty')
    .optional()
    .isMongoId()
    .withMessage('Valid faculty ID is required'),
  body('department')
    .optional()
    .isMongoId()
    .withMessage('Valid department ID is required'),
];
