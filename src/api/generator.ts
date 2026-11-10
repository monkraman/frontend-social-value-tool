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
}

export type LineStatus = 'Counted' | 'Conditional' | 'Alternative' | 'Not valued';

export interface ValuedLine {
  measure: string;
  measure_name: string | null;
  unit: string | null;
  units: number | null;
  basis: string;
  proxy_gbp: number | null;
  proxy_basis: string | null;
  value_gbp: number;
  status: LineStatus;
  note: string;
}

export interface GeneratedInitiative {
  name: string;
  theme: string | null;
  description: string | null;
  attribution: 'Infosys' | 'Partner-led';
  partner: string | null;
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
