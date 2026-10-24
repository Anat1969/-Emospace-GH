import { INSIGHTS } from '../lib/insights';

export default function Insights() {
  return (
    <section className="page">
      <p className="eyebrow">ידע</p>
      <h1>התובנות שמאחורי המפה</h1>
      <p className="lead">המנוע מתרגם כל תשובה לווקטור של שישה צירים — אנרגיה, טמפרטורה, פתיחות, מחסה, צורה וטבע — ומשם לפרקי התכנון. אלה העקרונות שהוא נשען עליהם. הם כיווני מחקר, לא חוקים: כל המלצה דורשת שיקול דעת של אדריכל.</p>
      <div className="cards two">
        {Object.values(INSIGHTS).map((i) => (
          <article key={i.id} className="card insight">
            <h3>{i.title}</h3>
            <p>{i.principle}</p>
            <cite>{i.source}</cite>
          </article>
        ))}
      </div>
    </section>
  );
}
