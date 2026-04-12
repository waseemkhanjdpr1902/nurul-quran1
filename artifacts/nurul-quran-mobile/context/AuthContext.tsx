import React, { createContext, useContext } from "react";

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
  isAuthenticated: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthContext.Provider value={{
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
      login: async () => {},
      logout: async () => {},
      refreshUser: async () => {},
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
