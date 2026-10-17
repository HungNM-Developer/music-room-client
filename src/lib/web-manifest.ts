import type { MetadataRoute } from 'next';

/**
 * Installable app ("Cài đặt ứng dụng" / "Thêm vào màn hình chính"). Besides the icon and the
 * full-screen window, Chrome lets an installed app play sound without a first tap — so a
 * speaker machine opened from its icon starts playing on its own, even after a restart.
 */
export function webManifest(opts: { id: string; name: string; startUrl: string }): MetadataRoute.Manifest {
  return {
    id: opts.id,
    name: opts.name,
    short_name: 'Music Room',
    description: 'Cả văn phòng cùng chọn nhạc YouTube, phát chung một loa.',
    lang: 'vi',
    start_url: opts.startUrl,
    scope: '/',
    display: 'standalone',
    background_color: '#0f2a26',
    theme_color: '#0f2a26',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
