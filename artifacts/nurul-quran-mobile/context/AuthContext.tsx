import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const TOKEN_KEY = "nurulquran_token";
const USER_KEY = "nurulquran_user";

export interface User {
  id: number;
  email: string;
  name: string;
  isPremium: boolean;
  subscriptionPlan?: string | null;
  subscriptionEnd?: string | null;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

setAuthTokenGetter(async () => {
  return await AsyncStorage.getItem(TOKEN_KEY);
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const login = useCallback(async (newToken: string, newUser: User) => {
    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, newToken),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(newUser)),
    ]);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(async () => {
    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(USER_KEY),
    ]);
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
    if (!storedToken) return;
    try {
      const res = await fetch(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/users/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        const updated: User = {
          id: data.id,
          email: data.email,
          name: data.name,
          isPremium: data.isPremium ?? false,
          subscriptionPlan: data.subscriptionPlan,
          subscriptionEnd: data.subscriptionEnd,
        };
        setUser(updated);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(updated));
      }
    } catch {
      // ignore
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
