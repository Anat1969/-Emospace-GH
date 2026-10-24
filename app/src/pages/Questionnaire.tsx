import { useEffect, useMemo, useState } from 'react';
import { toast } from '../components/Toast';
import { previewSource } from '../lib/audio';
import { ACTIVITIES, DEFAULTS, EMOTIONS, MATERIALS, MEMORIES, MODULES, PALETTES, SENSES, SOUND_SOURCES, isModuleDone } from '../lib/catalog';
import { kelvinToHex } from '../lib/color';
import { decode, replyLink, type Invite } from '../lib/share';
import { saveAnswers, useStore } from '../lib/store';
import type { Answers, ModuleId } from '../lib/types';

const guestKey = (t: string) => `emospace.guest.${t}`;

function Slider({ label, low, high, value, onChange, min = 0, max = 100, step = 1, suffix }: {
  label: string; low: string; high: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; suffix?: string;
}) {
  return (
    <label className="slider">
      <span className="slider-label">{label}{suffix && <b>{value}{suffix}</b>}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ '--p': `${((value - min) / (max - min)) * 100}%` } as React.CSSProperties} />
      <span className="slider-ends"><small>{low}</small><small>{high}</small></span>
    </label>
  );
}

function toggle(list: string[], id: string, max = 99) {
  return list.includes(id) ? list.filter((x) => x !== id) : list.length >= max ? list : [...list, id];
}

const MATERIAL_CSS: Record<string, string> = {
  wood: 'repeating-linear-gradient(95deg, #a87b52 0 6px, #9a6f48 6px 9px, #b48a60 9px 16px)',
  stone: 'radial-gradient(circle at 30% 30%, #d8d0c2, #b9ae9b 70%)',
  concrete: 'radial-gradient(circle at 70% 20%, #b3b1ab, #8f8c86)',
  linen: 'repeating-linear-gradient(0deg, #ddd3c2 0 2px, #cfc4b1 2px 3px), #ddd3c2',
  velvet: 'linear-gradient(140deg, #8a6377, #4f3443)',
  metal: 'linear-gradient(120deg, #6d6a64, #c9c3b6 45%, #77736b 60%, #a39d90)',
  ceramic: 'radial-gradient(circle at 35% 30%, #e0a98a, #b8714c 75%)',
  rattan: 'repeating-linear-gradient(45deg, #c4a26c 0 4px, #a8864f 4px 6px), repeating-linear-gradient(-45deg, #c4a26c 0 4px, #a8864f 4px 6px)',
  glass: 'linear-gradient(135deg, rgba(200,214,216,.9), rgba(240,248,250,.6) 50%, rgba(170,195,200,.9))',
};

