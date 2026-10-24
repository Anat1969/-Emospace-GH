import { useSyncExternalStore } from 'react';

export interface Route { path: string; parts: string[]; query: URLSearchParams }

function parse(): Route {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, qs = ''] = raw.split('?');
  return { path, parts: path.split('/').filter(Boolean), query: new URLSearchParams(qs) };
}

let current = parse();
addEventListener('hashchange', () => {
  current = parse();
  scrollTo({ top: 0 });
});

export const useRoute = () =>
  useSyncExternalStore(
    (f) => (addEventListener('hashchange', f), () => removeEventListener('hashchange', f)),
    () => current,
  );

export const go = (path: string) => {
  location.hash = path;
};
