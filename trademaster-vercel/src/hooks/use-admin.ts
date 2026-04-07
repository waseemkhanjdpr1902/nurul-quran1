import { useState, useEffect, useCallback } from "react";

const ADMIN_TOKEN_KEY = "trademaster_admin_token";

async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const res = await fetch("/api/trademaster/admin/verify", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function useAdmin() {
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!stored) {
      setVerifying(false);
      return;
    }
    verifyAdminToken(stored).then((valid) => {
      if (valid) {
        setAdminToken(stored);
        setIsAdmin(true);
      } else {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
      }
      setVerifying(false);
    });
  }, []);

  const login = useCallback(async (token: string): Promise<boolean> => {
    const valid = await verifyAdminToken(token);
    if (valid) {
      localStorage.setItem(ADMIN_TOKEN_KEY, token);
      setAdminToken(token);
      setIsAdmin(true);
    }
    return valid;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setAdminToken(null);
    setIsAdmin(false);
  }, []);

  return { isAdmin, adminToken, login, logout, verifying };
}
