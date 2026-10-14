'use client';

import { Check, History, Link2, LogOut, Share2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { IconButton } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { vi } from '@/i18n/vi';
import { useRoom } from '@/state/hooks';
import { room } from '@/state/room-store';

const ShareDialog = dynamic(() => import('./ShareDialog').then((m) => m.ShareDialog), { ssr: false });

export function RoomHeader({ onOpenLog }: { onOpenLog: () => void }) {
  const name = useRoom((s) => s.snapshot?.room.name);
  const code = useRoom((s) => s.snapshot?.room.code);
  const toast = useToast();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  if (!name || !code) return null;

  async function copyLink() {
    const url = `${window.location.origin}/r/${code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast(vi.header.copied, 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast(url);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-dial/80 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <h1 className="type-display truncate text-[20px] font-bold leading-tight">{name}</h1>
          <button
            type="button"
            onClick={copyLink}
            title={vi.header.copyLink}
            className="-ml-1 inline-flex items-center gap-1.5 rounded-md px-1 text-[13px] text-sage hover:text-paper"
          >
            {vi.header.code}
            <span className="type-display text-[15px] font-bold tracking-[0.12em] text-amber">{code}</span>
            {copied ? <Check className="h-3.5 w-3.5 text-amber" aria-hidden /> : <Link2 className="h-3.5 w-3.5" aria-hidden />}
            <span className="sr-only">{vi.header.copyLink}</span>
          </button>
        </div>
        <IconButton label={vi.share.button} onClick={() => setShareOpen(true)}>
          <Share2 className="h-5 w-5" aria-hidden />
        </IconButton>
        <IconButton label={vi.header.log} onClick={onOpenLog}>
          <History className="h-5 w-5" aria-hidden />
        </IconButton>
        <IconButton
          label={vi.header.leave}
          tone="danger"
          onClick={async () => {
            await room.leave();
            router.push('/');
          }}
        >
          <LogOut className="h-5 w-5" aria-hidden />
        </IconButton>
      </div>
      {shareOpen && <ShareDialog onClose={() => setShareOpen(false)} />}
    </header>
  );
}
