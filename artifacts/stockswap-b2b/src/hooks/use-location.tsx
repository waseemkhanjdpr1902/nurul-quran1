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
      setState({ lat: null, lng: null, error: "Geolocation is not supported by your browser", loading: false });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          error: null,
          loading: false,
        });
      },
      (error) => {
        setState({
          lat: null,
          lng: null,
          error: error.message,
          loading: false,
        });
      }
    );
  };

  useEffect(() => {
    getLocation();
  }, []);

  return { ...state, retry: getLocation };
}
