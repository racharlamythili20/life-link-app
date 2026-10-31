// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { Inter, Orbitron } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { Providers } from '@/components/Providers';
import { Footer } from '@/components/Footer';

const inter = Inter({ 
  subsets: ['latin'], 
  variable: '--font-body',
});

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '700', '900'],
});

export const metadata: Metadata = {
  title: 'LifeLink – Real-Time Blood Donation System',
  description: 'Connect blood donors with patients in real-time. Emergency blood requests, GPS-based donor matching, and live notifications.',
  keywords: ['blood donation', 'emergency', 'blood bank', 'donor matching', 'healthcare'],
  authors: [{ name: 'LifeLink' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'LifeLink',
  },
  openGraph: {
    title: 'LifeLink – Save Lives in Real Time',
    description: 'Emergency blood donation platform connecting donors and patients.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#dc2626',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" rel="stylesheet" />
      </head>
      <body className={`${inter.variable} ${orbitron.variable} bg-[#0a0a0f] text-white antialiased`}>
        <Providers>
          {children}
          <Footer />
        </Providers>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#111118',
              color: '#f8fafc',
              border: '1px solid rgba(220, 38, 38, 0.3)',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#111118' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#111118' } },
          }}
        />
      </body>
    </html>
  );
}
