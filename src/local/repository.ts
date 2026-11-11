// Client for the local reference repository served by the dev server (local-repository/plugin.ts).
// Only reachable when the tool runs on the computer that holds the reference folder.
import type { EvidenceHit, LocalKnowledge } from './types';

const BASE = '/__local';

export type KnowledgeState = LocalKnowledge | { connected: false; reason: string };

const NOT_LOCAL = 'The reference folder is only available when the tool runs on your own computer (npm run dev).';

async function json<T>(res: Response): Promise<T> {
  const type = res.headers.get('content-type') ?? '';
  if (!type.includes('application/json')) throw new Error(NOT_LOCAL);
  const body = await res.json();
  if (!res.ok) throw new Error(body.detail || `Local repository error (${res.status})`);
  return body as T;
}

export async function fetchKnowledge(refresh = false): Promise<KnowledgeState> {
  try {
    return await json<KnowledgeState>(await fetch(`${BASE}/knowledge${refresh ? '?refresh=1' : ''}`));
  } catch (e) {
    return { connected: false, reason: (e as Error).message || NOT_LOCAL };
  }
}

export async function fetchEvidence(queries: { id: string; terms: string[] }[]): Promise<Record<string, EvidenceHit[]>> {
  try {
    const res = await fetch(`${BASE}/evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queries, kinds: ['past-response', 'contract'] })
    });
    return (await json<{ results: Record<string, EvidenceHit[]> }>(res)).results;
  } catch {
    return {};
  }
}

/** Text of one document in the reference folder. */
export async function fetchDocumentText(path: string): Promise<{ name: string; text: string }> {
  return json(await fetch(`${BASE}/text?path=${encodeURIComponent(path)}`));
}

/** Text of a file picked from anywhere on this computer. It is read locally and not stored. */
export async function extractFileText(file: File): Promise<{ name: string; text: string }> {
  if (/\.(txt|md)$/i.test(file.name)) return { name: file.name, text: await file.text() };
  return json(await fetch(`${BASE}/extract?name=${encodeURIComponent(file.name)}`, { method: 'POST', body: file }));
}
