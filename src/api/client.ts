import type {
  OpportunityRequest,
  ResponseGenerationResult,
  DocumentItem,
  TOMsMetric,
  TomsMetricCreate,
  TomsMetricUpdate,
  OpportunityRecommendRequest,
  OpportunityRecommendResponse,
  SearchResponse,
  PackageCalculation,
  UserProfile,
  AuthTokenResponse,
  AuthStatusResponse,
  PromptSubmissionResponse,
  PromptHistoryItem,
  DocumentChunkItem,
  BackendHealthData,
  AuditLogItem,
  AuditSummary,
  RegionalPartner,
  RegionalPartnerCreate,
  MasterInitiative
} from '../types';
import { MASTER_INITIATIVES } from '../constants/masterInitiatives';
import { DEFAULT_TOMS_2025 } from '../constants/toms2025Defaults';

function resolveApiBaseUrl(): string {
  let envUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (envUrl) {
    if (!envUrl.startsWith('http://') && !envUrl.startsWith('https://')) {
      envUrl = `https://${envUrl}`;
    }
    return envUrl;
  }

  // In production browser (Vercel or custom domain), auto-route to deployed Render backend
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'https://social-value-infoproj.onrender.com';
  }

  // Local development fallback
  return 'http://127.0.0.1:8000';
}

export const API_BASE_URL = resolveApiBaseUrl();


const TOKEN_KEY = 'social_value_jwt_token';

export function getStoredToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function clearStoredToken(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const token = getStoredToken();
  const headers: Record<string, string> = { ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/** Fired on window when the backend rejects the stored token (expired/invalid) mid-session. */
export const AUTH_EXPIRED_EVENT = 'social-value:auth-expired';

/**
 * fetch wrapper for API calls: a 401 on any endpoint other than login/register means
 * the stored session token is no longer valid, so drop it and tell AuthContext to sign out.
 */
async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, init);
  const path = url.split('?')[0];
  if (res.status === 401 && getStoredToken() && !/\/auth\/(login|register)$/.test(path)) {
    clearStoredToken();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
  }
  return res;
}

export async function loginUser(email: string, password: string): Promise<AuthTokenResponse> {
  const res = await apiFetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Authentication failed' }));
    throw new Error(errorData.detail || `Login error (${res.status})`);
  }

  const data: AuthTokenResponse = await res.json();
  setStoredToken(data.access_token);
  return data;
}

export async function registerUser(
  name: string,
  email: string,
  password: string,
  role = 'superadmin'
): Promise<AuthTokenResponse> {
  const res = await apiFetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, role })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Registration failed' }));
    throw new Error(errorData.detail || `Registration error (${res.status})`);
  }

  const data: AuthTokenResponse = await res.json();
  setStoredToken(data.access_token);
  return data;
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const res = await apiFetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    if (!res.ok) {
      if (res.status === 401) {
        clearStoredToken();
      }
      return null;
    }

    return await res.json();
  } catch {
    return null;
  }
}

