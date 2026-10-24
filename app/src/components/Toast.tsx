import { useEffect, useState } from 'react';

let push: (msg: string) => void = () => {};
export const toast = (msg: string) => push(msg);

export default function Toasts() {
  const [list, setList] = useState<{ id: number; msg: string }[]>([]);
  useEffect(() => {
    push = (msg) => {
      const id = Date.now() + Math.random();
      setList((l) => [...l, { id, msg }]);
      setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), 3200);
    };
  }, []);
  return (
    <div className="toasts" role="status" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className="toast">{t.msg}</div>
      ))}
    </div>
  );
}
