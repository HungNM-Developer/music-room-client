import { Cormorant_Garamond } from 'next/font/google';

export const cormorant = Cormorant_Garamond({
  subsets: ['latin', 'vietnamese'],
  weight: ['500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
  preload: false,
});
