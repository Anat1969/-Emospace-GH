import { useState } from 'react';
import { PROJECT_TYPES } from '../lib/catalog';
import { go } from '../lib/router';
import { createProject } from '../lib/store';

export default function NewProject() {
  const [f, setF] = useState({ clientName: '', projectType: PROJECT_TYPES[0], area: '', budget: '', dueDate: '', notes: '' });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <section className="page narrow">
      <p className="eyebrow">פרויקט חדש</p>
      <h1>למי אנחנו מתכננים?</h1>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          const p = createProject({ ...f, clientName: f.clientName.trim(), area: Number(f.area) || 0 });
          go(`/projects/${p.id}`);
        }}
      >
        <label>שם הלקוח<input required value={f.clientName} onChange={set('clientName')} placeholder="למשל: משפחת לוי" autoFocus /></label>
        <div className="grid2">
          <label>סוג פרויקט<select value={f.projectType} onChange={set('projectType')}>{PROJECT_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
          <label>שטח (מ"ר)<input type="number" min="0" inputMode="numeric" value={f.area} onChange={set('area')} /></label>
          <label>תקציב<input value={f.budget} onChange={set('budget')} placeholder="אופציונלי" /></label>
          <label>מועד יעד<input type="date" value={f.dueDate} onChange={set('dueDate')} /></label>
        </div>
        <label>הערות<textarea rows={3} value={f.notes} onChange={set('notes')} /></label>
        <p className="note">אין להזין כאן מידע רגיש. הנתונים נשמרים בדפדפן של המכשיר הזה.</p>
        <button className="btn primary" type="submit">יצירת פרויקט</button>
      </form>
    </section>
  );
}
