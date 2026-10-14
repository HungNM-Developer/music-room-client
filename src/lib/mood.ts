// "Room mood": the colour of the song on air tints the whole room. We take the dominant
// hue of the artwork and rebuild the surface tokens around it. Lightness of every token
// stays exactly as designed (so text contrast never changes); only hue and a capped
// amount of chroma move. Amber (controls) and on-air red keep their fixed jobs.

export interface Mood {
  /** OKLCH hue in degrees. */
  hue: number;
  /** 0 = grey artwork, 1 = very colourful. */
  vivid: number;
}

/** The designed palette (dial green) — also used when nothing is playing. */
export const DEFAULT_MOOD: Mood = { hue: 183, vivid: 0.55 };

// L fixed per token (measured from the original palette); chroma = base + span × vivid.
const TOKENS = {
  '--color-dial': { l: 0.262, c0: 0.012, cv: 0.04 },
  '--color-dial-deep': { l: 0.221, c0: 0.01, cv: 0.032 },
  '--color-panel': { l: 0.32, c0: 0.014, cv: 0.046 },
  '--color-panel-hi': { l: 0.363, c0: 0.016, cv: 0.05 },
  '--color-line': { l: 0.407, c0: 0.016, cv: 0.05 },
  '--color-sage': { l: 0.79, c0: 0.016, cv: 0.026 },
} as const;

export type MoodVars = Record<keyof typeof TOKENS, string>;

// ---------------------------------------------------------------- colour maths (OKLab)

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function rgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const [lr, lg, lb] = [toLinear(r / 255), toLinear(g / 255), toLinear(b / 255)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** OKLCH → #rrggbb (clamped to sRGB; chroma here is low enough to stay in gamut). */
export function oklchToHex(L: number, C: number, hDeg: number): string {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return `#${rgb
    .map((c) => Math.round(Math.min(1, Math.max(0, toGamma(c))) * 255).toString(16).padStart(2, '0'))
    .join('')}`;
}

// ---------------------------------------------------------------- extraction

/**
 * Dominant hue of an image: a 36-bin hue histogram weighted by chroma (vivid pixels
 * count more, greys and near-black/white barely count). A histogram rather than an
 * average, so red + blue artwork picks one of them instead of a muddy purple.
 */
export function extractMood(img: HTMLImageElement): Mood | null {
  const w = 32;
  const h = 18;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, w, h).data;
  } catch {
    return null; // tainted canvas (no CORS)
  }
  const bins = new Float64Array(36);
  let weightSum = 0;
  let chromaSum = 0;
  for (let i = 0; i < data.length; i += 4) {
    const [L, a, b] = rgbToOklab(data[i], data[i + 1], data[i + 2]);
    const C = Math.hypot(a, b);
    if (L < 0.12 || L > 0.95) continue;
    const wgt = C * C;
    const hue = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
    bins[Math.floor(hue / 10) % 36] += wgt;
    weightSum += wgt;
    chromaSum += C * wgt;
  }
  if (weightSum < 1e-4) return { hue: DEFAULT_MOOD.hue, vivid: 0 };
  let best = 0;
  for (let i = 1; i < 36; i++) if (bins[i] > bins[best]) best = i;
  // Refine inside the winning bin and its neighbours.
  let x = 0;
  let y = 0;
  for (const k of [best - 1, best, best + 1]) {
    const j = (k + 36) % 36;
    const ang = ((j * 10 + 5) * Math.PI) / 180;
    x += Math.cos(ang) * bins[j];
    y += Math.sin(ang) * bins[j];
  }
  const hue = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  const meanChroma = chromaSum / weightSum;
  return { hue, vivid: Math.min(1, meanChroma / 0.14) };
}

export function moodVars(mood: Mood): MoodVars {
  const out = {} as MoodVars;
  for (const [name, t] of Object.entries(TOKENS) as [keyof typeof TOKENS, (typeof TOKENS)[keyof typeof TOKENS]][]) {
    out[name] = oklchToHex(t.l, t.c0 + t.cv * mood.vivid, mood.hue);
  }
  return out;
}
