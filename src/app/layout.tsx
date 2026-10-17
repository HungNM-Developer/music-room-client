import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro, Bricolage_Grotesque } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';
import { RoomRuntime } from '@/state/hooks';

const body = Be_Vietnam_Pro({
  variable: '--font-body',
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});
const display = Bricolage_Grotesque({
  variable: '--font-display-face',
  subsets: ['latin', 'vietnamese'],
  axes: ['wdth', 'opsz'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Music Room',
  description: 'Cả văn phòng cùng chọn nhạc YouTube, phát chung một loa.',
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
    <html lang="vi" className={`${body.variable} ${display.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <RoomRuntime />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
