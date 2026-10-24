import SceneView from '../components/SceneView';
import { MODULES } from '../lib/catalog';
import { DEMO_ANSWERS, loadDemo } from '../lib/demo';
import { analyze } from '../lib/engine';
import { INSIGHTS } from '../lib/insights';
import { go } from '../lib/router';

const demo = analyze({ answers: DEMO_ANSWERS, area: 120, projectType: 'דירת מגורים' }, 0);

export default function Home() {
  return (
    <>
      <section className="hero">
        <SceneView params={demo.scene} hero autoTime label="הדמיה תלת־ממדית של חדר לדוגמה, האור משתנה לאורך היום" />
        <div className="hero-copy">
          <p className="eyebrow">מחולל מרחבים רגשיים לאדריכלים</p>
          <h1>מרחב, כשהמקום<br />מבין אותך</h1>
          <p className="lead">שאלון חושי בן שבעה חלקים מתורגם למפה אדריכלית־רגשית: פלטה, פרופורציות, אור, חומר וקול — ולחדר תלת־ממדי חי שאפשר להסתובב בו.</p>
          <div className="row">
            <a className="btn primary" href="#/projects/new">פרויקט חדש</a>
            <button className="btn ghost" onClick={() => go(`/projects/${loadDemo()}/results`)}>לראות דוגמה</button>
          </div>
        </div>
      </section>

      <section className="band">
        <h2 className="section-title">איך זה עובד</h2>
        <ol className="steps">
          <li><b>פרויקט</b><span>פותחים פרויקט עם פרטי הלקוח והמרחב.</span></li>
          <li><b>שאלון</b><span>הלקוח מקבל קישור אישי וממלא שבעה חלקים חושיים, עם צלילים ואור חיים.</span></li>
          <li><b>ניתוח</b><span>מנוע הניתוח מתרגם את התשובות לשמונה פרקי תכנון.</span></li>
          <li><b>חדר חי</b><span>החדר הרגשי נבנה בתלת־ממד, עם אור יום משתנה ונוף קולי.</span></li>
        </ol>
      </section>

      <section className="band">
        <h2 className="section-title">שבעה חלקים, שבעה חושים</h2>
        <div className="modules-strip">
          {MODULES.map((m) => (
            <div key={m.id} className="module-chip">
              <span className="num">{String(m.index).padStart(2, '0')}</span>
              <b>{m.title}</b>
              <small>{m.question}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="band">
        <h2 className="section-title">על מה זה נשען</h2>
        <div className="cards three">
          {['cathedral', 'prospect', 'biophilia'].map((id) => (
            <article key={id} className="card insight">
              <h3>{INSIGHTS[id].title}</h3>
              <p>{INSIGHTS[id].principle}</p>
              <cite>{INSIGHTS[id].source}</cite>
            </article>
          ))}
        </div>
        <p className="center"><a className="link" href="#/insights">לכל התובנות ←</a></p>
      </section>
      <footer className="foot">התוצאות הן כיווני תכנון, לא הוראות ביצוע. מידות, תקנים וחומרים דורשים אימות מקצועי.</footer>
    </>
  );
}
