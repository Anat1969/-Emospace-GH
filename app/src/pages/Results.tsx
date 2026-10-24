import ResultView from '../components/ResultView';
import { toast } from '../components/Toast';
import { resultLink } from '../lib/share';
import { useStore } from '../lib/store';
import NotFound from './NotFound';

export default function Results({ id }: { id: string }) {
  const { projects, analyses } = useStore();
  const p = projects.find((x) => x.id === id);
  const r = analyses[id];
  if (!p) return <NotFound />;
  if (!r)
    return (
      <section className="page narrow center">
        <h1>עדיין אין ניתוח</h1>
        <p>הפעילו ניתוח מעמוד הפרויקט אחרי שהלקוח ענה על השאלון.</p>
        <a className="btn primary" href={`#/projects/${id}`}>לעמוד הפרויקט</a>
      </section>
    );

  const share = async () => {
    const url = resultLink(p, r);
    if (navigator.share) {
      try {
        await navigator.share({ title: `${r.archetype.name} — EMOSPACE`, url });
        return;
      } catch {
        /* fall back */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast('קישור לצפייה בתוצאות הועתק');
    } catch {
      prompt('קישור לצפייה:', url);
    }
  };

  return (
    <>
      <div className="page-crumb"><a className="back" href={`#/projects/${id}`}>→ {p.clientName}</a></div>
      <ResultView
        r={r}
        client={p.clientName}
        actions={
          <>
            <button className="btn ghost small" onClick={share}>שיתוף עם הלקוח</button>
            <button className="btn ghost small" onClick={() => print()}>הדפסה / PDF</button>
          </>
        }
      />
    </>
  );
}
