import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';
import { RoomProvider } from '@/context/RoomContext';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin', 'latin-ext'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Music Room — Cùng chọn nhạc',
  description: 'Cả văn phòng cùng chọn nhạc YouTube, phát chung một loa.',
};

export const viewport: Viewport = { themeColor: '#0b0b16', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
        <ToastProvider>
          <RoomProvider>{children}</RoomProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
