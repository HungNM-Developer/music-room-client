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
interface GoogleOAuth2 {
  initTokenClient(o: {
    client_id: string;
    scope: string;
    callback: (r: { access_token?: string; error?: string }) => void;
    error_callback?: (e: { type?: string }) => void;
  }): { requestAccessToken(o?: { prompt?: string }): void };
  revoke(token: string, done?: () => void): void;
}
declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleId; oauth2?: GoogleOAuth2 } };
  }
}

let loading: Promise<GoogleId> | null = null;
/** Google Identity Services, loaded once and only when a Google feature is used. */
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
  // Google draws the button in an iframe with a light color scheme. Under our dark page
  // Chrome would paint an opaque white box behind it; matching the scheme here keeps it clear.
  return <div ref={box} className="min-h-11" style={{ colorScheme: 'light' }} />;
}

const YOUTUBE_SCOPE = 'https://www.googleapis.com/auth/youtube.readonly';

/** L3: load Google's script ahead of time, so the permission popup can open on the click itself. */
export function preloadGis(): void {
  void loadGis().catch(() => undefined);
}

/**
 * L3: a short-lived, read-only YouTube access token from a Google popup (null when the
 * person closes it or says no). Call it straight from a click: browsers block popups
 * that open after an await, so the script must already be loaded (preloadGis).
 */
export function requestYouTubeToken(clientId: string): Promise<string | null> {
  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) return Promise.resolve(null);
  return new Promise((resolve) => {
    oauth2
      .initTokenClient({
        client_id: clientId,
        scope: YOUTUBE_SCOPE,
        callback: (r) => resolve(r.access_token ?? null),
        error_callback: () => resolve(null),
      })
      .requestAccessToken({ prompt: '' });
  });
}

/** Gives the YouTube permission back as soon as the import is done. */
export function revokeYouTubeToken(token: string): void {
  window.google?.accounts?.oauth2?.revoke(token);
}
