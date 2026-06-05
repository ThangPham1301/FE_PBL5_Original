import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authAPI } from '../services/api';
import { clearAuth, getAuth, saveAuth } from '../services/storage';
import { setUnauthorizedHandler } from '../services/axiosConfig';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const auth = await getAuth();
        setAccessToken(auth.accessToken);
        setRefreshToken(auth.refreshToken);
        setUser(auth.user);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logoutLocal();
    });
  }, []);

  const logoutLocal = async () => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    await clearAuth();
  };

  const login = async (username, password) => {
    const response = await authAPI.login(username, password);
    const payload = response.data?.data;

    if (!payload?.access || !payload?.refresh || !payload?.user) {
      throw new Error('Dữ liệu đăng nhập không hợp lệ.');
    }

    setAccessToken(payload.access);
    setRefreshToken(payload.refresh);
    setUser(payload.user);
    await saveAuth(payload.access, payload.refresh, payload.user);
  };

  const logout = async () => {
    const tokenToRevoke = refreshToken;
    const accessToRevoke = accessToken;
    await logoutLocal();

    if (tokenToRevoke) {
      authAPI.logout(tokenToRevoke, accessToRevoke).catch(() => {
        // Local logout must not depend on network availability.
      });
    }
  };

  const value = useMemo(
    () => ({
      user,
      accessToken,
      refreshToken,
      isLoading,
      isAuthenticated: Boolean(accessToken),
      login,
      logout,
    }),
    [user, accessToken, refreshToken, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
