import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const SESSION_KEY = "trademaster_session_id";
const PREMIUM_KEY = "trademaster_is_premium";

interface SessionContextValue {
  sessionId: string;
  isPremium: boolean;
  isLoading: boolean;
  activatePremium: (sid: string) => Promise<void>;
  checkPremium: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function generateSessionId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "tm_";
  for (let i = 0; i < 16; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [sessionId, setSessionId] = useState<string>("");
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        let sid = await AsyncStorage.getItem(SESSION_KEY);
        if (!sid) {
          sid = generateSessionId();
          await AsyncStorage.setItem(SESSION_KEY, sid);
        }
        setSessionId(sid);
        const cachedPremium = await AsyncStorage.getItem(PREMIUM_KEY);
        if (cachedPremium === "true") setIsPremium(true);
      } catch {
        setSessionId(generateSessionId());
      } finally {
        setIsLoading(false);
      }
    };
    void init();
  }, []);

  const checkPremium = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(
        `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/trademaster/subscription/check?sessionId=${encodeURIComponent(sessionId)}`,
        { headers: { "cache-control": "no-cache" } }
      );
      if (res.ok) {
        const data = await res.json() as { isPremium: boolean };
        setIsPremium(data.isPremium);
        await AsyncStorage.setItem(PREMIUM_KEY, data.isPremium ? "true" : "false");
      }
    } catch {
      // ignore
    }
  }, [sessionId]);

  const activatePremium = useCallback(async (sid: string) => {
    await AsyncStorage.setItem(SESSION_KEY, sid);
    await AsyncStorage.setItem(PREMIUM_KEY, "true");
    setSessionId(sid);
    setIsPremium(true);
  }, []);

  return (
    <SessionContext.Provider value={{ sessionId, isPremium, isLoading, activatePremium, checkPremium }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
