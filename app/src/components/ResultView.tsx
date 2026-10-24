import { useEffect, useRef, useState } from 'react';
import { Soundscape } from '../lib/audio';
import { contrast, kelvinToHex } from '../lib/color';
import type { Analysis } from '../lib/types';
import SceneView, { type SceneHandle } from './SceneView';
import { toast } from './Toast';

const CHAPTERS = [
  ['profile', 'פרופיל רגשי'], ['color', 'קוד צבע'], ['proportions', 'פרופורציות'], ['lighting', 'תאורה'],
  ['materials', 'חומרים'], ['sound', 'נוף קולי'], ['transitions', 'מעברים'], ['timeline', 'לוח זמנים'],
  ['rooms', 'חדרים'], ['insights', 'תובנות'],
] as const;

const hourLabel = (h: number) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

function Radar({ axes }: { axes: Analysis['emotional_profile']['axes'] }) {
  const R = 100;
  const pt = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
    return [150 + Math.cos(a) * R * v, 135 + Math.sin(a) * R * v];
  };
  return (
    <svg className="radar" viewBox="0 0 300 270" role="img" aria-label="מפת הצירים הרגשיים">
      {[0.25, 0.5, 0.75, 1].map((s) => (
        <polygon key={s} className="grid" points={axes.map((_, i) => pt(i, s).join(',')).join(' ')} />
      ))}
      {axes.map((ax, i) => {
        const [x, y] = pt(i, 1.18);
        return (
          <g key={ax.id}>
            <line className="grid" x1="150" y1="135" x2={pt(i, 1)[0]} y2={pt(i, 1)[1]} />
            <text x={x} y={y} textAnchor="middle" dominantBaseline="middle">{ax.value >= 50 ? ax.high : ax.low}</text>
          </g>
        );
      })}
      <polygon className="shape" points={axes.map((ax, i) => pt(i, Math.max(0.06, ax.value / 100)).join(',')).join(' ')} />
      {axes.map((ax, i) => {
        const [x, y] = pt(i, Math.max(0.06, ax.value / 100));
        return <circle key={ax.id} className="node" cx={x} cy={y} r="4" />;
      })}
    </svg>
  );
}

