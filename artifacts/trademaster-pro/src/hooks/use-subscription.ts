import { useState, useEffect, useCallback } from "react";
import { checkSubscription } from "@/lib/api";

const SESSION_KEY = "trademaster_session_id";

// TESTING MODE: set to false before launch to re-enable subscription gating
const TESTING_MODE = true;

export function useSubscription() {
  const [isPremium, setIsPremium] = useState(TESTING_MODE);
  const [loading, setLoading] = useState(!TESTING_MODE);

  const verify = useCallback(async (sessionId: string) => {
    if (TESTING_MODE) return;
    try {
      const data = await checkSubscription(sessionId);
      setIsPremium(!!data.isPremium);
    } catch {
      setIsPremium(false);
    }
  }, []);

  useEffect(() => {
    if (TESTING_MODE) return;
    const sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      setLoading(false);
      return;
    }
    verify(sessionId).finally(() => setLoading(false));
  }, [verify]);

  const activate = useCallback(async (sessionId: string) => {
    if (TESTING_MODE) return;
    localStorage.setItem(SESSION_KEY, sessionId);
    setLoading(true);
    await verify(sessionId);
    setLoading(false);
  }, [verify]);

  return { isPremium, loading, activate };
}
