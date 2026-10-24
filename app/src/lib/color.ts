export interface HSL { h: number; s: number; l: number }

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
}

export function hexToHsl(hex: string): HSL {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return { h, s, l };
}

export function hslToHex({ h, s, l }: HSL): string {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

/** Circular mean of hues, weighted. */
export function meanHue(hues: { h: number; w: number }[]): number {
  let x = 0;
  let y = 0;
  for (const { h, w } of hues) {
    x += Math.cos((h * Math.PI) / 180) * w;
    y += Math.sin((h * Math.PI) / 180) * w;
  }
  if (x === 0 && y === 0) return 35;
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export const hueDistance = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

/** Pull a hue toward a target by t (0..1) along the short arc. */
export function pullHue(h: number, target: number, t: number): number {
  let d = target - h;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return (h + d * t + 360) % 360;
}

/** Approximate blackbody colour (Tanner Helland's fit), returns hex. */
export function kelvinToHex(k: number): string {
  const t = clamp(k, 1000, 40000) / 100;
  const r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  const g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  return rgbToHex(r, g, b);
}

const HUE_NAMES: [number, string][] = [
  [12, 'אדום'], [28, 'טרקוטה'], [42, 'ענבר'], [55, 'אוכרה'], [72, 'חרדל'], [95, 'זית'], [135, 'מרווה'],
  [165, 'ירקרק'], [195, 'טורקיז'], [215, 'כחול ים'], [245, 'אינדיגו'], [285, 'לבנדר'], [320, 'שזיף'], [345, 'ורוד עתיק'], [361, 'אדום'],
];

export function colorName(hex: string): string {
  const { h, s, l } = hexToHsl(hex);
  if (s < 0.1) return l > 0.85 ? 'לבן גיר' : l > 0.6 ? 'אפור אבן' : l > 0.3 ? 'אפור גרפיט' : 'פחם';
  const base = HUE_NAMES.find(([lim]) => h < lim)![1];
  if (l > 0.82) return `${base} חיוור`;
  if (l > 0.65) return `${base} רך`;
  if (l < 0.28) return `${base} עמוק`;
  return base;
}

/** WCAG relative luminance contrast. */
export function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = hexToRgb(hex).map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