function LightChart({ schedule }: { schedule: Analysis['lighting_plan']['schedule'] }) {
  const pts = [{ time: '00:00', kelvin: schedule[3].kelvin, lux: 5 }, ...schedule, { time: '24:00', kelvin: schedule[3].kelvin, lux: 5 }];
  const x = (t: string) => 20 + (Number(t.slice(0, 2)) / 24) * 560;
  const y = (lux: number) => 150 - (lux / 600) * 120;
  return (
    <svg className="light-chart" viewBox="0 0 600 190" role="img" aria-label="עקומת עוצמה וגוון האור לאורך היממה">
      <defs>
        <linearGradient id="kband" x1="0" x2="1">
          {pts.map((p) => <stop key={p.time} offset={`${(Number(p.time.slice(0, 2)) / 24) * 100}%`} stopColor={kelvinToHex(p.kelvin)} />)}
        </linearGradient>
      </defs>
      <rect x="20" y="160" width="560" height="14" rx="7" fill="url(#kband)" />
      <path className="lux" d={pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.time)} ${y(p.lux)}`).join(' ')} />
      {schedule.map((p) => (
        <g key={p.time}>
          <circle cx={x(p.time)} cy={y(p.lux)} r="5" fill={kelvinToHex(p.kelvin)} className="node" />
          <text x={x(p.time)} y={y(p.lux) - 12} textAnchor="middle">{p.lux} לוקס</text>
          <text x={x(p.time)} y="186" textAnchor="middle" className="dim">{p.time}</text>
        </g>
      ))}
    </svg>
  );
}

export default function ResultView({ r, client, actions }: { r: Analysis; client: string; actions?: React.ReactNode }) {
  const [hour, setHour] = useState(10);
  const [auto, setAuto] = useState(false);
  const [sound, setSound] = useState(false);
  const [active, setActive] = useState('profile');
  const scape = useRef<Soundscape | null>(null);
  const scene = useRef<SceneHandle>(null);

  useEffect(() => () => scape.current?.stop(), []);
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-40% 0px -55% 0px' },
    );
    CHAPTERS.forEach(([id]) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  const toggleSound = async () => {
    scape.current ??= new Soundscape();
    if (sound) scape.current.stop();
    else await scape.current.start(r.soundscape_strategy.mix);
    setSound(!sound);
  };

  const snap = () => {
    const url = scene.current?.snapshot();
    if (!url) return toast('התמונה אינה זמינה');
    const a = document.createElement('a');
    a.href = url;
    a.download = `emospace-${client}-${hourLabel(hour).replace(':', '')}.png`;
    a.click();
  };

  const pal = r.color_code.palette;
  const sc = r.scene;

  return (
    <div className="result" style={{ '--accent-r': pal[2].hex, '--base-r': pal[0].hex, '--anchor-r': pal[3].hex } as React.CSSProperties}>
      <section className="result-hero">
        <div className="result-title">
          <p className="eyebrow">המפה האדריכלית־רגשית · {client}</p>
          <h1>{r.archetype.name}</h1>
          <p className="lead">{r.archetype.tagline}</p>
          <div className="mini-pal big" aria-hidden="true">{pal.map((s) => <span key={s.hex} style={{ background: s.hex, flex: s.share }} />)}</div>
        </div>
        <div className="scene-wrap">
          <SceneView ref={scene} params={sc} hour={hour} autoTime={auto} label={`הדמיה תלת־ממדית של ${r.archetype.name}: תקרה ${sc.ceiling} מטר, ${hourLabel(hour)}`} />
          <div className="scene-controls">
            <label className="time">
              <span>{auto ? 'יממה' : hourLabel(hour)}</span>
              <input type="range" min={5} max={23.5} step={0.25} value={hour} aria-label="שעה ביום" onChange={(e) => { setAuto(false); setHour(Number(e.target.value)); }} />
            </label>
            <button className={`icon-btn ${auto ? 'on' : ''}`} onClick={() => setAuto(!auto)} aria-pressed={auto} title="הרצת יממה">☼</button>
            <button className={`icon-btn ${sound ? 'on' : ''}`} onClick={toggleSound} aria-pressed={sound} title="נוף קולי">♫</button>
            <button className="icon-btn" onClick={snap} title="שמירת תמונה">⤓</button>
          </div>
          <p className="scene-hint">גררו כדי להסתובב · גלגלת או צביטה לקירוב</p>
        </div>
      </section>

      <nav className="chapters" aria-label="פרקי המפה">
        {CHAPTERS.map(([id, label], i) => (
          <button key={id} className={active === id ? 'on' : ''} aria-current={active === id ? 'true' : undefined} onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}>
            {i < 8 && <span>{i + 1}</span>}{label}
          </button>
        ))}
      </nav>
      {actions && <div className="result-actions">{actions}</div>}

      <section id="profile" className="chapter">
        <h2><span>01</span>פרופיל רגשי</h2>
        <div className="split">
          <Radar axes={r.emotional_profile.axes} />
          <div>
            <div className="emo-row">{r.emotional_profile.dominant.map((d, i) => <span key={d.id} className="emo-pill" style={{ opacity: 1 - i * 0.2 }}>{d.label}</span>)}</div>
            <p className="lead">{r.emotional_profile.summary}</p>
            {r.emotional_profile.memory && <p className="quote">זיכרון מעגן: {r.emotional_profile.memory}</p>}
            <div className="axes">
              {r.emotional_profile.axes.map((a) => (
                <div key={a.id} className="axis"><small>{a.low}</small><div><span style={{ insetInlineStart: `${a.value}%` }} /></div><small>{a.high}</small></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="color" className="chapter">
        <h2><span>02</span>קוד צבע</h2>
        <div className="palette-bar">{pal.map((s) => <span key={s.hex} style={{ background: s.hex, flex: s.share }} />)}</div>
        <div className="cards four">
          {pal.map((s) => (
            <button key={s.hex} className="card swatch-card" onClick={() => navigator.clipboard?.writeText(s.hex).then(() => toast(`${s.hex} הועתק`), () => {})}>
              <span className="sw" style={{ background: s.hex }} />
              <b>{s.name}</b>
              <code dir="ltr">{s.hex.toUpperCase()}</code>
              <small>{s.role} · {s.share}%</small>
            </button>
          ))}
        </div>
        <p className="muted">{r.color_code.rule}. ניגודיות טקסט עוגן על בסיס: {contrast(pal[0].hex, pal[3].hex).toFixed(1)}:1 {contrast(pal[0].hex, pal[3].hex) >= 4.5 ? '(עומד ב-WCAG AA)' : '(מתחת ל-AA, לשימוש דקורטיבי בלבד)'}.</p>
        <ul className="bullets">{r.color_code.notes.map((n) => <li key={n}>{n}</li>)}</ul>
      </section>

      <section id="proportions" className="chapter">
        <h2><span>03</span>פרופורציות</h2>
        <div className="kpis">
          <div><b>{r.proportions.ceiling.toFixed(2)}</b><span>מ' תקרה במרחב המרכזי</span></div>
          <div><b>{r.proportions.entryCeiling.toFixed(2)}</b><span>מ' תקרה בכניסה</span></div>
          <div><b>{r.proportions.windowToWall}%</b><span>יחס חלון לקיר</span></div>
        </div>
        <p><b>יחס אורך־רוחב:</b> {r.proportions.ratio}</p>
        <p><b>שפת צורה:</b> {r.proportions.curvature}</p>
        <ul className="bullets">{r.proportions.notes.map((n) => <li key={n}>{n}</li>)}</ul>
      </section>

      <section id="lighting" className="chapter">
        <h2><span>04</span>תוכנית תאורה</h2>
        <LightChart schedule={r.lighting_plan.schedule} />
        <div className="table">
          {r.lighting_plan.schedule.map((s) => (
            <div key={s.time} className="tr"><span className="k" style={{ background: kelvinToHex(s.kelvin) }} /><b>{s.time}</b><span>{s.kelvin}K · {s.lux} לוקס</span><small>{s.note}</small></div>
          ))}
        </div>
        <div className="cards two">{r.lighting_plan.layers.map((l) => <div key={l.layer} className="card"><b>{l.layer}</b><p>{l.detail}</p></div>)}</div>
      </section>

      <section id="materials" className="chapter">
        <h2><span>05</span>קוד חומרים</h2>
        <div className="cards four">
          {r.materials_code.map((m) => (
            <div key={m.role} className="card mat-card">
              <span className="sw" style={{ background: m.hex }} />
              <small className="eyebrow">{m.role}</small>
              <b>{m.name}</b>
              <p>{m.finish}</p>
              <small className="muted">{m.why}</small>
            </div>
          ))}
        </div>
      </section>

      <section id="sound" className="chapter">
        <h2><span>06</span>אסטרטגיית נוף קולי</h2>
        <div className="kpis">
          <div><b>{r.soundscape_strategy.rt60}</b><span>זמן הדהוד יעד (RT60)</span></div>
          <div><b dir="ltr">NRC</b><span>{r.soundscape_strategy.nrc}</span></div>
        </div>
        {r.soundscape_strategy.masking.length > 0 && <p><b>מקורות קול רצויים:</b> {r.soundscape_strategy.masking.join(' · ')}</p>}
        <ul className="bullets">{r.soundscape_strategy.actions.map((a) => <li key={a}>{a}</li>)}</ul>
        <button className="btn ghost no-print" onClick={toggleSound}>{sound ? '■ עצירת הנוף הקולי' : '▶ האזנה לנוף הקולי'}</button>
      </section>

      <section id="transitions" className="chapter">
        <h2><span>07</span>מעברים מרחביים</h2>
        <ol className="sequence">{r.spatial_transitions.map((s) => <li key={s.step}><b>{s.step}</b><p>{s.detail}</p></li>)}</ol>
      </section>

      <section id="timeline" className="chapter">
        <h2><span>08</span>לוח זמנים ליישום</h2>
        <div className="gantt">
          {(() => {
            const total = r.implementation_timeline.reduce((s, p) => s + p.weeks, 0);
            let at = 0;
            return r.implementation_timeline.map((p) => {
              const start = at;
              at += p.weeks;
              return (
                <div key={p.phase} className="g-row">
                  <span className="g-label"><b>{p.phase}</b><small>{p.detail}</small></span>
                  <span className="g-track"><i style={{ insetInlineStart: `${(start / total) * 100}%`, width: `${(p.weeks / total) * 100}%` }}>{p.weeks} ש'</i></span>
                </div>
              );
            });
          })()}
        </div>
      </section>

      <section id="rooms" className="chapter">
        <h2>חדרים מומלצים</h2>
        <div className="cards three">{r.rooms.map((room) => <div key={room.name} className="card"><b>{room.name}</b><p>{room.mood}</p><div className="tags">{room.keys.map((k) => <span key={k}>{k}</span>)}</div></div>)}</div>
      </section>

      <section id="insights" className="chapter">
        <h2>תובנות שהופעלו</h2>
        <div className="cards two">
          {r.insights.map((i, n) => (
            <article key={i.id + n} className="card insight">
              <h3>{i.title}</h3>
              <p>{i.principle}</p>
              <p className="apply">{i.application}</p>
              <cite>{i.source}</cite>
            </article>
          ))}
        </div>
        <p className="note">המפה נוצרה ע"י מנוע כללים מקומי על סמך התשובות. היא נקודת פתיחה לשיחה ולתכנון, ואינה מחליפה שיקול דעת מקצועי, בדיקת תקנים ומדידה באתר.</p>
      </section>
    </div>
  );
}
