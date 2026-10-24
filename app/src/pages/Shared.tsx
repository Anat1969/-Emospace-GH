import ResultView from '../components/ResultView';
import { decode, type SharedResult } from '../lib/share';

export default function Shared({ code }: { code: string | null }) {
  const data = decode<SharedResult>(code);
  if (!data?.r?.scene)
    return (
      <section className="page narrow center">
        <h1>הקישור אינו תקין</h1>
        <p>ייתכן שהקישור נקטע. בקשו מהאדריכל לשלוח אותו שוב.</p>
      </section>
    );
  return <ResultView r={data.r} client={data.n} actions={<button className="btn ghost small" onClick={() => print()}>הדפסה / PDF</button>} />;
}
