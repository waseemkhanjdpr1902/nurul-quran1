import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: 'linear-gradient(135deg, #0f3d20 0%, #1a6b36 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          borderRadius: 40,
        }}
      >
        <div style={{ fontSize: 80, lineHeight: 1 }}>☪️</div>
        <div style={{ color: '#c8a04a', fontSize: 22, fontWeight: 'bold', marginTop: 4 }}>NQ</div>
      </div>
    ),
    { width: 180, height: 180 }
  );
}
