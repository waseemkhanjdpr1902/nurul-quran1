import { useState, useEffect, useCallback } from "react";
import { checkSubscription } from "@/lib/api";

const SESSION_KEY = "trademaster_session_id";

export function useSubscription() {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  const verify = useCallback(async (sessionId: string) => {
    try {
      const data = await checkSubscription(sessionId);
      setIsPremium(!!data.isPremium);
    } catch {
      setIsPremium(false);
    }
  }, []);

  useEffect(() => {
    const sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      setLoading(false);
      return;
    }
    verify(sessionId).finally(() => setLoading(false));
  }, [verify]);

  const activate = useCallback(async (sessionId: string) => {
    localStorage.setItem(SESSION_KEY, sessionId);
    setLoading(true);
    await verify(sessionId);
    setLoading(false);
  }, [verify]);

  return { isPremium, loading, activate };
}
