// Where the generator's knowledge comes from. Two sources, same shape:
//   1. the reference folder on this computer, served by the dev server (local-repository/plugin.ts);
//   2. the backend, which is what the team uses — the dev-server plugin cannot run in a build.
// The folder wins when it is there, so local edits to the workbooks show up without a deploy.
import { API_BASE_URL, apiFetch, getAuthHeaders } from '../api/client';
import { extractDocumentText, repositoryDocumentText } from '../api/generator';
import type { EvidenceHit, LocalKnowledge } from './types';

const BASE = '/__local';
// The reference folder is served by the dev-server plugin only. A deployed build has no /__local
// routes, so it goes straight to the backend instead of making requests that are bound to fail.
const HAS_LOCAL_FOLDER = import.meta.env.DEV;

export type KnowledgeState = LocalKnowledge | { connected: false; reason: string };

const NOT_LOCAL = 'The reference folder is only available when the tool runs on your own computer (npm run dev).';
const NO_BACKEND = 'Sign in to load the measures, criteria and track record from the backend.';

async function json<T>(res: Response): Promise<T> {
  const type = res.headers.get('content-type') ?? '';
  if (!type.includes('application/json')) throw new Error(NOT_LOCAL);
  const body = await res.json();
  if (!res.ok) throw new Error(body.detail || `Local repository error (${res.status})`);
  return body as T;
}

export async function fetchKnowledge(refresh = false): Promise<KnowledgeState> {
  if (!HAS_LOCAL_FOLDER) return fetchBackendKnowledge();
  try {
    const local = await json<KnowledgeState>(await fetch(`${BASE}/knowledge${refresh ? '?refresh=1' : ''}`));
    // The dev server answers "not connected" when no folder is configured: use the backend then.
    if (!local.connected) return fetchBackendKnowledge();
    return { ...local, origin: 'local' };
  } catch {
    return fetchBackendKnowledge();
  }
}

/** The same tables, served by the backend so a deployed build works for everyone. */
async function fetchBackendKnowledge(): Promise<KnowledgeState> {
  try {
    const res = await apiFetch(`${API_BASE_URL}/generator/knowledge`, { headers: getAuthHeaders() });
    if (res.status === 401 || res.status === 403) return { connected: false, reason: NO_BACKEND };
    return { ...(await json<LocalKnowledge>(res)), origin: 'backend' };
  } catch (e) {
    return { connected: false, reason: (e as Error).message || NOT_LOCAL };
  }
}

export async function fetchEvidence(queries: { id: string; terms: string[] }[]): Promise<Record<string, EvidenceHit[]>> {
  // Past-response evidence comes from the reference folder only; there is none in a deployed build.
  if (!HAS_LOCAL_FOLDER) return {};
  try {
    const res = await fetch(`${BASE}/evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queries, kinds: ['past-response', 'contract'] })
    });
    // No reference folder configured: the dev server answers without results.
    return (await json<{ results?: Record<string, EvidenceHit[]> }>(res)).results ?? {};
  } catch {
    return {};
  }
}

/** Text of one listed document: from the reference folder in dev, otherwise from the backend repository. */
export async function fetchDocumentText(path: string, origin?: 'local' | 'backend'): Promise<{ name: string; text: string }> {
  if (origin === 'local' && HAS_LOCAL_FOLDER) return json(await fetch(`${BASE}/text?path=${encodeURIComponent(path)}`));
  return repositoryDocumentText(path);
}

/** Text of a file picked from this computer. TXT and MD are read in the browser; PDF, Word and Excel by
 *  the backend, which reads the file and keeps nothing (dev uses the local plugin when it is running). */
export async function extractFileText(file: File): Promise<{ name: string; text: string }> {
  if (/[.](txt|md)$/i.test(file.name)) return { name: file.name, text: await file.text() };
  if (HAS_LOCAL_FOLDER) {
    try {
      return await json(await fetch(`${BASE}/extract?name=${encodeURIComponent(file.name)}`, { method: 'POST', body: file }));
    } catch {
      // No local plugin answering: fall through to the backend.
    }
  }
  return extractDocumentText(file);
}
