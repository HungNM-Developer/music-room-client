import type { Metadata, Viewport } from 'next';
import '@/fonts/be-vietnam-pro.css';
import '@/fonts/bricolage-grotesque.css';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';
import { dictFor } from '@/i18n/dict';
import { LangRuntime } from '@/i18n/LangRuntime';
import { RoomRuntime } from '@/state/hooks';

// Self-hosted fonts (src/fonts, made by scripts/selfhost-fonts.mjs): a build never depends on
// Google Fonts answering in a shape the bundler can read. The classes set --font-body /
// --font-display-face.
const fontVars = 'fontvar-be-vietnam-pro fontvar-bricolage-grotesque';

export const metadata: Metadata = {
  title: 'Music Room',
  description: dictFor('vi').meta.description,
  appleWebApp: { capable: true, title: 'Music Room', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
  themeColor: '#0f2a26',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={fontVars} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <RoomRuntime />
        <LangRuntime />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
