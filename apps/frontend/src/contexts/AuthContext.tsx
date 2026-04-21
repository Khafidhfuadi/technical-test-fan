'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/axios';
import { User } from '../types';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  updateUser: (updated: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  const fetchMe = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const { data } = await api.get('/api/users/me');
      setUser(data.data as User);
    } catch (error) {
      setUser(null);
      localStorage.removeItem('token');
      document.cookie = 'token=; Max-Age=0; path=/';
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data } = await api.post('/api/auth/login', { email, password });

      localStorage.setItem('token', data.accessToken);
      // Sync cookie so the Next.js middleware gets access to the token
      document.cookie = `token=${data.accessToken}; path=/; max-age=86400`;

      setUser(data.user);
      setIsLoading(false);
      router.push('/home');
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const updateUser = (updated: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updated } : prev));
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.post('/api/auth/logout');
    } catch (error) {
      // ignore silently
    } finally {
      localStorage.removeItem('token');
      document.cookie = 'token=; Max-Age=0; path=/';
      setUser(null);
      setIsLoading(false);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, fetchMe, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
