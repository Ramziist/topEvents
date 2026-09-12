import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TOP Events — Door Check-in',
    short_name: 'TOP Events',
    description: 'Event management & door check-in for TOP Events by Ziena Suliman',
    start_url: '/scanner',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#e76620',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
