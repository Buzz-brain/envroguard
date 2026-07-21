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
  timeout: 60000,
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

    if (!error.response && !originalRequest._retry && originalRequest.method !== 'get') {
      originalRequest._retry = true;
      await new Promise(r => setTimeout(r, 2000));
      return api(originalRequest);
    }

    if (data?.errors?.length) {
      error.userMessage = data.errors[0].message;
    } else if (data?.message) {
      error.userMessage = data.message;
    } else if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        error.userMessage = 'Server is waking up. Please wait a moment and try again.';
      } else {
        error.userMessage = 'Unable to reach the server. Check your internet connection.';
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

let wakePromise: Promise<void> | null = null;

function getBaseUrl() {
  return API_BASE_URL.replace('/api/v1', '');
}

export function wakeUpServer() {
  if (!wakePromise) {
    wakePromise = axios.get(`${getBaseUrl()}/health`, { timeout: 90000 })
      .catch(() => {})
      .then(() => { wakePromise = null; });
  }
  return wakePromise;
}

export default api;
