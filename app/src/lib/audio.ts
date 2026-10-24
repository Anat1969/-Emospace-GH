/** Generative soundscape: every source is synthesised in the browser, no audio files. */
type Source = 'water' | 'birds' | 'wind' | 'music' | 'city' | 'silence';
export const SOURCES: Source[] = ['water', 'birds', 'wind', 'music', 'city', 'silence'];

let ctx: AudioContext | null = null;
const audio = () => (ctx ??= new AudioContext());

function noise(c: AudioContext, kind: 'white' | 'brown' = 'white') {
  const buf = c.createBuffer(1, c.sampleRate * 3, c.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    if (kind === 'brown') {
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    } else d[i] = w;
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  return src;
}

function lfo(c: AudioContext, freq: number, depth: number, target: AudioParam) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.frequency.value = freq;
  g.gain.value = depth;
  o.connect(g).connect(target);
  o.start();
  return o;
}

interface Channel { gain: GainNode; stop: () => void }

function build(c: AudioContext, s: Source, out: AudioNode): Channel {
  const gain = c.createGain();
  gain.gain.value = 0;
  gain.connect(out);
  const nodes: AudioScheduledSourceNode[] = [];
  let timer = 0;
  const filter = (type: BiquadFilterType, f: number, q = 0.7) => {
    const b = c.createBiquadFilter();
    b.type = type;
    b.frequency.value = f;
    b.Q.value = q;
    return b;
  };
  if (s === 'water' || s === 'wind' || s === 'silence' || s === 'city') {
    const n = noise(c, s === 'city' ? 'brown' : 'white');
    const amp = c.createGain();
    amp.gain.value = 0.5;
    let chain: AudioNode;
    if (s === 'water') {
      const bp = filter('bandpass', 900, 0.6);
      chain = bp;
      nodes.push(lfo(c, 0.23, 0.25, amp.gain), lfo(c, 0.71, 300, bp.frequency));
      n.connect(bp).connect(filter('lowpass', 3200)).connect(amp);
    } else if (s === 'wind') {
      const bp = filter('bandpass', 500, 4);
      chain = bp;
      nodes.push(lfo(c, 0.08, 350, bp.frequency), lfo(c, 0.13, 0.3, amp.gain));
      n.connect(bp).connect(amp);
    } else if (s === 'city') {
      chain = filter('lowpass', 260);
      n.connect(chain).connect(amp);
    } else {
      chain = filter('lowpass', 900);
      amp.gain.value = 0.12;
      n.connect(chain).connect(amp);
    }
    amp.connect(gain);
    n.start();
    nodes.push(n);
  } else if (s === 'birds') {
    const chirp = () => {
      const t = c.currentTime;
      const count = 2 + Math.floor(Math.random() * 4);
      const base = 2400 + Math.random() * 1800;
      for (let i = 0; i < count; i++) {
        const o = c.createOscillator();
        const g = c.createGain();
        const at = t + i * (0.09 + Math.random() * 0.05);
        o.frequency.setValueAtTime(base, at);
        o.frequency.exponentialRampToValueAtTime(base * (1.3 + Math.random() * 0.4), at + 0.07);
        g.gain.setValueAtTime(0, at);
        g.gain.linearRampToValueAtTime(0.18, at + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, at + 0.09);
        o.connect(g).connect(gain);
        o.start(at);
        o.stop(at + 0.1);
      }
      timer = window.setTimeout(chirp, 900 + Math.random() * 2600);
    };
    chirp();
  } else if (s === 'music') {
    const chords = [[220, 277.2, 329.6, 415.3], [196, 246.9, 293.7, 370], [174.6, 220, 261.6, 329.6], [196, 246.9, 311.1, 392]];
    const lp = filter('lowpass', 1400);
    lp.connect(gain);
    let step = 0;
    const play = () => {
      const t = c.currentTime;
      for (const f of chords[step++ % chords.length]) {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'triangle';
        o.frequency.value = f;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.07, t + 2);
        g.gain.linearRampToValueAtTime(0, t + 7.5);
        o.connect(g).connect(lp);
        o.start(t);
        o.stop(t + 7.6);
      }
      timer = window.setTimeout(play, 6000);
    };
    play();
  }
  return {
    gain,
    stop: () => {
      clearTimeout(timer);
      nodes.forEach((n) => n.stop());
      gain.disconnect();
    },
  };
}

export class Soundscape {
  private channels = new Map<Source, Channel>();
  private master: GainNode | null = null;

  get playing() {
    return !!this.master;
  }

  async start(mix: Record<string, number>) {
    const c = audio();
    await c.resume();
    if (!this.master) {
      this.master = c.createGain();
      this.master.gain.value = 0;
      this.master.connect(c.destination);
      this.master.gain.linearRampToValueAtTime(0.8, c.currentTime + 1.2);
    }
    this.setMix(mix);
  }

  setMix(mix: Record<string, number>) {
    const c = audio();
    if (!this.master) return;
    for (const s of SOURCES) {
      const v = mix[s] ?? 0;
      let ch = this.channels.get(s);
      if (!ch && v > 0) this.channels.set(s, (ch = build(c, s, this.master)));
      ch?.gain.gain.linearRampToValueAtTime(v, c.currentTime + 0.8);
    }
  }

  stop() {
    const c = audio();
    const m = this.master;
    if (!m) return;
    m.gain.linearRampToValueAtTime(0, c.currentTime + 0.6);
    const chans = [...this.channels.values()];
    this.channels.clear();
    this.master = null;
    setTimeout(() => {
      chans.forEach((ch) => ch.stop());
      m.disconnect();
    }, 700);
  }
}

/** One shared preview player for the questionnaire. */
const preview = new Soundscape();
let previewTimer = 0;
export async function previewSource(s: string) {
  clearTimeout(previewTimer);
  preview.stop();
  await new Promise((r) => setTimeout(r, 50));
  await preview.start({ [s]: s === 'silence' ? 1 : 0.7 });
  previewTimer = window.setTimeout(() => preview.stop(), 4000);
}
