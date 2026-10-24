import { useMemo, useRef, useState } from 'react';
import AIMenu, { type MenuItem } from './components/AIMenu';
import Toasts, { toast } from './components/Toast';
import { loadDemo } from './lib/demo';
import { EditingContext } from './lib/editing';
import { go, useRoute } from './lib/router';
import { deleteProject, exportAll, getState, importAll } from './lib/store';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import ImportReply from './pages/ImportReply';
import Insights from './pages/Insights';
import NewProject from './pages/NewProject';
import NotFound from './pages/NotFound';
import ProjectDetail from './pages/ProjectDetail';
import Questionnaire from './pages/Questionnaire';
import Results from './pages/Results';
import Shared from './pages/Shared';


function download(name: string, text: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export default function App() {
  const route = useRoute();
  const [editing, setEditing] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const [first, second] = route.parts;
  const projectId = first === 'projects' && second && second !== 'new' ? second : null;
  const guest = first === 'q' || first === 'shared';

  const items = useMemo<MenuItem[]>(() => {
    const list: MenuItem[] = [
      { label: editing ? 'סיום עריכה' : 'מצב עריכה', hint: editing ? 'פעיל' : 'כבוי', pressed: editing, onSelect: () => setEditing(!editing) },
      { label: 'פרויקט חדש', onSelect: () => go('/projects/new') },
      { label: 'טעינת פרויקט לדוגמה', onSelect: () => go(`/projects/${loadDemo()}/results`) },
    ];
    if (projectId)
      list.push({
        label: 'מחיקת הפרויקט',
        hint: 'בלתי הפיך',
        onSelect: () => {
          const p = getState().projects.find((x) => x.id === projectId);
          if (p && confirm(`למחוק את "${p.clientName}" ואת כל התשובות והניתוח שלו מהמכשיר?`)) {
            deleteProject(p.id);
            go('/dashboard');
            toast('הפרויקט נמחק');
          }
        },
      });
    list.push(
      { label: 'ייצוא גיבוי', hint: 'JSON', onSelect: () => download(`emospace-${new Date().toISOString().slice(0, 10)}.json`, exportAll()) },
      { label: 'ייבוא גיבוי', onSelect: () => file.current?.click() },
    );
    return guest ? [] : list;
  }, [editing, projectId, guest]);

  let page: JSX.Element;
  const [a, b, c] = route.parts;
  if (!a) page = <Home />;
  else if (a === 'dashboard') page = <Dashboard />;
  else if (a === 'insights') page = <Insights />;
  else if (a === 'projects' && b === 'new') page = <NewProject />;
  else if (a === 'projects' && b && c === 'results') page = <Results id={b} />;
  else if (a === 'projects' && b && !c) page = <ProjectDetail id={b} />;
  else if (a === 'q' && b) page = <Questionnaire token={b} invite={route.query.get('i')} />;
  else if (a === 'import') page = <ImportReply code={route.query.get('r')} />;
  else if (a === 'shared') page = <Shared code={route.query.get('s')} />;
  else page = <NotFound />;

  return (
    <EditingContext.Provider value={editing}>
      <header className="topbar">
        <a className="brand" href="#/" aria-label="EMOSPACE, דף הבית">
          <span className="brand-mark" aria-hidden="true" />
          EMOSPACE
        </a>
        {!guest && (
          <nav className="nav" aria-label="ניווט ראשי">
            <a href="#/dashboard" aria-current={a === 'dashboard' || a === 'projects' ? 'page' : undefined}>פרויקטים</a>
            <a href="#/insights" aria-current={a === 'insights' ? 'page' : undefined}>תובנות</a>
          </nav>
        )}
        <AIMenu items={items} status={editing ? 'עריכה פעילה' : ''} />
      </header>
      <main id="main" key={route.path}>{page}</main>
      <input
        ref={file}
        type="file"
        accept="application/json"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          try {
            const n = importAll(await f.text());
            toast(n ? `יובאו ${n} פרויקטים` : 'כל הפרויקטים בקובץ כבר קיימים');
          } catch (err) {
            toast(`הייבוא נכשל: ${(err as Error).message}`);
          }
        }}
      />
      <Toasts />
    </EditingContext.Provider>
  );
}
