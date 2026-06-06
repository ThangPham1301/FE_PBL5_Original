import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../shared/config';

export async function saveAuth(accessToken, refreshToken, user) {
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.ACCESS_TOKEN, accessToken || ''],
    [STORAGE_KEYS.REFRESH_TOKEN, refreshToken || ''],
    [STORAGE_KEYS.USER, user ? JSON.stringify(user) : ''],
  ]);
}

export async function getAuth() {
  const values = await AsyncStorage.multiGet([
    STORAGE_KEYS.ACCESS_TOKEN,
    STORAGE_KEYS.REFRESH_TOKEN,
    STORAGE_KEYS.USER,
  ]);

  const map = Object.fromEntries(values);
  const user = map[STORAGE_KEYS.USER] ? JSON.parse(map[STORAGE_KEYS.USER]) : null;

  return {
    accessToken: map[STORAGE_KEYS.ACCESS_TOKEN] || null,
    refreshToken: map[STORAGE_KEYS.REFRESH_TOKEN] || null,
    user,
  };
}

export async function clearAuth() {
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.ACCESS_TOKEN,
    STORAGE_KEYS.REFRESH_TOKEN,
    STORAGE_KEYS.USER,
  ]);
}
