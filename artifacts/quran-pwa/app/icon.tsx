import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          background: 'linear-gradient(135deg, #0f3d20 0%, #1a6b36 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          borderRadius: 96,
        }}
      >
        {/* Crescent moon + star */}
        <div style={{ fontSize: 220, lineHeight: 1 }}>☪️</div>
        <div
          style={{
            color: '#c8a04a',
            fontSize: 56,
            fontWeight: 'bold',
            marginTop: 8,
            letterSpacing: 2,
          }}
        >
          NQ
        </div>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
