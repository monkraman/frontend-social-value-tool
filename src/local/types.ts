// Shapes shared by the local reference repository (dev server) and the generator engine.

export interface LocalMeasure {
  code: string;
  theme: string;
  outcome: string;
  name: string;
  unit: string;
  proxy_gbp: number | null;
  proxy_year: number | null;
  source: string;
  definition: string;
  unit_guidance: string;
  target_guidance: string;
  evidence_required: string;
  localised: boolean;
}

export interface PatternMeasureLink {
  code: string;
  primary: boolean;
  basis: string;
}

export interface Pattern {
  id: string;
  name: string;
  family: string;
  theme_concepts: string[];
  what: string;
  who_benefits: string;
  delivered_by: string;
  unit_driver: string;
  typical_scale: string;
  needs: string;
  where_fits: string;
  additionality: string;
  status: string;
  measures: PatternMeasureLink[];
  /** 'library' = read from the local pattern library; 'built-in' = shipped with the tool; 'ai' = proposed by the backend AI. */
  origin: 'library' | 'built-in' | 'ai';
}

export interface LocalMacRow {
  code: string;
  framework_version: string;
  mac: string;
  serves: string;
  note: string;
}

export interface LocalDocument {
  path: string;
  name: string;
  kind: 'past-response' | 'feedback' | 'contract' | 'policy' | 'request' | 'framework' | 'guide' | 'other';
  modified: string;
  size: number;
}

export interface LocalKnowledge {
  connected: true;
  folder: string;
  loaded_at: string;
  sources: { file: string; modified: string; used_for: string }[];
  measures: LocalMeasure[];
  regions: { region: string; median_wage_gbp: number; regional_gva: number | null }[];
  industries: { industry: string; gva_multiplier: number }[];
  patterns: Pattern[];
  measure_mac: LocalMacRow[];
  documents: LocalDocument[];
  warnings: string[];
}

export interface EvidenceHit {
  file: string;
  name: string;
  kind: string;
  hits: number;
  snippet: string;
}

export type FrameworkId = 'PPN0620' | 'PPN002' | 'PPN026';

export interface Criterion {
  /** As written in the framework, e.g. "2.2" (PPN 06/20) or "6c" (PPN 002). */
  code: string;
  title: string;
  wording: string;
  group: string;
}

export interface Framework {
  id: FrameworkId;
  name: string;
  short: string;
  applies: string;
  summary: string;
  groups: { id: string; title: string; parent: string }[];
  criteria: Criterion[];
  cohorts?: string[];
  notes: string[];
}

export type MacStrength = 'direct' | 'supporting';

export interface MacLink {
  mac: string;
  strength: MacStrength;
  reason: string;
  /** 'library' = from the local Measure-MAC map; 'built-in' = draft mapping shipped with the tool. */
  source: 'library' | 'built-in';
}

export type LineStatus = 'Counted' | 'Conditional' | 'Alternative' | 'Optional' | 'Not valued';

export interface UnitFactor {
  label: string;
  value: number;
  /** Not editable (e.g. the contract value behind a spend share). */
  fixed?: boolean;
  /** Value is a percentage: contributes value / 100 to the product. */
  percent?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

export interface InitiativeLine {
  code: string;
  name: string;
  unit: string;
  theme: string;
  primary: boolean;
  factors: UnitFactor[];
  suggested: UnitFactor[];
  proxy_gbp: number | null;
  proxy_basis: string;
  status: LineStatus;
  /** Lines in the same group are not additive: only one can be counted. */
  exclusive_group: string | null;
  macs: MacLink[];
  note: string;
  evidence_required: string;
}

export type InfosysFit = 'Core strength' | 'Deliverable' | 'Needs a partner';

export interface Initiative {
  id: string;
  pattern: Pattern;
  included: boolean;
  score: number;
  lines: InitiativeLine[];
  /** Criteria the pattern serves without a TOM measure (measure-less patterns). */
  direct_macs: MacLink[];
  fit: InfosysFit;
  fit_reason: string;
  evidence: EvidenceHit[];
  policy_topics: string[];
  in_infosys_policy: string[];
  untraced_reason: string | null;
  questions: string[];
  /** Draft wording supplied with the initiative (backend AI); otherwise it is written from the pattern. */
  wording?: string;
}

export interface TenderForm {
  client: string;
  contract_value_gbp: number;
  sv_percent: number;
  duration_years: number;
  region: string;
  industry: string;
  framework: FrameworkId;
  criteria: string[];
}

export interface PolicyTopic {
  id: string;
  label: string;
  hits: number;
  snippets: string[];
}

export interface PolicyReading {
  buyer: PolicyTopic[];
  infosys: PolicyTopic[];
}