export async function checkAuthStatus(): Promise<AuthStatusResponse | null> {
  try {
    const res = await apiFetch(`${API_BASE_URL}/auth/status`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function checkBackendHealth(): Promise<{ online: boolean; message: string; data?: BackendHealthData }> {
  try {
    const res = await apiFetch(`${API_BASE_URL}/health`, { method: 'GET' });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data: BackendHealthData = await res.json();
    return { online: true, message: 'Backend connected (FastAPI)', data };
  } catch (err: any) {
    return { online: false, message: `Backend offline: ${err.message || 'Cannot reach server'}` };
  }
}

export async function generateRfpResponse(request: OpportunityRequest): Promise<ResponseGenerationResult> {
  const res = await apiFetch(`${API_BASE_URL}/responses/generate`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(request)
  });

  if (!res.ok) {
    let detail = `Server returned error (${res.status})`;
    try {
      const errJson = await res.json();
      detail = errJson.detail || detail;
    } catch {
      detail = await res.text();
    }
    throw new Error(detail);
  }

  // Keep the backend's is_mock flag: it is true when the AI provider failed and the
  // deterministic fallback engine produced the packages.
  const data: ResponseGenerationResult = await res.json();
  return data;
}

export async function fetchDocuments(): Promise<DocumentItem[]> {
  const res = await apiFetch(`${API_BASE_URL}/documents`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    let detail = `Failed to load documents (${res.status})`;
    try {
      const err = await res.json();
      detail = err.detail || detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  return await res.json();
}

export async function uploadDocumentFile(file: File): Promise<{ success: boolean; message: string; data?: any }> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await apiFetch(`${API_BASE_URL}/documents/ingest`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData
  });

  if (!res.ok) {
    let detail = `Upload failed (${res.status})`;
    try {
      const err = await res.json();
      detail = err.detail || detail;
    } catch {
      detail = await res.text();
    }
    throw new Error(detail);
  }

  const data = await res.json();
  return {
    success: true,
    message: data.message || `"${file.name}" successfully indexed into pgvector!`,
    data
  };
}

export async function fetchDocumentChunks(documentId: string): Promise<DocumentChunkItem[]> {
  const res = await apiFetch(`${API_BASE_URL}/documents/${documentId}/chunks`, {
    headers: getAuthHeaders()
  });

  if (!res.ok) {
    let detail = `Failed to retrieve chunks (${res.status})`;
    try {
      const err = await res.json();
      detail = err.detail || detail;
    } catch {
      detail = await res.text();
    }
    throw new Error(detail);
  }

  return await res.json();
}

// ==========================================
// Natural Language Prompt API (Backend Driven)
// ==========================================
export async function submitPromptToBackend(prompt: string): Promise<PromptSubmissionResponse> {
  const res = await apiFetch(`${API_BASE_URL}/responses/prompt`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ prompt })
  });

  if (!res.ok) {
    let detail = `Server error (${res.status})`;
    try {
      const errJson = await res.json();
      detail = errJson.detail || detail;
    } catch {
      detail = await res.text();
    }
    throw new Error(detail);
  }

  return await res.json();
}

