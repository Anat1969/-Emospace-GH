import { compressToEncodedURIComponent as pack, decompressFromEncodedURIComponent as unpack } from 'lz-string';
import type { Analysis, Answers, Project } from './types';

/** What the client device needs to open the questionnaire without the architect's storage. */
export interface Invite { t: string; n: string; k: string }
export interface Reply { t: string; a: Answers }
export interface SharedResult { n: string; r: Analysis }

export const encode = (v: unknown) => pack(JSON.stringify(v));
export function decode<T>(s: string | null | undefined): T | null {
  if (!s) return null;
  try {
    return JSON.parse(unpack(s) ?? 'null') as T;
  } catch {
    return null;
  }
}

const base = () => `${location.origin}${location.pathname}`;

export const inviteLink = (p: Project) => `${base()}#/q/${p.token}?i=${encode({ t: p.token, n: p.clientName, k: p.projectType } satisfies Invite)}`;
export const replyLink = (token: string, a: Answers) => `${base()}#/import?r=${encode({ t: token, a } satisfies Reply)}`;
export const resultLink = (p: Project, r: Analysis) => `${base()}#/shared?s=${encode({ n: p.clientName, r } satisfies SharedResult)}`;
