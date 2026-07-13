import multer from 'multer';
import { ApiError } from '../utils/apiError.js';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    return cb(
      new ApiError(400, 'Only JPEG, PNG, and WebP images are allowed'),
      false
    );
  }

  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 5,
  },
});

export const uploadMiddleware = (fieldName = 'images', maxFiles = 5) => {
  return upload.array(fieldName, maxFiles);
};
