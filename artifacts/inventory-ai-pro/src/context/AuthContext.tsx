import React, { createContext, useContext, useState } from "react";

export type Tier = "free" | "pro";

interface User {
  userId: string;
  email: string;
  tier: Tier;
}

interface AuthContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  isFreeTier: boolean;
  isProTier: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>({
    userId: "demo-user",
    email: "owner@example.com",
    tier: "free",
  });

  const isFreeTier = user?.tier === "free";
  const isProTier = user?.tier === "pro";

  return (
    <AuthContext.Provider value={{ user, setUser, isFreeTier, isProTier }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
