import multer from 'multer';
import path from 'path';
import { ApiError } from '../utils/apiError.js';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = [
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const storage = multer.memoryStorage();

const imageFilter = (req, file, cb) => {
  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    return cb(
      new ApiError(400, 'Only JPEG, PNG, and WebP images are allowed'),
      false
    );
  }
  cb(null, true);
};

const documentFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.csv', '.xlsx', '.xls'];
  if (!ALLOWED_DOCUMENT_TYPES.includes(file.mimetype) && !allowedExts.includes(ext)) {
    return cb(
      new ApiError(400, 'Only CSV and Excel files are allowed'),
      false
    );
  }
  cb(null, true);
};

export const uploadImages = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 5 },
});

export const uploadDocuments = multer({
  storage,
  fileFilter: documentFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
});

export const uploadMiddleware = (fieldName = 'images', maxFiles = 5) => {
  return uploadImages.array(fieldName, maxFiles);
};
