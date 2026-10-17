import type { Metadata } from 'next';
import { TermsContent } from './content';

export const metadata: Metadata = { title: 'Điều khoản sử dụng | Music Room' };

export default function TermsPage() {
  return <TermsContent />;
}
