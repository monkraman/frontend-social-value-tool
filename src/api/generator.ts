// Initiative Generator API — mirrors social-value-infoproj/app/api/generator.py
import { API_BASE_URL, apiFetch, getAuthHeaders } from './client';

export interface TablesInfo {
  source: string | null;
  edition: string | null;
  imported_at: string | null;
}

export interface GeneratorOptions {
  regions: string[];
  themes: string[];
  default_region: string;
  default_industry: string;
  tables: TablesInfo;
}

export interface GeneratorForm {
  company: string;
  bid_amount_gbp: number;
  sv_percent: number;
  region: string;
  duration_years: number;
  themes: string[];
  /** The bidder's industry. Localised measures (NT18, NT19) are sized and valued with it. */
  industry?: string;
  client?: string;
  /** Which framework is being scored. Narrows the criteria map the AI is sent. */
  framework?: string;
  /** The buyer's own words (prompt mode): context for the AI, never used for any number. */
  brief?: string;
}

export interface ParsedPrompt {
  form: Partial<GeneratorForm>;
  found: (keyof GeneratorForm)[];
  missing: (keyof GeneratorForm)[];
}

export type LineStatus = 'Counted' | 'Conditional' | 'Alternative' | 'Not valued';

export interface ValuedLine {
  measure: string;
  measure_name: string | null;
  unit: string | null;
  units: number | null;
  /** How many people the quantity covers, where the measure counts time rather than people. */
  people?: number | null;
  /** What the AI first proposed, when the package was cut back to the target. */
  units_proposed?: number | null;
  people_proposed?: number | null;
  basis: string;
  proxy_gbp: number | null;
  proxy_basis: string | null;
  value_gbp: number;
  status: LineStatus;
  note: string;
}

/** A past initiative the AI cited, kept by the backend only where it shares a criterion or a measure. */
export interface BackendCitation {
  id: string;
  name: string | null;
  what: string | null;
  mac: string | null;
  measures: string[];
  why: string;
}

/** A passage from the document repository that supports an initiative. */
export interface BackendEvidence {
  document_id: string;
  filename: string;
  kind: string;
  snippet: string;
  similarity: number;
}

/** The curated initiative type the AI tagged; the Infosys-fit rating comes from here. */
export interface InitiativeType {
  id: string;
  name: string;
  fit: 'Core strength' | 'Deliverable' | 'Needs a partner';
  reason: string;
  terms: string[];
}

export interface GeneratedInitiative {
  name: string;
  theme: string | null;
  description: string | null;
  attribution: 'Infosys' | 'Partner-led';
  partner: string | null;
  /** Criteria the AI claimed that a proposed measure actually serves (backend-checked). */
  macs: string[];
  no_tom_reason: string | null;
  done_before: BackendCitation[];
  evidence?: BackendEvidence[];
  type?: InitiativeType | null;
  lines: ValuedLine[];
  value_gbp: number;
  conditional_gbp: number;
  cost_gbp: null;
  bid_paragraph: string;
  questions: string[];
  status: 'Proposal';
}

export interface GeneratorResult {
  target_gbp: number;
  totals: { infosys_gbp: number; partner_gbp: number; conditional_gbp: number };
  initiatives: GeneratedInitiative[];
  checks: string[];
  tables: TablesInfo;
  /** Which provider/model answered, e.g. "azure/gpt-4.1-mini". Absent on older saved runs. */
  model?: string;
}

async function detail(res: Response, fallback: string): Promise<string> {
  try {
    return (await res.json()).detail || fallback;
  } catch {
    return fallback;
  }
}

export async function fetchGeneratorOptions(): Promise<GeneratorOptions> {
  const res = await apiFetch(`${API_BASE_URL}/generator/options`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(await detail(res, `Could not load options (${res.status})`));
  return res.json();
}

export async function runGenerator(form: GeneratorForm): Promise<GeneratorResult> {
  const res = await apiFetch(`${API_BASE_URL}/generator/run`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(form)
  });
  if (!res.ok) throw new Error(await detail(res, `Generation failed (${res.status})`));
  return res.json();
}

/** Text of a PDF, Word, Excel, TXT or MD file. The backend reads it and keeps nothing. */
export async function extractDocumentText(file: File): Promise<{ name: string; text: string }> {
  const body = new FormData();
  body.append('file', file, file.name);
  const res = await apiFetch(`${API_BASE_URL}/generator/extract`, { method: 'POST', headers: getAuthHeaders(), body });
  if (!res.ok) throw new Error(await detail(res, `Could not read ${file.name} (${res.status})`));
  return res.json();
}

