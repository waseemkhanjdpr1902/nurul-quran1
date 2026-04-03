import { useState, useEffect } from "react";

interface LocationState {
  lat: number | null;
  lng: number | null;
  error: string | null;
  loading: boolean;
}

export function useLocation() {
  const [state, setState] = useState<LocationState>({
    lat: null,
    lng: null,
    error: null,
    loading: true,
  });

  const getLocation = () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    if (!navigator.geolocation) {
      setState({ lat: null, lng: null, error: "Geolocation not supported", loading: false });
      return;
    }

    // Auto-fallback after 6 seconds so listings always load
    const fallbackTimer = setTimeout(() => {
      setState((s) => s.loading ? { lat: null, lng: null, error: "Location unavailable", loading: false } : s);
    }, 6000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(fallbackTimer);
        setState({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          error: null,
          loading: false,
        });
      },
      (error) => {
        clearTimeout(fallbackTimer);
        setState({
          lat: null,
          lng: null,
          error: error.message,
          loading: false,
        });
      },
      { timeout: 5000, maximumAge: 60000 }
    );
  };

  useEffect(() => {
    getLocation();
  }, []);

  return { ...state, retry: getLocation };
}
