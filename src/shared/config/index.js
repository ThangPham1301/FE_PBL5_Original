import { Platform } from 'react-native';

const DEFAULT_API_HOST = Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';

function normalizeApiBaseUrl(rawValue) {
  const value = String(rawValue || '').trim();
  if (!value) {
    return null;
  }
  const trimmed = value.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

const ENV_API_BASE_URL = normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);

export const API_BASE_URL = ENV_API_BASE_URL || `http://${DEFAULT_API_HOST}:8000/api`;

const PLATFORM_FALLBACK_HOSTS = Platform.OS === 'android'
  ? ['10.0.2.2', '127.0.0.1', 'localhost']
  : ['127.0.0.1', 'localhost', '10.0.2.2'];

const PLATFORM_FALLBACK_URLS = PLATFORM_FALLBACK_HOSTS.map((host) => `http://${host}:8000/api`);

export const API_BASE_URL_FALLBACKS = Array.from(
  new Set([API_BASE_URL, ...PLATFORM_FALLBACK_URLS])
);

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
};
