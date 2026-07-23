const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

export interface CloudinaryImage {
  url: string;
  publicId: string;
}

const getMimeType = (uri: string): string => {
  const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };
  return mimeMap[ext] || 'image/jpeg';
};

export const uploadToCloudinary = async (uri: string): Promise<CloudinaryImage> => {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary configuration missing. Check app settings.');
  }

  const formData = new FormData();
  formData.append('file', {
    uri,
    type: getMimeType(uri),
    name: `hazard_${Date.now()}.jpg`,
  } as any);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('public_id', `reports/hazard_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);

  const response = await fetch(UPLOAD_URL, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error?.message || 'Image upload failed');
  }

  const result = await response.json();
  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
};

export const uploadMultipleToCloudinary = async (
  uris: string[],
  onProgress?: (completed: number, total: number) => void
): Promise<CloudinaryImage[]> => {
  const results: CloudinaryImage[] = [];

  for (let i = 0; i < uris.length; i++) {
    try {
      const result = await uploadToCloudinary(uris[i]);
      results.push(result);
      onProgress?.(i + 1, uris.length);
    } catch (error) {
      // Rollback: delete already uploaded images
      for (const uploaded of results) {
        try {
          await deleteFromCloudinary(uploaded.publicId);
        } catch {}
      }
      throw error;
    }
  }

  return results;
};

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  // Deletion requires API secret (backend-only)
  // This is a placeholder — actual deletion happens server-side
};
