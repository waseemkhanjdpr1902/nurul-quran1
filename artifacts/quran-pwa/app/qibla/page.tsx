'use client';

import { useEffect, useState, useRef } from 'react';

const MECCA_LAT = 21.4225;
const MECCA_LON = 39.8262;

function calcQibla(lat: number, lon: number): number {
  const φ1 = (lat * Math.PI) / 180;
  const φ2 = (MECCA_LAT * Math.PI) / 180;
  const Δλ = ((MECCA_LON - lon) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

function degToCardinal(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'];
  return dirs[Math.round(deg / 45)];
}

export default function QiblaPage() {
  const [qibla, setQibla] = useState<number | null>(null);
  const [compassHeading, setCompassHeading] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [permission, setPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  const getLocation = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported on this device.'); return; }
    setLoading(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lon: longitude });
        setQibla(calcQibla(latitude, longitude));
        setDistance(haversineKm(latitude, longitude, MECCA_LAT, MECCA_LON));
        setPermission('granted');
        setLoading(false);
      },
      (err) => {
        setPermission('denied');
        setError(err.code === 1
          ? 'Location permission denied. Please allow location access in your browser settings.'
          : 'Could not determine your location. Please try again.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Device orientation for live compass
  useEffect(() => {
    const handler = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null) setCompassHeading(e.alpha);
    };
    window.addEventListener('deviceorientation', handler, true);
    return () => window.removeEventListener('deviceorientation', handler, true);
  }, []);

  const needleRotation = qibla !== null ? qibla - compassHeading : 0;

  return (
    <div className="max-w-md mx-auto px-4 py-6 pb-24 md:pb-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Qibla Direction</h1>
        <p className="text-gray-500 text-sm">اتِّجَاهُ الْقِبْلَةِ — Direction of the Holy Kaaba</p>
      </div>

      {/* Compass */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-lg p-8 mb-6 flex flex-col items-center">
        <div className="relative w-64 h-64 mb-6">
          {/* Compass rose */}
          <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full">
            {/* Outer ring */}
            <circle cx="100" cy="100" r="95" fill="none" stroke="#e5e7eb" strokeWidth="2" />
            <circle cx="100" cy="100" r="78" fill="none" stroke="#f3f4f6" strokeWidth="1" />

            {/* Cardinal directions */}
            <text x="100" y="16" textAnchor="middle" className="font-bold" fontSize="14" fill="#6b7280">N</text>
            <text x="185" y="105" textAnchor="middle" fontSize="12" fill="#9ca3af">E</text>
            <text x="100" y="192" textAnchor="middle" fontSize="12" fill="#9ca3af">S</text>
            <text x="15" y="105" textAnchor="middle" fontSize="12" fill="#9ca3af">W</text>

            {/* Tick marks */}
            {Array.from({ length: 36 }).map((_, i) => {
              const angle = (i * 10 * Math.PI) / 180;
              const isMajor = i % 9 === 0;
              const r1 = isMajor ? 78 : 83;
              const r2 = 90;
              const x1 = 100 + r1 * Math.sin(angle);
              const y1 = 100 - r1 * Math.cos(angle);
              const x2 = 100 + r2 * Math.sin(angle);
              const y2 = 100 - r2 * Math.cos(angle);
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={isMajor ? '#9ca3af' : '#d1d5db'} strokeWidth={isMajor ? 2 : 1} />;
            })}

            {/* Qibla needle */}
            {qibla !== null && (
              <g transform={`rotate(${needleRotation} 100 100)`}>
                <polygon points="100,20 95,100 100,88 105,100" fill="#1a6b36" />
                <polygon points="100,180 95,100 100,112 105,100" fill="#d1d5db" />
                <circle cx="100" cy="100" r="8" fill="#1a6b36" />
                <text x="100" y="60" textAnchor="middle" fontSize="14">🕋</text>
              </g>
            )}

            {!qibla && (
              <g>
                <circle cx="100" cy="100" r="40" fill="#f9fafb" />
                <text x="100" y="108" textAnchor="middle" fontSize="24">☪️</text>
              </g>
            )}
          </svg>
        </div>

        {qibla !== null ? (
          <div className="text-center">
            <div className="text-4xl font-bold mb-1" style={{ color: '#1a6b36' }}>{Math.round(qibla)}°</div>
            <div className="text-gray-500 text-sm">{degToCardinal(qibla)} from your location</div>
            {distance && (
              <div className="mt-2 text-sm text-gray-400">{Math.round(distance).toLocaleString()} km to Mecca</div>
            )}
            {coords && (
              <div className="mt-1 text-xs text-gray-300">{coords.lat.toFixed(4)}°N, {coords.lon.toFixed(4)}°E</div>
            )}
          </div>
        ) : (
          <div className="text-center">
            <p className="text-gray-400 text-sm">Allow location to find Qibla direction</p>
          </div>
        )}
      </div>

      {/* Get location button */}
      {qibla === null && (
        <button
          onClick={getLocation}
          disabled={loading}
          className="w-full py-4 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 shadow-md"
          style={{ backgroundColor: '#1a6b36' }}
        >
          {loading ? (
            <><span className="animate-spin">⏳</span> Getting location…</>
          ) : (
            <><span>📍</span> Find Qibla Direction</>
          )}
        </button>
      )}

      {qibla !== null && (
        <button
          onClick={getLocation}
          className="w-full py-3 rounded-2xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50"
        >
          🔄 Refresh Location
        </button>
      )}

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">{error}</div>
      )}

      {/* Instructions */}
      <div className="mt-6 bg-green-50 border border-green-100 rounded-2xl p-5">
        <h3 className="font-semibold text-green-800 mb-2">How to use</h3>
        <ol className="text-sm text-green-700 space-y-1.5 list-decimal list-inside">
          <li>Tap "Find Qibla Direction" and allow location access</li>
          <li>Hold your phone flat and parallel to the ground</li>
          <li>Rotate until the green needle points to the 🕋 icon</li>
          <li>That direction is Qibla (towards Mecca)</li>
        </ol>
      </div>

      <p className="text-xs text-center text-gray-400 mt-4">
        Calculation uses the Great Circle method · Kaaba: 21.4225°N, 39.8262°E
      </p>
    </div>
  );
}
