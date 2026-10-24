import { useState } from 'react';
import { toast } from '../components/Toast';
import { MODULES, isModuleDone } from '../lib/catalog';
import { go } from '../lib/router';
import { decode, type Reply } from '../lib/share';
import { saveAnswers, useStore } from '../lib/store';

export default function ImportReply({ code }: { code: string | null }) {
  const { projects } = useStore();
  const [text, setText] = useState('');
  const reply = decode<Reply>(code ?? new URLSearchParams(text.split('?')[1] ?? '').get('r'));
  const target = reply && projects.find((p) => p.token === reply.t);
  const done = reply ? MODULES.filter((m) => isModuleDone(m.id, reply.a)).length : 0;

  return (
    <section className="page narrow">
      <p className="eyebrow">ייבוא תשובות</p>
      <h1>קליטת תשובות מהלקוח</h1>
      {!code && (
        <label className="field">הדביקו כאן את הקישור שהלקוח שלח
          <textarea rows={3} dir="ltr" value={text} onChange={(e) => setText(e.target.value.trim())} placeholder="https://…#/import?r=…" />
        </label>
      )}
      {reply && !target && <p className="note">התשובות תקינות ({done}/7 חלקים), אבל הפרויקט שלהן לא נמצא במכשיר הזה. פתחו את הקישור במכשיר שבו נוצר הפרויקט.</p>}
      {(code || text) && !reply && <p className="note">הקישור אינו תקין או שנקטע בהעתקה.</p>}
      {target && reply && (
        <div className="card">
          <h2>{target.clientName}</h2>
          <p>{done} מתוך 7 חלקים נענו.{Object.keys(target.answers).length > 0 && ' התשובות הקיימות בפרויקט יוחלפו.'}</p>
          <button
            className="btn primary"
            onClick={() => {
              saveAnswers(target.id, reply.a, done === 7 ? 'completed' : 'sent');
              toast('התשובות נקלטו');
              go(`/projects/${target.id}`);
            }}
          >
            קליטה לפרויקט
          </button>
        </div>
      )}
    </section>
  );
}
