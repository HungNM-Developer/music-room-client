import { ytThumb } from '@/lib/thumbs';

/** YouTube cover, cropped square or 16:9, lazy and sized so the row never jumps. */
export function Thumb({
  url,
  size,
  ratio = 'square',
  className = '',
}: {
  url: string | null | undefined;
  size: number;
  ratio?: 'square' | 'wide';
  className?: string;
}) {
  const src = ytThumb(url);
  const h = ratio === 'square' ? size : Math.round((size * 9) / 16);
  return (
    <div
      className={`shrink-0 overflow-hidden rounded-[10px] bg-line ${className}`}
      style={{ width: size, height: h }}
      aria-hidden
    >
      {src && (
        // eslint-disable-next-line @next/next/no-img-element -- remote YouTube image, already sized
        <img src={src} alt="" width={size} height={h} loading="lazy" decoding="async" className="h-full w-full object-cover" />
      )}
    </div>
  );
}
