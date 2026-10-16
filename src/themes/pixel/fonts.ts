import { VT323 } from 'next/font/google';

// Pixelify Sans (the mockup's title face) has no Vietnamese glyphs; VT323 does.
export const vt323 = VT323({ subsets: ['latin', 'vietnamese'], weight: '400', variable: '--font-vt323', display: 'swap', preload: false });
