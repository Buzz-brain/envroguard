import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getItem, setItem, deleteItem } from '../utils/storage';
import { onSessionExpired, resetSessionState, wakeUpServer } from '../api/client';
import { authApi } from '../api/auth';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (user: User, accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
    onSessionExpired(async () => {
      await deleteItem('accessToken');
      await deleteItem('refreshToken');
      await deleteItem('user');
      setUser(null);
    });
  }, []);

  const loadStoredAuth = async () => {
    wakeUpServer();
    try {
      const token = await getItem('accessToken');
      const storedUser = await getItem('user');
      if (token && storedUser) {
        try {
          const { data } = await authApi.getCurrentUser();
          if (data.success) {
            setUser(data.data);
            await setItem('user', JSON.stringify(data.data));
            return;
          }
        } catch {
          // Token is invalid — clear everything
        }
        await deleteItem('accessToken');
        await deleteItem('refreshToken');
        await deleteItem('user');
      }
    } catch {
      // No stored auth
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (userData: User, accessToken: string, refreshToken: string) => {
    resetSessionState();
    await setItem('accessToken', accessToken);
    await setItem('refreshToken', refreshToken);
    await setItem('user', JSON.stringify(userData));
    await setItem('lastRole', userData.role);
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch {}
    await deleteItem('accessToken');
    await deleteItem('refreshToken');
    await deleteItem('user');
    await deleteItem('lastRole');
    setUser(null);
  }, []);

  const updateUser = useCallback((userData: User) => {
    setUser(userData);
    setItem('user', JSON.stringify(userData));
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated: !!user, login, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
