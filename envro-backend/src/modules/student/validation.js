import { body, param, query } from 'express-validator';

export const updateStudent = [
  param('id').isMongoId().withMessage('Invalid student ID'),
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
  body('department')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Department cannot be empty'),
  body('level')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Level cannot be empty'),
  body('isEligible')
    .optional()
    .isBoolean()
    .withMessage('isEligible must be a boolean'),
];

export const importStudents = [
  body('facultyId')
    .isMongoId()
    .withMessage('Valid faculty ID is required'),
];

export const batchCreateStudents = [
  body('students')
    .isArray({ min: 1, max: 50 })
    .withMessage('Students must be an array with 1-50 entries'),
  body('students.*.registrationNumber')
    .trim()
    .notEmpty()
    .withMessage('Registration number is required')
    .matches(/^\d{11}$/)
    .withMessage('Registration number must be exactly 11 digits'),
  body('students.*.fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ max: 150 })
    .withMessage('Full name cannot exceed 150 characters'),
  body('students.*.email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format'),
  body('students.*.department')
    .trim()
    .notEmpty()
    .withMessage('Department is required'),
  body('students.*.level')
    .trim()
    .notEmpty()
    .withMessage('Level is required'),
];
