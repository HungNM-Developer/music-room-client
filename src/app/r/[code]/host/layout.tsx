import type { Metadata } from 'next';
import { normalizeRoomCode } from '@/contracts/text';

type Params = { params: Promise<{ code: string }> };

/** The speaker page installs as its own app that opens straight onto the speaker. */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const code = normalizeRoomCode((await params).code);
  return { manifest: `/r/${code}/app.webmanifest?host=1` };
}

export default function HostLayout({ children }: { children: React.ReactNode }) {
  return children;
}
