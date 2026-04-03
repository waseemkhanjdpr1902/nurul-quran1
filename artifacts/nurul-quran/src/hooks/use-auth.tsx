import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetCurrentUserQueryKey } from '@workspace/api-client-react';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('nurulquran_token');
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const response = await fetch('/api/users/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          }
        });
        if (!response.ok) throw new Error('Auth check failed');
        const userData = await response.json() as User;
        setUser(userData);
      } catch (error) {
        localStorage.removeItem('nurulquran_token');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = (token: string, user: User) => {
    localStorage.setItem('nurulquran_token', token);
    setUser(user);
    // queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
  };

  const logout = () => {
    localStorage.removeItem('nurulquran_token');
    setUser(null);
    queryClient.clear();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
