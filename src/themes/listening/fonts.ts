import { Fraunces } from 'next/font/google';

export const fraunces = Fraunces({
  subsets: ['latin', 'vietnamese'],
  style: ['normal', 'italic'],
  axes: ['opsz'],
  variable: '--font-fraunces',
  display: 'swap',
  preload: false,
});
