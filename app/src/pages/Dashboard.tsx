import { useState } from 'react';
import { useEditing } from '../lib/editing';
import { MODULES, isModuleDone } from '../lib/catalog';
import { loadDemo } from '../lib/demo';
import { go } from '../lib/router';
import { deleteProject, useStore } from '../lib/store';
import type { ProjectStatus } from '../lib/types';

export const STATUS: Record<ProjectStatus, string> = { draft: 'טיוטה', sent: 'בשאלון', completed: 'שאלון הושלם', analyzed: 'נותח' };

export default function Dashboard() {
  const { projects, analyses } = useStore();
  const editing = useEditing();
  const [q, setQ] = useState('');
  const list = projects.filter((p) => !q || p.clientName.includes(q) || p.projectType.includes(q));
  const count = (s: ProjectStatus) => projects.filter((p) => p.status === s).length;

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">סטודיו</p>
          <h1>הפרויקטים שלי</h1>
        </div>
        <a className="btn primary" href="#/projects/new">פרויקט חדש</a>
      </div>
      <div className="stats">
        <div><b>{projects.length}</b><span>פרויקטים</span></div>
        <div><b>{count('sent')}</b><span>ממתינים לשאלון</span></div>
        <div><b>{count('completed')}</b><span>מוכנים לניתוח</span></div>
        <div><b>{count('analyzed')}</b><span>מפות מוכנות</span></div>
      </div>
      {projects.length > 0 && (
        <input className="search" type="search" placeholder="חיפוש לפי לקוח או סוג פרויקט" value={q} onChange={(e) => setQ(e.target.value)} aria-label="חיפוש פרויקטים" />
      )}
      {projects.length === 0 ? (
        <div className="empty">
          <h2>עדיין אין פרויקטים</h2>
          <p>פתחו פרויקט ראשון ושלחו ללקוח את קישור השאלון, או טענו פרויקט לדוגמה כדי לראות מפה מלאה.</p>
          <div className="row center">
            <a className="btn primary" href="#/projects/new">פרויקט חדש</a>
            <button className="btn ghost" onClick={() => go(`/projects/${loadDemo()}/results`)}>פרויקט לדוגמה</button>
          </div>
        </div>
      ) : (
        <div className="cards projects">
          {list.map((p) => {
            const done = MODULES.filter((m) => isModuleDone(m.id, p.answers)).length;
            const pal = analyses[p.id]?.color_code.palette;
            return (
              <article key={p.id} className="card project" onClick={() => go(`/projects/${p.id}`)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && go(`/projects/${p.id}`)}>
                <div className="swatches" aria-hidden="true">
                  {(pal ?? []).map((s) => <span key={s.role} style={{ background: s.hex, flex: s.share }} />)}
                  {!pal && <span className="pending" />}
                </div>
                <div className="project-body">
                  <span className={`chip s-${p.status}`}>{STATUS[p.status]}</span>
                  <h3>{p.clientName}</h3>
                  <p className="muted">{p.projectType}{p.area ? ` · ${p.area} מ"ר` : ''}</p>
                  {analyses[p.id] && <p className="archetype-small">{analyses[p.id].archetype.name}</p>}
                  <div className="progress" aria-label={`${done} מתוך 7 חלקים`}><span style={{ width: `${(done / 7) * 100}%` }} /></div>
                  <small className="muted">{done}/7 חלקים</small>
                </div>
                {editing && (
                  <button
                    className="btn danger small"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`למחוק את "${p.clientName}"?`)) deleteProject(p.id);
                    }}
                  >
                    מחיקה
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
      <p className="note">הפרויקטים נשמרים במכשיר הזה בלבד. לגיבוי ולהעברה בין מכשירים: תפריט A&I ← ייצוא גיבוי.</p>
    </section>
  );
}