export default function Questionnaire({ token, invite }: { token: string; invite: string | null }) {
  const { projects } = useStore();
  const local = projects.find((p) => p.token === token);
  const inv = useMemo(() => decode<Invite>(invite), [invite]);
  const guestOk = !local && inv?.t === token;
  const [answers, setAnswers] = useState<Answers>(() => {
    if (local) return local.answers;
    try {
      return JSON.parse(localStorage.getItem(guestKey(token)) ?? '{}') as Answers;
    } catch {
      return {};
    }
  });
  const firstOpen = MODULES.findIndex((m) => !isModuleDone(m.id, answers));
  const [step, setStep] = useState(() => (Object.keys(answers).length === 0 ? -1 : firstOpen === -1 ? 7 : firstOpen));

  useEffect(() => {
    if (!local && guestOk) {
      try {
        localStorage.setItem(guestKey(token), JSON.stringify(answers));
      } catch {
        /* storage unavailable: answers stay in memory */
      }
    }
  }, [answers, local, guestOk, token]);

  if (!local && !guestOk)
    return (
      <section className="page narrow center">
        <h1>הקישור אינו תקין</h1>
        <p>ייתכן שהקישור נקטע בהעתקה. בקשו מהאדריכל לשלוח אותו שוב.</p>
      </section>
    );

  const client = local?.clientName ?? inv!.n;
  const mod = MODULES[step];
  const get = <K extends ModuleId>(id: K) => ({ ...DEFAULTS[id], ...answers[id] }) as Required<Answers>[K];
  const set = <K extends ModuleId>(id: K, patch: Partial<Required<Answers>[K]>) => setAnswers((a) => ({ ...a, [id]: { ...DEFAULTS[id], ...a[id], ...patch } }));

  const next = () => {
    const filled = mod && !answers[mod.id] ? { ...answers, [mod.id]: DEFAULTS[mod.id] } : answers;
    if (filled !== answers) setAnswers(filled);
    const finished = step >= 6;
    if (local) saveAnswers(local.id, filled, finished ? 'completed' : undefined);
    setStep(step + 1);
  };

  if (step === -1)
    return (
      <section className="page narrow q-intro">
        <p className="eyebrow">EMOSPACE</p>
        <h1>שלום {client},</h1>
        <p className="lead">השאלון הזה עוזר לאדריכל להבין איך תרצו להרגיש בבית. אין תשובות נכונות — רק תחושות. שבעה חלקים, כעשר דקות. התשובות נשמרות אוטומטית.</p>
        <div className="q-modules">{MODULES.map((m) => <span key={m.id}>{m.title}</span>)}</div>
        <button className="btn primary big" onClick={() => setStep(0)}>מתחילים</button>
        <p className="note">התשובות שלכם יישמשו לתכנון בלבד. אל תכתבו פרטים מזהים או רגישים בשדות הפתוחים.</p>
      </section>
    );

  if (step >= 7) {
    const reply = !local ? replyLink(token, answers) : '';
    return (
      <section className="page narrow center q-done">
        <div className="done-mark" aria-hidden="true">✦</div>
        <h1>תודה, {client}</h1>
        {local ? (
          <>
            <p className="lead">כל שבעת החלקים נשמרו. אפשר לחזור לפרויקט ולהפעיל את הניתוח.</p>
            <a className="btn primary" href={`#/projects/${local.id}`}>חזרה לפרויקט</a>
          </>
        ) : (
          <>
            <p className="lead">נשאר צעד אחד: שלחו לאדריכל את קישור התשובות. הוא מכיל את התשובות בלבד.</p>
            <div className="row center">
              <button
                className="btn primary"
                onClick={async () => {
                  if (navigator.share) {
                    try {
                      await navigator.share({ title: 'התשובות שלי ל-EMOSPACE', url: reply });
                      return;
                    } catch {
                      /* fall back to copy */
                    }
                  }
                  try {
                    await navigator.clipboard.writeText(reply);
                    toast('הקישור הועתק — הדביקו אותו בהודעה לאדריכל');
                  } catch {
                    prompt('העתיקו את הקישור:', reply);
                  }
                }}
              >
                שליחת התשובות לאדריכל
              </button>
            </div>
          </>
        )}
        <button className="btn ghost small" onClick={() => setStep(0)}>עריכת התשובות</button>
      </section>
    );
  }

  const ce = get('core_emotion');
  const co = get('color');
  const pm = get('place_memory');
  const sd = get('soundscape');
  const li = get('light');
  const tx = get('texture');
  const sp = get('spatial');
  const lightHex = kelvinToHex(li.kelvin);

  return (
    <section className="page q">
      <div className="q-progress" aria-label={`חלק ${step + 1} מתוך 7`}>
        {MODULES.map((m, i) => (
          <button key={m.id} className={`${i === step ? 'on' : ''} ${isModuleDone(m.id, answers) ? 'done' : ''}`} onClick={() => setStep(i)} aria-current={i === step ? 'step' : undefined}>
            <span>{m.index}</span><small>{m.title}</small>
          </button>
        ))}
      </div>

      <div className="q-card" key={mod.id}>
        <p className="eyebrow">חלק {mod.index} · {mod.title}</p>
        <h1>{mod.question}</h1>
        <p className="muted">{mod.hint}</p>

        {mod.id === 'core_emotion' && (
          <>
            <div className="tiles emotions">
              {EMOTIONS.map((e) => {
                const rank = ce.emotions.indexOf(e.id);
                return (
                  <button key={e.id} className={`tile ${rank >= 0 ? 'on' : ''}`} style={{ '--h': e.hue } as React.CSSProperties} aria-pressed={rank >= 0} onClick={() => set('core_emotion', { emotions: toggle(ce.emotions, e.id, 3) })}>
                    <span className="glyph">{e.glyph}</span>
                    {e.label}
                    {rank >= 0 && <i className="rank">{rank + 1}</i>}
                  </button>
                );
              })}
            </div>
            <Slider label="עוצמת הרגש" low="עדין" high="עוצמתי" min={1} max={5} value={ce.intensity} onChange={(v) => set('core_emotion', { intensity: v })} />
            <label className="field">במשפט אחד: מה קורה לכם ברגע שאתם נכנסים הביתה?
              <textarea rows={2} value={ce.arrival} maxLength={200} onChange={(e) => set('core_emotion', { arrival: e.target.value })} placeholder="למשל: אני רוצה להוריד את הכתפיים" />
            </label>
          </>
        )}

        {mod.id === 'color' && (
          <>
            <div className="tiles palettes">
              {PALETTES.map((p) => {
                const state = co.liked.includes(p.id) ? 'liked' : co.avoided.includes(p.id) ? 'avoided' : '';
                return (
                  <button
                    key={p.id}
                    className={`tile palette ${state}`}
                    aria-label={`${p.label}${state === 'liked' ? ', נבחר' : state === 'avoided' ? ', להימנע' : ''}`}
                    onClick={() =>
                      set('color', state === 'liked'
                        ? { liked: co.liked.filter((x) => x !== p.id), avoided: [...co.avoided, p.id] }
                        : state === 'avoided'
                          ? { avoided: co.avoided.filter((x) => x !== p.id) }
                          : { liked: [...co.liked, p.id] })
                    }
                  >
                    <span className="stripes">{p.colors.map((c) => <i key={c} style={{ background: c }} />)}</span>
                    {p.label}
                    {state && <em>{state === 'liked' ? '♥ אוהבים' : '✕ להימנע'}</em>}
                  </button>
                );
              })}
            </div>
            <Slider label="טמפרטורת הצבע" low="קריר" high="חם" value={co.warmth} onChange={(v) => set('color', { warmth: v })} />
            <Slider label="עוצמת הצבע" low="מעומעם ושקט" high="רווי ונועז" value={co.saturation} onChange={(v) => set('color', { saturation: v })} />
          </>
        )}

        {mod.id === 'place_memory' && (
          <>
            <div className="tiles memories">
              {MEMORIES.map((m) => (
                <button key={m.id} className={`tile memory ${pm.archetype === m.id ? 'on' : ''}`} aria-pressed={pm.archetype === m.id} onClick={() => set('place_memory', { archetype: m.id })}>
                  <span className="emoji" aria-hidden="true">{m.image}</span>
                  <b>{m.label}</b>
                  <small>{m.phrase}</small>
                </button>
              ))}
            </div>
            <label className="field">ספרו על הרגע או המקום (לא חובה)
              <textarea rows={3} maxLength={300} value={pm.story} onChange={(e) => set('place_memory', { story: e.target.value })} placeholder="מה ראיתם, שמעתם, הרחתם?" />
            </label>
            <div className="chips" role="group" aria-label="החוש החזק בזיכרון">
              <span className="muted">החוש החזק בזיכרון:</span>
              {SENSES.map((s) => <button key={s.id} className={`chip-btn ${pm.sense === s.id ? 'on' : ''}`} aria-pressed={pm.sense === s.id} onClick={() => set('place_memory', { sense: s.id })}>{s.label}</button>)}
            </div>
          </>
        )}

        {mod.id === 'soundscape' && (
          <>
            <div className="tiles sounds">
              {SOUND_SOURCES.map((s) => (
                <div key={s.id} className={`tile sound ${sd.sources.includes(s.id) ? 'on' : ''}`}>
                  <button className="play" aria-label={`השמעת ${s.label}`} onClick={() => previewSource(s.id)}>▶</button>
                  <button className="pick" aria-pressed={sd.sources.includes(s.id)} onClick={() => set('soundscape', { sources: toggle(sd.sources, s.id) })}>{s.label}</button>
                  <span className="wave" aria-hidden="true"><i /><i /><i /><i /><i /></span>
                </div>
              ))}
            </div>
            <Slider label="רמת החיות של הבית" low="שקט עמוק" high="חי ותוסס" value={sd.level} onChange={(v) => set('soundscape', { level: v })} />
            <Slider label="רגישות לרעש" low="לא מפריע לי" high="רגיש מאוד" value={sd.sensitivity} onChange={(v) => set('soundscape', { sensitivity: v })} />
          </>
        )}

        {mod.id === 'light' && (
          <>
            <div className="light-preview" style={{ '--lc': lightHex, '--lb': 0.35 + li.daylight / 160, '--lk': li.contrast / 100 } as React.CSSProperties} aria-hidden="true">
              <div className="lp-window" />
              <div className="lp-beam" />
              <div className="lp-spot" />
              <span className="lp-k">{li.kelvin}K</span>
            </div>
            <Slider label="גוון האור האהוב" low="חם כנר" high="קריר כבוקר" min={2200} max={6500} step={100} value={li.kelvin} suffix="K" onChange={(v) => set('light', { kelvin: v })} />
            <Slider label="כמות אור טבעי" low="מוצל ומסונן" high="מוצף שמש" value={li.daylight} onChange={(v) => set('light', { daylight: v })} />
            <Slider label="אופי התאורה" low="אחידה ורכה" high="דרמטית, אור וצל" value={li.contrast} onChange={(v) => set('light', { contrast: v })} />
            <div className="chips" role="radiogroup" aria-label="מתי אתם הכי פעילים">
              <span className="muted">אני אדם של:</span>
              {([['morning', 'בוקר'], ['evening', 'ערב'], ['both', 'גם וגם']] as const).map(([id, l]) => (
                <button key={id} role="radio" aria-checked={li.rhythm === id} className={`chip-btn ${li.rhythm === id ? 'on' : ''}`} onClick={() => set('light', { rhythm: id })}>{l}</button>
              ))}
            </div>
          </>
        )}

        {mod.id === 'texture' && (
          <>
            <div className="tiles materials">
              {MATERIALS.map((m) => {
                const rank = tx.materials.indexOf(m.id);
                return (
                  <button key={m.id} className={`tile material ${rank >= 0 ? 'on' : ''}`} aria-pressed={rank >= 0} onClick={() => set('texture', { materials: toggle(tx.materials, m.id, 5) })}>
                    <span className="swatch" style={{ background: MATERIAL_CSS[m.id] }} />
                    {m.label}
                    {rank >= 0 && <i className="rank">{rank + 1}</i>}
                  </button>
                );
              })}
            </div>
            <Slider label="מרקם" low="חלק ומלוטש" high="מחוספס וגולמי" value={tx.roughness} onChange={(v) => set('texture', { roughness: v })} />
            <Slider label="רכות" low="קשיח ומוצק" high="רך ועוטף" value={tx.softness} onChange={(v) => set('texture', { softness: v })} />
          </>
        )}

        {mod.id === 'spatial' && (
          <>
            <SectionDiagram {...sp} />
            <div className="grid2">
              <Slider label="פתיחות" low="חדרים מוגדרים" high="חלל פתוח" value={sp.openness} onChange={(v) => set('spatial', { openness: v })} />
              <Slider label="גובה תקרה" low="נמוך ועוטף" high="גבוה ונישא" value={sp.ceiling} onChange={(v) => set('spatial', { ceiling: v })} />
              <Slider label="צורה" low="קווים ישרים" high="קימורים רכים" value={sp.curvature} onChange={(v) => set('spatial', { curvature: v })} />
              <Slider label="שכבתיות" low="מינימליזם" high="שכבות וחפצים" value={sp.layering} onChange={(v) => set('spatial', { layering: v })} />
              <Slider label="נוכחות טבע" low="עירוני" high="ירוק בכל מקום" value={sp.nature} onChange={(v) => set('spatial', { nature: v })} />
              <Slider label="פרטיות" low="הכל גלוי" high="פינות מוגנות" value={sp.privacy} onChange={(v) => set('spatial', { privacy: v })} />
            </div>
            <div className="chips" role="group" aria-label="מה עושים בבית">
              <span className="muted">מה עושים בבית?</span>
              {ACTIVITIES.map((x) => <button key={x.id} className={`chip-btn ${sp.activities.includes(x.id) ? 'on' : ''}`} aria-pressed={sp.activities.includes(x.id)} onClick={() => set('spatial', { activities: toggle(sp.activities, x.id) })}>{x.label}</button>)}
            </div>
          </>
        )}

        <div className="q-nav">
          {step > 0 && <button className="btn ghost" onClick={() => setStep(step - 1)}>הקודם</button>}
          <button className="btn primary" onClick={next}>{step === 6 ? 'סיום' : 'הבא'}</button>
        </div>
      </div>
    </section>
  );
}

