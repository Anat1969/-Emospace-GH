import { useState } from 'react';
import { toast } from '../components/Toast';
import { EMOTIONS, MEMORIES, MODULES, PALETTES, byId, isModuleDone } from '../lib/catalog';
import { useEditing } from '../lib/editing';
import { analyze } from '../lib/engine';
import { go } from '../lib/router';
import { inviteLink } from '../lib/share';
import { saveAnalysis, updateProject, useStore } from '../lib/store';
import { STATUS } from './Dashboard';
import NotFound from './NotFound';

export default function ProjectDetail({ id }: { id: string }) {
  const { projects, analyses } = useStore();
  const editing = useEditing();
  const [busy, setBusy] = useState(false);
  const p = projects.find((x) => x.id === id);
  if (!p) return <NotFound />;
  const done = MODULES.filter((m) => isModuleDone(m.id, p.answers));
  const link = inviteLink(p);
  const a = p.answers;

  const share = async () => {
    const text = `שלום ${p.clientName}, הנה השאלון האישי שלך ב-EMOSPACE. הוא לוקח כ-10 דקות:`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'EMOSPACE', text, url: link });
        if (p.status === 'draft') updateProject(p.id, { status: 'sent' });
        return;
      } catch {
        /* cancelled: fall back to copying */
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${link}`);
      toast('הקישור הועתק');
    } catch {
      prompt('העתיקו את הקישור:', link);
    }
    if (p.status === 'draft') updateProject(p.id, { status: 'sent' });
  };

  const run = () => {
    setBusy(true);
    // Let the button state paint before the synchronous analysis.
    setTimeout(() => {
      saveAnalysis(p.id, analyze(p));
      setBusy(false);
      go(`/projects/${p.id}/results`);
    }, 650);
  };

  const field = (k: 'clientName' | 'projectType' | 'budget' | 'notes', label: string) =>
    editing ? (
      <label>{label}<input defaultValue={String(p[k])} onBlur={(e) => updateProject(p.id, { [k]: e.target.value })} /></label>
    ) : null;

  return (
    <section className="page">
      <a className="back" href="#/dashboard">→ כל הפרויקטים</a>
      <div className="page-head">
        <div>
          <span className={`chip s-${p.status}`}>{STATUS[p.status]}</span>
          <h1>{p.clientName}</h1>
          <p className="muted">{[p.projectType, p.area ? `${p.area} מ"ר` : '', p.budget, p.dueDate && `יעד ${new Date(p.dueDate).toLocaleDateString('he-IL')}`].filter(Boolean).join(' · ')}</p>
        </div>
        {analyses[p.id] && <a className="btn primary" href={`#/projects/${p.id}/results`}>למפה הרגשית</a>}
      </div>

      {editing && (
        <div className="card form edit-box">
          <h3>עריכת פרטים</h3>
          <div className="grid2">{field('clientName', 'שם הלקוח')}{field('projectType', 'סוג פרויקט')}{field('budget', 'תקציב')}{field('notes', 'הערות')}</div>
        </div>
      )}

      <div className="detail-grid">
        <div className="card">
          <h2>קישור השאלון ללקוח</h2>
          <p>הלקוח פותח את הקישור בכל מכשיר, בלי חשבון. בסיום הוא יקבל קישור החזרה לשלוח אליכם.</p>
          <div className="link-box" dir="ltr">{link}</div>
          <div className="row">
            <button className="btn primary" onClick={share}>שליחה ללקוח</button>
            <a className="btn ghost" href={`#/q/${p.token}`}>מילוי כאן במכשיר</a>
          </div>
        </div>

        <div className="card">
          <h2>התקדמות</h2>
          <ol className="module-list">
            {MODULES.map((m) => (
              <li key={m.id} className={isModuleDone(m.id, a) ? 'done' : ''}>
                <span className="dot" aria-hidden="true" />
                {m.title}
                <small>{isModuleDone(m.id, a) ? 'נענה' : 'ממתין'}</small>
              </li>
            ))}
          </ol>
          <button className="btn primary wide" disabled={done.length < 3 || busy} onClick={run}>
            {busy ? <><span className="spinner" /> מנתח...</> : analyses[p.id] ? 'ניתוח מחדש' : 'הפעלת ניתוח'}
          </button>
          {done.length < 3 && <p className="note">הניתוח זמין אחרי שלושה חלקים לפחות; ככל שיש יותר תשובות, המפה מדויקת יותר.</p>}
          {done.length >= 3 && done.length < 7 && <p className="note">חסרים {7 - done.length} חלקים. הניתוח ישתמש בערכי ביניים עבורם.</p>}
        </div>
      </div>

      {done.length > 0 && (
        <div className="card">
          <h2>תמצית התשובות</h2>
          <dl className="answers">
            {a.core_emotion && <><dt>רגשות</dt><dd>{a.core_emotion.emotions.map((e) => byId(EMOTIONS, e)?.label).join(' · ')}{a.core_emotion.arrival && ` — "${a.core_emotion.arrival}"`}</dd></>}
            {a.color && <><dt>צבע</dt><dd className="mini-pal">{a.color.liked.map((id) => <span key={id} title={byId(PALETTES, id)?.label} style={{ background: byId(PALETTES, id)?.colors[1] }} />)}</dd></>}
            {a.place_memory?.archetype && <><dt>זיכרון</dt><dd>{byId(MEMORIES, a.place_memory.archetype)?.label}{a.place_memory.story && ` — "${a.place_memory.story}"`}</dd></>}
            {a.light && <><dt>אור</dt><dd>{a.light.kelvin}K · אור יום {a.light.daylight}%</dd></>}
            {a.spatial && <><dt>מרחב</dt><dd>פתיחות {a.spatial.openness}% · תקרה {a.spatial.ceiling}% · קימור {a.spatial.curvature}%</dd></>}
          </dl>
          <div className="row"><a className="btn ghost small" href="#/import">ייבוא תשובות מקישור החזרה</a></div>
        </div>
      )}
      {p.notes && !editing && <p className="note">הערות: {p.notes}</p>}
    </section>
  );
}
