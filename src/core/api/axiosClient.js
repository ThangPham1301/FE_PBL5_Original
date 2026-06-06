import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, STORAGE_KEYS } from '../../shared/config';

let unauthorizedHandler = null;

function maskSensitive(payload) {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  const clone = Array.isArray(payload) ? [...payload] : { ...payload };
  const sensitiveKeys = ['password', 'refresh', 'access', 'token', 'authorization'];

  for (const key of Object.keys(clone)) {
    if (sensitiveKeys.includes(String(key).toLowerCase())) {
      clone[key] = '***';
    }
  }

  return clone;
}

function logApiError(error) {
  const method = String(error?.config?.method || 'UNKNOWN').toUpperCase();
  const url = error?.config?.url || 'unknown-url';
  const baseURL = error?.config?.baseURL || 'unknown-baseURL';
  const status = error?.response?.status || 'NO_STATUS';
  const code = error?.code || 'NO_CODE';
  const responseData = error?.response?.data || null;
  const requestData = maskSensitive(error?.config?.data);
  const requestParams = maskSensitive(error?.config?.params);

  console.error('[API_ERROR]', {
    method,
    url,
    baseURL,
    status,
    code,
    message: error?.message || 'Request failed',
    request: {
      params: requestParams,
      data: requestData,
    },
    response: responseData,
  });
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 giây cho requests lớn (face registration với 5 ảnh)
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

axiosInstance.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    logApiError(error);

    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER,
      ]);
      if (unauthorizedHandler) {
        unauthorizedHandler();
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
