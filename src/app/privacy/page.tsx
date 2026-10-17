import type { Metadata } from 'next';
import { PrivacyContent } from './content';

export const metadata: Metadata = { title: 'Chính sách quyền riêng tư | Music Room' };

export default function PrivacyPage() {
  return <PrivacyContent />;
}
