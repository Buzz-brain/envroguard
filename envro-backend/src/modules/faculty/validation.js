import { body, param } from 'express-validator';

export const createFaculty = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Faculty name is required')
    .isLength({ max: 200 })
    .withMessage('Faculty name cannot exceed 200 characters'),
  body('code')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Faculty code cannot exceed 50 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
];

export const updateFaculty = [
  param('id').isMongoId().withMessage('Invalid faculty ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Faculty name cannot exceed 200 characters'),
  body('code')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Faculty code cannot exceed 50 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
];
