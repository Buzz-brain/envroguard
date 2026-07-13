import { body, param } from 'express-validator';

export const createFacultyAdmin = [
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
    .notEmpty()
    .withMessage('Faculty is required')
    .isMongoId()
    .withMessage('Invalid faculty ID'),
];

export const updateFacultyAdmin = [
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
    .withMessage('Invalid faculty ID'),
];
