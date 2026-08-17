/**
 * Colour maths used at build time to derive readable variants of the twelve
 * parliamentary group colours, which arrive as fixed data and cannot be chosen.
 *
 * Everything is done in OKLab/OKLCh so lightness moves perceptually and hue is
 * preserved: a group's colour stays that group's colour.
 */

type RGB = [number, number, number];
type OKLCH = { l: number; c: number; h: number };

function clamp01(x: number) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "").trim();
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full.slice(0, 6), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function rgbToHex([r, g, b]: RGB): string {
  const to = (v: number) =>
    Math.round(clamp01(v) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

const toLinear = (v: number) =>
  v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
const toGamma = (v: number) =>
  v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;

function rgbToOklab([r, g, b]: RGB): [number, number, number] {
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToRgb([L, a, b]: [number, number, number]): RGB {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
  return [
    toGamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    toGamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    toGamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

export function hexToOklch(hex: string): OKLCH {
  const [L, a, b] = rgbToOklab(hexToRgb(hex));
  return {
    l: L,
    c: Math.hypot(a, b),
    h: (Math.atan2(b, a) * 180) / Math.PI,
  };
}

function oklchToHex({ l, c, h }: OKLCH): string {
  const rad = (h * Math.PI) / 180;
  return rgbToHex(oklabToRgb([l, Math.cos(rad) * c, Math.sin(rad) * c]));
}

/** Moves a colour to a target OKLCh lightness, keeping hue and chroma. */
export function atLightness(hex: string, l: number): string {
  const { c, h } = hexToOklch(hex);
  return oklchToHex({ l: clamp01(l), c, h });
}

/** Relative luminance (WCAG 2.1). */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hexes. */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Black or white — whichever reads better on `hex`. */
export function inkOn(hex: string): "#000000" | "#ffffff" {
  return contrast(hex, "#000000") >= contrast(hex, "#ffffff")
    ? "#000000"
    : "#ffffff";
}

/**
 * Seat outline on a light plane. Several group colours sit below 3:1 against
 * the surface (the pale pink, the pale blues, the yellow), so every seat gets a
 * hairline in a darkened step of its own hue. That is contrast relief, not
 * decoration — the hue, and therefore the group's identity, is preserved.
 */
export function seatStroke(hex: string): string {
  const { l } = hexToOklch(hex);
  return atLightness(hex, Math.max(0.24, l - 0.22));
}

/**
 * The same job on a dark plane, where the problem is reversed: the deep reds
 * and navies disappear into the background, so those are outlined in a
 * *lighter* step of their own hue. Pale groups keep a darker edge.
 */
export function seatStrokeDark(hex: string): string {
  const { l } = hexToOklch(hex);
  return l < 0.52
    ? atLightness(hex, Math.min(0.82, l + 0.20))
    : atLightness(hex, Math.max(0.3, l - 0.18));
}

/** A darker step of the same hue, readable as text on a pale surface. */
export function textTone(hex: string, surface: string): string {
  let l = hexToOklch(hex).l;
  let out = hex;
  for (let i = 0; i < 24 && contrast(out, surface) < 4.5; i++) {
    l -= 0.03;
    if (l < 0.1) break;
    out = atLightness(hex, l);
  }
  return out;
}

/** A lighter step of the same hue, readable as text on a dark surface. */
export function textToneDark(hex: string, surface: string): string {
  let l = hexToOklch(hex).l;
  let out = hex;
  for (let i = 0; i < 24 && contrast(out, surface) < 4.5; i++) {
    l += 0.03;
    if (l > 0.98) break;
    out = atLightness(hex, l);
  }
  return out;
}

/** A wash of the colour for chip backgrounds, as an rgb() with alpha applied. */
export function tint(hex: string, alpha: number, over: string): string {
  const [r1, g1, b1] = hexToRgb(hex);
  const [r2, g2, b2] = hexToRgb(over);
  return rgbToHex([
    r1 * alpha + r2 * (1 - alpha),
    g1 * alpha + g2 * (1 - alpha),
    b1 * alpha + b2 * (1 - alpha),
  ]);
}
