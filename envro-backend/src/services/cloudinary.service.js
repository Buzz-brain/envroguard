import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { ApiError } from '../utils/apiError.js';

export const uploadToCloudinary = async (fileBuffer, folder = null) => {
  const targetFolder = folder || config.cloudinary.folder;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: targetFolder,
        resource_type: 'image',
        transformation: [{ quality: 'auto', format: 'auto' }],
      },
      (error, result) => {
        if (error) {
          logger.error('Cloudinary upload failed', { error: error.message });
          reject(new ApiError(500, 'Failed to upload image'));
          return;
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    uploadStream.end(fileBuffer);
  });
};

export const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    logger.debug(`Cloudinary delete result for ${publicId}`, { result });
    return result;
  } catch (error) {
    logger.error('Cloudinary delete failed', { error: error.message, publicId });
  }
};

export const uploadMultipleToCloudinary = async (files, folder = null) => {
  const uploadPromises = files.map((file) =>
    uploadToCloudinary(file.buffer, folder)
  );

  const results = await Promise.allSettled(uploadPromises);

  const successful = results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value);

  const failed = results.filter((r) => r.status === 'rejected').length;

  if (failed > 0) {
    logger.warn(`${failed} out of ${files.length} uploads failed`);

    for (const image of successful) {
      await deleteFromCloudinary(image.publicId);
    }

    throw new ApiError(500, 'Some images failed to upload');
  }

  return successful;
};
