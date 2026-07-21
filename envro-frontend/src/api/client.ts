import axios from 'axios';
import { getItem, setItem } from '../utils/storage';
import { API_BASE_URL } from '../constants';

let sessionExpiredHandler: (() => void) | null = null;
let isRefreshing = false;
let isSessionExpired = false;

export function onSessionExpired(handler: () => void) {
  sessionExpiredHandler = handler;
}

export function setSessionExpiredHandler(handler: () => void) {
  sessionExpiredHandler = handler;
}

export function resetSessionState() {
  isSessionExpired = false;
  isRefreshing = false;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
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
    if (axios.isCancel(error)) return Promise.reject(error);

    const originalRequest = error.config;
    const data = error.response?.data;

    if (data?.errors?.length) {
      error.userMessage = data.errors[0].message;
    } else if (data?.message) {
      error.userMessage = data.message;
    } else if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        error.userMessage = 'The request is taking longer than expected. Please check your connection and try again.';
      } else {
        error.userMessage = 'No internet connection. Please check your connection and try again.';
      }
    } else if (error.response?.status >= 500) {
      error.userMessage = 'Something went wrong on our end. Please try again later.';
    } else {
      error.userMessage = 'Something went wrong. Please try again.';
    }

    if (error.response?.status === 401 && !originalRequest._retry && !isSessionExpired) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return Promise.reject(error);
      }

      isRefreshing = true;
      try {
        const refreshToken = await getItem('refreshToken');
        if (!refreshToken) {
          isSessionExpired = true;
          sessionExpiredHandler?.();
          return Promise.reject(error);
        }
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh-token`, { refreshToken });
        const { accessToken, refreshToken: newRefresh } = data.data;
        await setItem('accessToken', accessToken);
        await setItem('refreshToken', newRefresh);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch {
        isSessionExpired = true;
        sessionExpiredHandler?.();
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
