const SIZES = /\/(?:default|mqdefault|hqdefault|sddefault|maxresdefault)\.jpg/;

/**
 * YouTube thumbnails come as hqdefault (480×360, letterboxed). mqdefault is 320×180,
 * 16:9 without black bars and ~3× lighter — enough for every list and card.
 */
export function ytThumb(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.replace(SIZES, '/mqdefault.jpg');
}

/** 480×360 for full-bleed backdrops and share images; object-fit: cover crops the bars. */
export function ytThumbLarge(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.replace(SIZES, '/hqdefault.jpg');
}