/** Text of a document already in the repository. */
export async function repositoryDocumentText(id: string): Promise<{ name: string; text: string }> {
  const res = await apiFetch(`${API_BASE_URL}/generator/documents/${encodeURIComponent(id)}/text`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(await detail(res, `Could not open the document (${res.status})`));
  return res.json();
}

/** Fill the form from a plain-English tender description (no AI). */
export async function parseTenderPrompt(text: string): Promise<ParsedPrompt> {
  const res = await apiFetch(`${API_BASE_URL}/generator/parse`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ text })
  });
  if (!res.ok) throw new Error(await detail(res, `Could not read the prompt (${res.status})`));
  return res.json();
}

// ── Saved runs: the signed-in user's own Initiative Generator history ─────────────

export interface RunSummary {
  id: string;
  title: string;
  client: string | null;
  region: string | null;
  framework: string | null;
  contract_value_gbp: number | null;
  target_gbp: number | null;
  value_gbp: number | null;
  initiative_count: number;
  created_at: string;
  updated_at: string;
}

export interface RunInput extends Omit<RunSummary, 'id' | 'created_at' | 'updated_at'> {
  state: Record<string, unknown>;
}

export interface RunDetail extends RunSummary {
  state: Record<string, unknown>;
}

const RUNS = () => `${API_BASE_URL}/generator/runs`;

export async function listRuns(limit = 50): Promise<RunSummary[]> {
  const res = await apiFetch(`${RUNS()}?limit=${limit}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(await detail(res, `Could not load history (${res.status})`));
  return res.json();
}

export async function getRun(id: string): Promise<RunDetail> {
  const res = await apiFetch(`${RUNS()}/${encodeURIComponent(id)}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(await detail(res, `Could not open this run (${res.status})`));
  return res.json();
}

export async function createRun(run: RunInput): Promise<RunSummary> {
  const res = await apiFetch(RUNS(), {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(run)
  });
  if (!res.ok) throw new Error(await detail(res, `Could not save to history (${res.status})`));
  return res.json();
}

export async function updateRun(id: string, run: RunInput): Promise<RunSummary> {
  const res = await apiFetch(`${RUNS()}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(run)
  });
  if (!res.ok) throw new Error(await detail(res, `Could not save changes (${res.status})`));
  return res.json();
}

export async function deleteRun(id: string): Promise<void> {
  const res = await apiFetch(`${RUNS()}/${encodeURIComponent(id)}`, { method: 'DELETE', headers: getAuthHeaders() });
  if (!res.ok && res.status !== 404) throw new Error(await detail(res, `Could not delete (${res.status})`));
}

// --- Bids written in the RFP editor: shared with the team, changed only by their author ---

export interface BidSummary {
  id: string;
  title: string;
  client: string | null;
  framework: string | null;
  status: string;
  initiative_count: number;
  value_gbp: number | null;
  cost_gbp: number | null;
  author: string;
  mine: boolean;
  created_at: string;
  updated_at: string;
}

export interface BidInput {
  title: string;
  client: string | null;
  framework: string | null;
  status: string;
  initiative_count: number;
  value_gbp: number | null;
  cost_gbp: number | null;
  document: Record<string, unknown>;
}

export interface BidDetail extends BidSummary {
  document: Record<string, unknown>;
}

const BIDS = () => `${API_BASE_URL}/generator/bids`;

export async function listBids(limit = 100): Promise<BidSummary[]> {
  const res = await apiFetch(`${BIDS()}?limit=${limit}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(await detail(res, `Could not load saved bids (${res.status})`));
  return res.json();
}

export async function getBid(id: string): Promise<BidDetail> {
  const res = await apiFetch(`${BIDS()}/${encodeURIComponent(id)}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(await detail(res, `Could not open this bid (${res.status})`));
  return res.json();
}

export async function saveBid(bid: BidInput, id?: string): Promise<BidSummary> {
  const res = await apiFetch(id ? `${BIDS()}/${encodeURIComponent(id)}` : BIDS(), {
    method: id ? 'PUT' : 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(bid)
  });
  if (!res.ok) throw new Error(await detail(res, `Could not save the bid (${res.status})`));
  return res.json();
}

export async function deleteBid(id: string): Promise<void> {
  const res = await apiFetch(`${BIDS()}/${encodeURIComponent(id)}`, { method: 'DELETE', headers: getAuthHeaders() });
  if (!res.ok && res.status !== 404) throw new Error(await detail(res, `Could not delete (${res.status})`));
}

/** The Word file, built by the backend in the Schedule 8 layout and saved by the browser. */
export async function downloadBidWord(document: Record<string, unknown>, filename: string): Promise<void> {
  const res = await apiFetch(`${BIDS()}/docx`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ document })
  });
  if (!res.ok) throw new Error(await detail(res, `Could not build the Word file (${res.status})`));
  const url = URL.createObjectURL(await res.blob());
  const a = window.document.createElement('a');
  a.href = url;
  a.download = `${filename.replace(/[^\w .-]+/g, '').trim() || 'Social value response'}.docx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
