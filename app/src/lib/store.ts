import { useSyncExternalStore } from 'react';
import type { Analysis, Answers, Project } from './types';

const KEY = 'emospace.v2';

interface State { projects: Project[]; analyses: Record<string, Analysis> }

let state: State = load();
const listeners = new Set<() => void>();

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as State;
  } catch {
    /* storage unavailable or corrupt: start empty */
  }
  return { projects: [], analyses: {} };
}

function commit(next: State) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* quota or private mode: keep in memory */
  }
  listeners.forEach((f) => f());
}

export function useStore(): State {
  return useSyncExternalStore(
    (f) => (listeners.add(f), () => listeners.delete(f)),
    () => state,
  );
}

export const getState = () => state;

export const uid = (n = 16) =>
  Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');

export function createProject(fields: Omit<Project, 'id' | 'token' | 'status' | 'answers' | 'createdAt' | 'updatedAt'>): Project {
  const now = Date.now();
  const p: Project = { ...fields, id: uid(10), token: uid(20), status: 'draft', answers: {}, createdAt: now, updatedAt: now };
  commit({ ...state, projects: [p, ...state.projects] });
  return p;
}

export function updateProject(id: string, patch: Partial<Project>) {
  commit({
    ...state,
    projects: state.projects.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p)),
  });
}

export function saveAnswers(id: string, answers: Answers, status?: Project['status']) {
  const p = state.projects.find((x) => x.id === id);
  if (!p) return;
  updateProject(id, { answers, status: status ?? (p.status === 'draft' ? 'sent' : p.status) });
}

export function deleteProject(id: string) {
  const analyses = { ...state.analyses };
  delete analyses[id];
  commit({ projects: state.projects.filter((p) => p.id !== id), analyses });
}

export function saveAnalysis(id: string, analysis: Analysis) {
  commit({
    projects: state.projects.map((p) => (p.id === id ? { ...p, status: 'analyzed', updatedAt: Date.now() } : p)),
    analyses: { ...state.analyses, [id]: analysis },
  });
}

export function exportAll(): string {
  return JSON.stringify({ app: 'emospace', version: 2, ...state }, null, 2);
}

export function importAll(json: string): number {
  const data = JSON.parse(json) as Partial<State> & { app?: string };
  if (data.app !== 'emospace' || !Array.isArray(data.projects)) throw new Error('קובץ לא מוכר');
  const known = new Set(state.projects.map((p) => p.id));
  const fresh = data.projects.filter((p) => !known.has(p.id));
  commit({ projects: [...fresh, ...state.projects], analyses: { ...data.analyses, ...state.analyses } });
  return fresh.length;
}
