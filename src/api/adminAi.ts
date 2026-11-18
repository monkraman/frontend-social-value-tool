// Which AI provider answers first. Mirrors social-value-infoproj/app/api/admin_ai.py.
// Only the choice travels between browser and server; API keys stay in the backend.
import { API_BASE_URL, apiFetch, getAuthHeaders } from './client';

export type ProviderId = 'azure' | 'gemini' | 'openai';

export interface AiProvider {
  id: ProviderId;
  label: string;
  model: string;
  /** False when the server has no key for it; it cannot be chosen. */
  configured: boolean;
}

export interface AiSettings {
  providers: AiProvider[];
  /** The super-admin's choice, or 'default' to follow the server's own order. */
  selected: ProviderId | 'default';
  default_order: ProviderId[];
  /** Providers tried in this order; the next one answers when one is out of quota or down. */
  order: ProviderId[];
  embeddings: string;
}

async function detail(res: Response, fallback: string): Promise<string> {
  try {
    return (await res.json()).detail || fallback;
  } catch {
    return fallback;
  }
}

export async function getAiSettings(): Promise<AiSettings> {
  const res = await apiFetch(`${API_BASE_URL}/admin/ai`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(await detail(res, `Could not load the AI settings (${res.status})`));
  return res.json();
}

export async function setAiProvider(provider: ProviderId | 'default'): Promise<AiSettings> {
  const res = await apiFetch(`${API_BASE_URL}/admin/ai`, {
    method: 'PUT',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ provider })
  });
  if (!res.ok) throw new Error(await detail(res, `Could not change the AI provider (${res.status})`));
  return res.json();
}
