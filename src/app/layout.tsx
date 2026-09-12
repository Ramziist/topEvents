import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/Toaster';
import RegisterSW from '@/components/RegisterSW';

export const metadata: Metadata = {
  title: 'TOP Events — Dashboard',
  description: 'Event management dashboard for TOP Events by Ziena Suliman',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#e76620',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Tajawal:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
        <RegisterSW />
      </body>
    </html>
  );
}
