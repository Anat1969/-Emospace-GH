import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { SceneParams } from '../lib/types';
import type { RoomWorld } from '../three/room';

export interface SceneHandle { snapshot: () => string | null }

interface Props { params: SceneParams; hour?: number; hero?: boolean; autoTime?: boolean; label: string }

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function webgl() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Mounts the three.js room lazily so the rest of the app stays light. */
const SceneView = forwardRef<SceneHandle, Props>(function SceneView({ params, hour = 10, hero, autoTime, label }, ref) {
  const host = useRef<HTMLDivElement>(null);
  const world = useRef<RoomWorld | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'none'>(() => (webgl() ? 'loading' : 'none'));

  useImperativeHandle(ref, () => ({ snapshot: () => world.current?.snapshot() ?? null }), []);

  useEffect(() => {
    if (state === 'none' || !host.current) return;
    let alive = true;
    let io: IntersectionObserver | null = null;
    import('../three/room').then(({ RoomWorld }) => {
      if (!alive || !host.current) return;
      const w = new RoomWorld(host.current, { hero, reducedMotion: reduced() });
      world.current = w;
      w.build(params);
      w.autoTime = !!autoTime;
      w.setHour(hour);
      io = new IntersectionObserver(([e]) => (e.isIntersecting ? w.start() : w.stop()));
      io.observe(host.current);
      setState('ready');
    });
    // WebGL canvases print blank, so swap in a still frame while printing.
    const before = () => {
      const url = world.current?.snapshot();
      if (!url || !host.current) return;
      const img = document.createElement('img');
      img.className = 'print-shot';
      img.alt = '';
      img.src = url;
      host.current.appendChild(img);
    };
    const after = () => host.current?.querySelectorAll('.print-shot').forEach((n) => n.remove());
    addEventListener('beforeprint', before);
    addEventListener('afterprint', after);
    return () => {
      alive = false;
      removeEventListener('beforeprint', before);
      removeEventListener('afterprint', after);
      io?.disconnect();
      world.current?.dispose();
      world.current = null;
    };
    // Rebuild only when the room itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params), hero]);

  useEffect(() => {
    if (world.current) {
      world.current.autoTime = !!autoTime;
      if (!autoTime) world.current.setHour(hour);
    }
  }, [hour, autoTime, state]);

  return (
    <div className={`scene ${hero ? 'scene-hero' : ''}`} ref={host} role="img" aria-label={label}>
      {state === 'loading' && <div className="scene-msg"><span className="spinner" />בונה את החדר...</div>}
      {state === 'none' && <div className="scene-msg">הדפדפן אינו תומך בתלת־ממד (WebGL). שאר המפה זמינה כרגיל.</div>}
    </div>
  );
});

export default SceneView;
