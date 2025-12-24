import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// Image metadata
export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
        }}
      >
         <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            width="100%"
            height="100%"
            style={{ filter: 'drop-shadow(0 4px 6px rgba(124, 58, 237, 0.5))' }}
        >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            <circle cx="12" cy="12" r="3" fill="rgba(99, 102, 241, 0.5)" stroke="white" />
            <path d="M12 22v-6" />
            <path d="M22 12c0-5.523-4.477-10-10-10" strokeOpacity="0.5" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
