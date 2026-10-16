import { Big_Shoulders } from 'next/font/google';

// The mockup's Big Shoulders Display is now part of the Big Shoulders family (with Vietnamese).
export const bigShoulders = Big_Shoulders({ subsets: ['latin', 'vietnamese'], weight: ['600', '800'], variable: '--font-big-shoulders', display: 'swap', preload: false, adjustFontFallback: false });
