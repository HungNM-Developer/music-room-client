/**
 * YouTube thumbnails come as hqdefault (480×360, letterboxed). mqdefault is 320×180,
 * 16:9 without black bars and ~3× lighter — enough for every size we show.
 */
export function ytThumb(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.replace(/\/(?:default|hqdefault|sddefault|maxresdefault)\.jpg/, '/mqdefault.jpg');
}
