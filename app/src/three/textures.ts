import * as THREE from 'three';
import { hexToHsl, hslToHex } from '../lib/color';

/** Deterministic PRNG so the same analysis always paints the same room. */
export function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(size = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')!] as const;
}

function finish(c: HTMLCanvasElement, repeat = 1, color = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const shade = (hex: string, dl: number, ds = 0) => {
  const c = hexToHsl(hex);
  return hslToHex({ h: c.h, s: Math.max(0, Math.min(1, c.s + ds)), l: Math.max(0, Math.min(1, c.l + dl)) });
};

function speckle(g: CanvasRenderingContext2D, r: () => number, n: number, size: number, alpha: number, light = true) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = light ? `rgba(255,255,255,${r() * alpha})` : `rgba(0,0,0,${r() * alpha})`;
    const s = r() * size + 0.5;
    g.fillRect(r() * 512, r() * 512, s, s);
  }
}

function clouds(g: CanvasRenderingContext2D, r: () => number, n: number, alpha: number) {
  for (let i = 0; i < n; i++) {
    const x = r() * 512;
    const y = r() * 512;
    const rad = 30 + r() * 120;
    const grad = g.createRadialGradient(x, y, 0, x, y, rad);
    const dark = r() > 0.5;
    grad.addColorStop(0, dark ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    for (const dx of [-512, 0, 512]) for (const dy of [-512, 0, 512]) {
      g.save();
      g.translate(dx, dy);
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      g.restore();
    }
  }
}

export function woodTexture(hex: string, seed = 1) {
  const [c, g] = canvas();
  const r = rng(seed);
  const plank = 64;
  for (let row = 0; row < 512 / plank; row++) {
    let x = -r() * 300;
    while (x < 512) {
      const len = 180 + r() * 260;
      g.fillStyle = shade(hex, (r() - 0.5) * 0.12, (r() - 0.5) * 0.08);
      g.fillRect(x, row * plank, len, plank);
      for (let k = 0; k < 14; k++) {
        const y0 = row * plank + r() * plank;
        g.strokeStyle = `rgba(40,20,5,${0.05 + r() * 0.08})`;
        g.lineWidth = 0.6 + r() * 1.4;
        g.beginPath();
        for (let px = 0; px <= len; px += 8) g.lineTo(x + px, y0 + Math.sin((px + k * 40) / (30 + k * 6)) * 2.2);
        g.stroke();
      }
      g.fillStyle = 'rgba(20,10,0,0.35)';
      g.fillRect(x, row * plank, 1.5, plank);
      x += len;
    }
    g.fillStyle = 'rgba(20,10,0,0.3)';
    g.fillRect(0, row * plank, 512, 1.5);
  }
  return finish(c, 0.45);
}

export function stoneTexture(hex: string, seed = 2, chips: string[] = []) {
  const [c, g] = canvas();
  const r = rng(seed);
  g.fillStyle = hex;
  g.fillRect(0, 0, 512, 512);
  clouds(g, r, 26, 0.07);
  speckle(g, r, 9000, 1.6, 0.18, false);
  speckle(g, r, 6000, 1.4, 0.2, true);
  if (chips.length) {
    for (let i = 0; i < 900; i++) {
      g.fillStyle = shade(chips[Math.floor(r() * chips.length)], (r() - 0.5) * 0.2);
      g.beginPath();
      const x = r() * 512;
      const y = r() * 512;
      const s = 1.5 + r() * 6;
      g.moveTo(x, y);
      for (let k = 0; k < 5; k++) g.lineTo(x + (r() - 0.5) * s * 2, y + (r() - 0.5) * s * 2);
      g.fill();
    }
  } else {
    g.strokeStyle = 'rgba(0,0,0,0.12)';
    g.lineWidth = 1.2;
    for (let y = 0; y <= 512; y += 256) for (let x = 0; x <= 512; x += 256) g.strokeRect(x + (y % 512 ? 128 : 0), y, 256, 256);
  }
  return finish(c, 0.4);
}

export function plasterTexture(hex: string, seed = 3) {
  const [c, g] = canvas();
  const r = rng(seed);
  g.fillStyle = hex;
  g.fillRect(0, 0, 512, 512);
  clouds(g, r, 40, 0.035);
  speckle(g, r, 4000, 1.2, 0.05, false);
  return finish(c, 0.35);
}

export function fabricTexture(seed = 4) {
  const [c, g] = canvas(256);
  const r = rng(seed);
  g.fillStyle = '#e9e9e9';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 256; i += 2) {
    g.fillStyle = `rgba(0,0,0,${0.04 + r() * 0.06})`;
    g.fillRect(i, 0, 1, 256);
    g.fillStyle = `rgba(255,255,255,${0.05 + r() * 0.08})`;
    g.fillRect(0, i, 256, 1);
  }
  const t = finish(c, 4);
  return t;
}

/** An abstract artwork painted from the client's own palette. */
export function artTexture(colors: string[], curvature: number, seed = 5) {
  const [c, g] = canvas(512);
  const r = rng(seed);
  g.fillStyle = colors[0];
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 7; i++) {
    g.fillStyle = colors[1 + (i % (colors.length - 1))];
    g.globalAlpha = 0.55 + r() * 0.4;
    const x = r() * 512;
    const y = 120 + r() * 360;
    const s = 80 + r() * 200;
    g.beginPath();
    if (curvature > 0.45) {
      if (i % 2) g.arc(x, y, s / 2, 0, Math.PI * 2);
      else {
        g.moveTo(x - s / 2, 512);
        g.lineTo(x - s / 2, y);
        g.arc(x, y, s / 2, Math.PI, 0);
        g.lineTo(x + s / 2, 512);
      }
    } else g.rect(x - s / 2, y - s / 2, s, s * (0.4 + r()));
    g.fill();
  }
  g.globalAlpha = 1;
  return finish(c, 1);
}

export function skyMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { top: { value: new THREE.Color('#7fb1e0') }, horizon: { value: new THREE.Color('#f1e6d2') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader:
      'uniform vec3 top; uniform vec3 horizon; varying vec3 vP; void main(){ float h = clamp(vP.y*1.6+0.15,0.,1.); gl_FragColor = vec4(mix(horizon, top, pow(h,0.8)),1.); }',
  });
}

export function shaftMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { color: { value: new THREE.Color('#fff2d8') }, strength: { value: 0.2 } },
    vertexShader: 'attribute float fade; varying float vF; void main(){ vF = fade; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform vec3 color; uniform float strength; varying float vF; void main(){ gl_FragColor = vec4(color * strength * pow(vF,1.4), 1.); }',
  });
}
