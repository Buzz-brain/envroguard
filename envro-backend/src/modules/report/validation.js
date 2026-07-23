import { body, param } from 'express-validator';
import { HAZARD_CATEGORIES, REPORT_STATUS, REPORT_PRIORITY } from '../../constants/hazard.js';

export const createReport = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Report title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),
  body('category')
    .notEmpty()
    .withMessage('Hazard category is required')
    .isIn(HAZARD_CATEGORIES)
    .withMessage('Invalid hazard category'),
  body('address')
    .trim()
    .notEmpty()
    .withMessage('Location address is required'),
  body('latitude')
    .notEmpty()
    .withMessage('Latitude is required')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude'),
  body('longitude')
    .notEmpty()
    .withMessage('Longitude is required')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude'),
  body('priority')
    .optional()
    .isIn(Object.values(REPORT_PRIORITY))
    .withMessage('Invalid priority level'),
  body('images')
    .optional()
    .isArray({ min: 0, max: 5 })
    .withMessage('Maximum 5 images allowed'),
  body('images.*.url')
    .if(body('images').exists())
    .notEmpty()
    .withMessage('Image URL is required')
    .isURL()
    .withMessage('Invalid image URL'),
  body('images.*.publicId')
    .if(body('images').exists())
    .notEmpty()
    .withMessage('Image public ID is required'),
];

export const updateReportStatus = [
  param('id').isMongoId().withMessage('Invalid report ID'),
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(Object.values(REPORT_STATUS))
    .withMessage('Invalid status'),
  body('note')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Note cannot exceed 500 characters'),
];

export const assignReport = [
  param('id').isMongoId().withMessage('Invalid report ID'),
  body('adminId')
    .isMongoId()
    .withMessage('Valid hazard admin ID is required'),
];
