import type { Metadata } from 'next';
import { normalizeRoomCode } from '@/contracts/text';
import { roomMetadata } from './room-metadata';

type Params = { params: Promise<{ code: string }> };

/** Vietnamese previews for every page under the room (the player page); the room page itself follows `?lang`. */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  return roomMetadata(normalizeRoomCode((await params).code), 'vi');
}

export default function RoomLayout({ children }: { children: React.ReactNode }) {
  return children;
}
