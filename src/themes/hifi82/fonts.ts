import { Barlow, Barlow_Condensed } from 'next/font/google';

export const barlow = Barlow({ subsets: ['latin', 'vietnamese'], weight: ['400', '500', '600'], variable: '--font-barlow', display: 'swap', preload: false });
export const barlowCondensed = Barlow_Condensed({
  subsets: ['latin', 'vietnamese'],
  weight: ['500', '600'],
  variable: '--font-barlow-condensed',
  display: 'swap',
  preload: false,
});
