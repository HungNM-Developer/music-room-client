'use client';

import { useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/Toast';
import { errorMessage, vi } from '@/i18n/vi';
import { useRoom } from '@/state/hooks';
import { room } from '@/state/room-store';

interface GoogleId {
  initialize(o: {
    client_id: string;
    callback: (r: { credential: string }) => void;
    ux_mode?: 'popup';
    auto_select?: boolean;
    use_fedcm_for_button?: boolean;
  }): void;
  renderButton(el: HTMLElement, o: Record<string, unknown>): void;
}
declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleId } };
  }
}

let loading: Promise<GoogleId> | null = null;
/** Google Identity Services, loaded once and only when a sign-in button is shown. */
function loadGis(): Promise<GoogleId> {
  const ready = window.google?.accounts?.id;
  if (ready) return Promise.resolve(ready);
  loading ??= new Promise<GoogleId>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => (window.google?.accounts?.id ? resolve(window.google.accounts.id) : reject(new Error('gsi')));
    s.onerror = () => {
      loading = null;
      reject(new Error('gsi'));
    };
    document.head.appendChild(s);
  });
  return loading;
}

/** L1: Google's own "Đăng nhập bằng Google" button. Hidden when the server has no client id. */
export function GoogleButton({ width = 280 }: { width?: number }) {
  const clientId = useRoom((s) => s.health?.googleClientId ?? null);
  const box = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => room.start(), []);

  useEffect(() => {
    if (!clientId) return;
    let alive = true;
    void loadGis()
      .then((gis) => {
        if (!alive || !box.current) return;
        gis.initialize({
          client_id: clientId,
          ux_mode: 'popup',
          auto_select: false,
          use_fedcm_for_button: true,
          callback: async ({ credential }) => {
            const r = await room.signInWithGoogle(credential);
            if (r.ok) toast(vi.account.welcome(r.data.user.name), 'success');
            else toast(errorMessage(r.error.code, r.error.params), 'error');
          },
        });
        gis.renderButton(box.current, { theme: 'filled_black', size: 'large', shape: 'pill', text: 'signin_with', locale: 'vi', width });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [clientId, toast, width]);

  if (!clientId) return null;
  return <div ref={box} className="min-h-11" />;
}