export async function fetchPromptHistory(limit = 25): Promise<PromptHistoryItem[]> {
  try {
    const res = await apiFetch(`${API_BASE_URL}/responses/history?limit=${limit}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchPromptHistoryById(promptId: string): Promise<PromptHistoryItem | null> {
  try {
    const res = await apiFetch(`${API_BASE_URL}/responses/history/${promptId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function refineRfpResponse(
  feedback: string,
  previousResult: any,
  previousPrompt: string,
  sessionId?: string,
  parentPromptId?: string,
  turnIndex = 2,
  conversationTurns?: Array<{ role: string; content: string }>
): Promise<PromptSubmissionResponse> {
  const res = await apiFetch(`${API_BASE_URL}/responses/refine`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      feedback,
      previous_result: previousResult,
      previous_prompt: previousPrompt,
      session_id: sessionId,
      parent_prompt_id: parentPromptId,
      turn_index: turnIndex,
      conversation_turns: conversationTurns ?? null
    })
  });

  if (!res.ok) {
    let detail = `Refinement error (${res.status})`;
    try {
      const errJson = await res.json();
      detail = errJson.detail || detail;
    } catch {
      detail = await res.text();
    }
    throw new Error(detail);
  }

  return await res.json();
}

// ==========================================
// Document Lifecycle Management (Soft / Hard Delete)
// ==========================================

export async function archiveDocumentById(id: string): Promise<{ success: boolean; message: string }> {
  const res = await apiFetch(`${API_BASE_URL}/documents/${id}?permanent=false`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    let detail = `Failed to archive document (${res.status})`;
    try {
      const err = await res.json();
      detail = err.detail || detail;
    } catch {
      detail = await res.text();
    }
    throw new Error(detail);
  }
  const data = await res.json().catch(() => ({}));
  return {
    success: true,
    message: data.message || 'Document archived successfully.'
  };
}

export async function restoreDocumentById(id: string): Promise<{ success: boolean; message: string }> {
  const res = await apiFetch(`${API_BASE_URL}/documents/${id}/restore`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    let detail = `Failed to restore document (${res.status})`;
    try {
      const err = await res.json();
      detail = err.detail || detail;
    } catch {
      detail = await res.text();
    }
    throw new Error(detail);
  }
  const data = await res.json().catch(() => ({}));
  return {
    success: true,
    message: data.message || 'Document restored successfully.'
  };
}

export async function permanentlyDeleteDocumentById(id: string): Promise<{ success: boolean; message: string }> {
  const res = await apiFetch(`${API_BASE_URL}/documents/${id}?permanent=true`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    let detail = `Failed to delete document (${res.status})`;
    try {
      const err = await res.json();
      detail = err.detail || detail;
    } catch {
      detail = await res.text();
    }
    throw new Error(detail);
  }
  const data = await res.json().catch(() => ({}));
  return {
    success: true,
    message: data.message || 'Document permanently deleted.'
  };
}

export async function deleteDocumentById(id: string): Promise<{ success: boolean; message: string }> {
  return archiveDocumentById(id);
}

// ==========================================
// Enterprise System Audit & Error Logs
// ==========================================

export async function fetchAuditLogs(severity?: string, limit = 50): Promise<AuditLogItem[]> {
  try {
    let url = `${API_BASE_URL}/audit/logs?limit=${limit}`;
    if (severity) {
      url += `&severity=${encodeURIComponent(severity)}`;
    }
    const res = await apiFetch(url, { headers: getAuthHeaders() });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchAuditSummary(): Promise<AuditSummary | null> {
  try {
    const res = await apiFetch(`${API_BASE_URL}/audit/summary`, { headers: getAuthHeaders() });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}


export async function fetchTomsMetrics(): Promise<TOMsMetric[]> {
  try {
    const res = await apiFetch(`${API_BASE_URL}/calculations/metrics`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data : DEFAULT_TOMS_2025;
  } catch {
    return DEFAULT_TOMS_2025;
  }
}

export async function fetchMasterInitiatives(
  pillar?: string,
  search?: string
): Promise<MasterInitiative[]> {
  try {
    let url = `${API_BASE_URL}/calculations/initiatives`;
    const params = new URLSearchParams();
    if (pillar && pillar.toLowerCase() !== 'all') params.append('pillar', pillar);
    if (search) params.append('search', search);
    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;

    const res = await apiFetch(url, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data : MASTER_INITIATIVES;
  } catch {
    let results = [...MASTER_INITIATIVES];
    if (pillar && pillar.toLowerCase() !== 'all') {
      const p = pillar.toLowerCase().trim();
      results = results.filter((x) => x.pillar.toLowerCase().includes(p));
    }
    if (search) {
      const s = search.toLowerCase().trim();
      results = results.filter(
        (x) =>
          x.id.toLowerCase().includes(s) ||
          x.name.toLowerCase().includes(s) ||
          x.description.toLowerCase().includes(s) ||
          x.delivered_by.toLowerCase().includes(s) ||
          x.mac.toLowerCase().includes(s)
      );
    }
    return results;
  }
}

export async function createTomsMetric(metric: TomsMetricCreate): Promise<TOMsMetric> {
  const res = await apiFetch(`${API_BASE_URL}/calculations/metrics`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(metric)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to create metric' }));
    throw new Error(errorData.detail || `HTTP ${res.status}`);
  }
  return await res.json();
}

export async function updateTomsMetric(code: string, metric: TomsMetricUpdate): Promise<TOMsMetric> {
  const res = await apiFetch(`${API_BASE_URL}/calculations/metrics/${encodeURIComponent(code)}`, {
    method: 'PUT',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(metric)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to update metric' }));
    throw new Error(errorData.detail || `HTTP ${res.status}`);
  }
  return await res.json();
}

export async function deleteTomsMetric(code: string): Promise<{ message: string }> {
  const res = await apiFetch(`${API_BASE_URL}/calculations/metrics/${encodeURIComponent(code)}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to delete metric' }));
    throw new Error(errorData.detail || `HTTP ${res.status}`);
  }
  return await res.json();
}

export async function resetDefaultTomsMetrics(): Promise<{ message: string }> {
  const res = await apiFetch(`${API_BASE_URL}/calculations/reset-defaults`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to reset metrics' }));
    throw new Error(errorData.detail || `HTTP ${res.status}`);
  }
  return await res.json();
}

export async function recommendOpportunities(
  req: OpportunityRecommendRequest
): Promise<OpportunityRecommendResponse> {
  const res = await apiFetch(`${API_BASE_URL}/calculations/recommend`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(req)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to generate recommendations' }));
    throw new Error(errorData.detail || `HTTP ${res.status}`);
  }
  return await res.json();
}

export async function fetchRegionalPartners(
  location?: string,
  theme?: string,
  search?: string
): Promise<RegionalPartner[]> {
  const params = new URLSearchParams();
  if (location && location !== 'All') params.append('location', location);
  if (theme && theme !== 'All') params.append('theme', theme);
  if (search) params.append('search', search);

  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await apiFetch(`${API_BASE_URL}/calculations/partners${qs}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function createRegionalPartner(partner: RegionalPartnerCreate): Promise<RegionalPartner> {
  const res = await apiFetch(`${API_BASE_URL}/calculations/partners`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(partner)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to create partner' }));
    throw new Error(errorData.detail || `HTTP ${res.status}`);
  }
  return await res.json();
}

export async function updateRegionalPartner(
  id: number,
  partner: Partial<RegionalPartnerCreate>
): Promise<RegionalPartner> {
  const res = await apiFetch(`${API_BASE_URL}/calculations/partners/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(partner)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to update partner' }));
    throw new Error(errorData.detail || `HTTP ${res.status}`);
  }
  return await res.json();
}

export async function deleteRegionalPartner(id: number): Promise<{ message: string }> {
  const res = await apiFetch(`${API_BASE_URL}/calculations/partners/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to delete partner' }));
    throw new Error(errorData.detail || `HTTP ${res.status}`);
  }
  return await res.json();
}

export async function calculatePackageSimulation(
  packageName: string,
  contractValueGbp: number,
  durationYears: number,
  targetWeightingPercent: number,
  initiatives: Array<{ name: string; toms_metric_code?: string | null; annual_volume: number }>
): Promise<PackageCalculation> {
  try {
    const res = await apiFetch(`${API_BASE_URL}/calculations/package`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        package_name: packageName,
        contract_value_gbp: contractValueGbp,
        duration_years: durationYears,
        target_weighting_percent: targetWeightingPercent,
        initiatives: initiatives.map((i) => ({
          initiative_name: i.name,
          toms_code: i.toms_metric_code || null,
          annual_volume: i.annual_volume
        }))
      })
    });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  } catch {
    // Offline fallback: uses the same Open Access TOM System 2024/2025 catalog values as the
    // backend (DEFAULT_TOMS_2025 mirrors calculation_service.DEFAULT_TOMS_DATA), and the same
    // formula: annual volume × years × unit value. Unknown codes are valued at £0, as in the backend.
    const catalog = new Map(DEFAULT_TOMS_2025.map((m) => [m.code.toUpperCase(), m]));

    let totalSV = 0;
    const calculatedInits = initiatives.map((init) => {
      const code = init.toms_metric_code || 'CUSTOM';
      const metric = catalog.get(code.toUpperCase());
      const rate = metric?.unit_value_gbp ?? 0;
      const unit = metric?.unit ?? 'units';
      const totVol = Math.round(init.annual_volume * durationYears * 100) / 100;
      const svGbp = Math.round(totVol * rate * 100) / 100;
      totalSV += svGbp;
      return {
        initiative_name: init.name,
        toms_code: metric?.code ?? code,
        metric_name: metric?.name ?? 'Unmapped Custom Initiative',
        unit,
        unit_value_gbp: rate,
        annual_volume: init.annual_volume,
        duration_years: durationYears,
        total_volume: totVol,
        total_social_value_gbp: svGbp,
        calculation_formula: `${init.annual_volume} ${unit}/yr × ${durationYears} yrs = ${totVol} ${unit} @ £${rate.toLocaleString()} = £${svGbp.toLocaleString()} (offline calculation)`
      };
    });
    totalSV = Math.round(totalSV * 100) / 100;

    const targetSv = (contractValueGbp * targetWeightingPercent) / 100;
    const svPercent = contractValueGbp > 0 ? (totalSV / contractValueGbp) * 100 : 0;

    return {
      package_name: packageName,
      initiatives: calculatedInits,
      total_social_value_gbp: totalSV,
      contract_value_gbp: contractValueGbp,
      social_value_percentage: Number(svPercent.toFixed(2)),
      target_weighting_percent: targetWeightingPercent,
      target_social_value_gbp: targetSv,
      target_met: totalSV >= targetSv,
      audit_trail: calculatedInits.map((i) => `${i.initiative_name} (${i.toms_code}): ${i.calculation_formula}`)
    };
  }
}

export async function searchVectorKnowledge(
  query: string,
  top_k = 4,
  document_id?: string | null
): Promise<SearchResponse> {
  const payload: Record<string, any> = { query, top_k };
  if (document_id) {
    payload.document_id = document_id;
  }

  const res = await apiFetch(`${API_BASE_URL}/search`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    let detail = `Semantic search failed (${res.status})`;
    try {
      const err = await res.json();
      detail = err.detail || detail;
    } catch {
      detail = await res.text();
    }
    throw new Error(detail);
  }

  return await res.json();
}
