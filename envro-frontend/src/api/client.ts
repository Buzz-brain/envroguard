import axios from 'axios';
import { getItem, setItem } from '../utils/storage';
import { API_BASE_URL } from '../constants';

let sessionExpiredHandler: (() => void) | null = null;

export function onSessionExpired(handler: () => void) {
  sessionExpiredHandler = handler;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config: any) => {
  const token = await getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response: any) => response,
  async (error: any) => {
    const originalRequest = error.config;

    // Extract a user-friendly error message
    const data = error.response?.data;
    if (data?.errors?.length) {
      error.userMessage = data.errors[0].message;
      if (data.message === 'Validation failed' || data.message === 'Validation error') {
        data.message = data.errors[0].message;
      }
    } else if (data?.message) {
      error.userMessage = data.message;
    } else {
      error.userMessage = 'Something went wrong. Please try again.';
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh-token`, { refreshToken });
        const { accessToken, refreshToken: newRefresh } = data.data;
        await setItem('accessToken', accessToken);
        await setItem('refreshToken', newRefresh);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch {
        sessionExpiredHandler?.();
      }
    }
    return Promise.reject(error);
  }
);

export default api;
