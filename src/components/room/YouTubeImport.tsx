'use client';

import { Loader2, Youtube } from 'lucide-react';
import { useEffect, useState } from 'react';
import { preloadGis, requestYouTubeToken, revokeYouTubeToken } from '@/components/account/GoogleButton';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Thumb } from '@/components/ui/Thumb';
import { useToast } from '@/components/ui/Toast';
import type { YouTubePlaylistView } from '@/contracts';
import { errorMessage, vi } from '@/i18n/vi';
import { useRoom } from '@/state/hooks';
import { room } from '@/state/room-store';

type Row = { source: 'liked' | string; title: string; count: number | null; thumb: string | null; imported: boolean };

/**
 * L3: "Nhập từ YouTube" — a read-only YouTube permission (popup), the user's liked
 * videos and playlists, and one-tap import into personal playlists. The token lives
 * only in this dialog and is given back when it closes.
 */
export function YouTubeImport({ onImported }: { onImported: () => void }) {
  const clientId = useRoom((s) => s.health?.googleClientId ?? null);
  const toast = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [musicOnly, setMusicOnly] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => preloadGis(), []);

  if (!clientId) return null;

  async function connect() {
    setConnecting(true);
    const t = await requestYouTubeToken(clientId!);
    if (!t) {
      setConnecting(false);
      toast(vi.ytImport.cancelled, 'info');
      return;
    }
    const r = await room.send('youtube:library', { accessToken: t });
    setConnecting(false);
    if (!r.ok) {
      revokeYouTubeToken(t);
      toast(errorMessage(r.error.code, r.error.params), 'error');
      return;
    }
    setToken(t);
    setRows([
      { source: 'liked', title: vi.ytImport.liked, count: null, thumb: null, imported: Boolean(r.data.likedImportedId) },
      ...r.data.playlists.map((p: YouTubePlaylistView) => ({
        source: p.id,
        title: p.title,
        count: p.itemCount,
        thumb: p.thumbnailUrl,
        imported: Boolean(p.importedId),
      })),
    ]);
  }

  function close() {
    if (token) revokeYouTubeToken(token);
    setToken(null);
    setRows(null);
  }

  async function importRow(row: Row) {
    if (!token) return;
    setBusy(row.source);
    const r = await room.send('youtube:import', { accessToken: token, source: row.source, musicOnly });
    setBusy(null);
    if (!r.ok) return toast(errorMessage(r.error.code, r.error.params), 'error');
    toast(vi.ytImport.done(r.data.name, r.data.imported, r.data.skipped), 'success');
    setRows((rs) => rs?.map((x) => (x.source === row.source ? { ...x, imported: true } : x)) ?? null);
    onImported();
  }

  return (
    <>
      <Button size="sm" disabled={connecting} aria-busy={connecting} onClick={connect}>
        {connecting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Youtube className="h-4 w-4" aria-hidden />}
        {connecting ? vi.ytImport.connecting : vi.ytImport.open}
      </Button>
      {rows && (
        <Dialog open onClose={close} title={vi.ytImport.title}>
          <p className="text-[13px] text-sage">{vi.ytImport.note}</p>
          <label className="mt-3 flex min-h-11 items-center gap-3">
            <input type="checkbox" className="h-5 w-5 accent-amber" checked={musicOnly} onChange={(e) => setMusicOnly(e.target.checked)} />
            {vi.ytImport.musicOnly}
          </label>
          <ul aria-label={vi.ytImport.listLabel} className="mt-2 max-h-[50vh] divide-y divide-line/70 overflow-y-auto">
            {rows.map((row) => (
              <li key={row.source} className="flex items-center gap-3 py-2.5">
                {row.thumb ? (
                  <Thumb url={row.thumb} size={48} />
                ) : (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-row bg-dial-deep text-sage">
                    <Youtube className="h-5 w-5" aria-hidden />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{row.title}</span>
                  {row.count !== null && <span className="text-[12px] text-sage">{vi.ytImport.count(row.count)}</span>}
                </span>
                <Button size="sm" variant={row.imported ? 'secondary' : 'primary'} disabled={busy !== null} aria-busy={busy === row.source} onClick={() => importRow(row)}>
                  {busy === row.source && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  {row.imported ? vi.ytImport.update : vi.ytImport.import}
                </Button>
              </li>
            ))}
          </ul>
          {rows.length === 1 && <p className="mt-2 text-[13px] text-sage">{vi.ytImport.empty}</p>}
        </Dialog>
      )}
    </>
  );
}