/** A live section drawing of the space the sliders describe. */
function SectionDiagram({ openness, ceiling, curvature, nature, privacy }: { openness: number; ceiling: number; curvature: number; nature: number; privacy: number }) {
  const w = 180 + openness * 1.6;
  const h = 70 + ceiling * 0.9;
  const r = curvature * 0.6;
  const x0 = (360 - w) / 2;
  const y0 = 190 - h;
  const plants = Math.round(nature / 20);
  return (
    <svg className="section" viewBox="0 0 360 210" role="img" aria-label="חתך סכמטי של המרחב">
      <line x1="10" y1="190" x2="350" y2="190" className="ground" />
      <path className="room" d={`M${x0} 190 V${y0 + r} Q${x0} ${y0} ${x0 + r} ${y0} H${x0 + w - r} Q${x0 + w} ${y0} ${x0 + w} ${y0 + r} V190`} />
      <rect className="win" x={x0 - 2} y={y0 + h * 0.3} width="4" height={h * 0.45} />
      <circle className="person" cx={x0 + w * 0.45} cy="162" r="6" />
      <line className="person" x1={x0 + w * 0.45} y1="168" x2={x0 + w * 0.45} y2="190" />
      {privacy > 55 && <path className="niche" d={`M${x0 + w - 50} 190 V150 H${x0 + w}`} />}
      {Array.from({ length: plants }, (_, i) => (
        <g key={i} className="plant" transform={`translate(${x0 + 18 + i * 22} 190)`}>
          <path d="M0 0 C-6 -14 -2 -24 0 -30 C2 -24 6 -14 0 0" />
        </g>
      ))}
      <text x={x0 + w + 6} y={y0 + 10} className="dim">~{(2.5 + (1.1 * ceiling) / 100).toFixed(1)} מ'</text>
    </svg>
  );
}
