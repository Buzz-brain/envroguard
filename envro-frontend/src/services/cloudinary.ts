import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

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

const toBase64DataUri = async (uri: string): Promise<string> => {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const mimeType = getMimeType(uri);
  return `data:${mimeType};base64,${base64}`;
};

export const uploadToCloudinary = async (uri: string): Promise<CloudinaryImage> => {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary configuration missing. Check app settings.');
  }

  const dataUri = await toBase64DataUri(uri);

  const body = new URLSearchParams();
  body.append('file', dataUri);
  body.append('upload_preset', UPLOAD_PRESET);
  body.append('public_id', `reports/hazard_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);

  const response = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
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
