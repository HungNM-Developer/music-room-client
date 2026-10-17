import type { Metadata } from 'next';
import { normalizeRoomCode } from '@/contracts/text';
import { RoomPage } from './RoomPage';
import { previewLang, roomMetadata } from './room-metadata';

type Props = { params: Promise<{ code: string }>; searchParams: Promise<{ lang?: string | string[] }> };

/** A shared link carries the sharer's language (`?lang=en`), so its preview is in that language. */
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ code }, { lang }] = await Promise.all([params, searchParams]);
  return roomMetadata(normalizeRoomCode(code), previewLang(lang));
}

export default function Page() {
  return <RoomPage />;
}
