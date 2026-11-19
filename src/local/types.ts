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
  /** For origin 'ai': which provider/model answered, e.g. "azure/gpt-4.1-mini". Absent on older saved runs. */
  ai_model?: string;
}

export interface LocalMacRow {
  code: string;
  framework_version: string;
  mac: string;
  /** "Direct" or "Supporting". Older maps have no column; those rows count as direct. */
  strength?: string;
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
  /** Which source answered: the folder on this computer, or the backend the team shares. */
  origin?: 'local' | 'backend';
  folder: string;
  loaded_at: string;
  sources: { file: string; modified: string; used_for: string }[];
  measures: LocalMeasure[];
  regions: { region: string; median_wage_gbp: number; regional_gva: number | null }[];
  industries: { industry: string; gva_multiplier: number }[];
  patterns: Pattern[];
  measure_mac: LocalMacRow[];
  track_record: PastInitiative[];
  partners?: KnownPartner[];
  /** Past initiative id -> how it was phased on that contract. */
  delivery?: Record<string, DeliveryStep[]>;
  documents: LocalDocument[];
  warnings: string[];
}

/** An initiative Infosys has already committed on a past contract. */
export interface PastInitiative {
  id: string;
  name: string;
  what: string;
  volume: string;
  mac: string;
  pillar: string;
  delivered_by: string;
  measures: string[];
  contract: string;
  /** Why the AI says this past initiative served the same outcome (backend-checked citations only). */
  why?: string;
  /** How it was phased on that contract, where the scorecard records it. */
  delivery?: DeliveryStep[];
}

/** One step in how a past initiative was actually phased, from the contract scorecard. */
export interface DeliveryStep {
  step: string;
  due: string;
  cycle: string;
  /** "Cumulative" steps carry a real quantity; "Percentage" and "Milestone" ones are gates. */
  kind?: string;
  /** How much that step delivered on the past contract — the size of that cohort or tranche. */
  target?: number | null;
}

/** A delivery partner Infosys knows, from the capability profile. */
export interface KnownPartner {
  name: string;
  capability: string;
  /** True where Infosys has actually delivered with them, not just named them in a bid. */
  worked_with_before: boolean;
  /** True where they were specific to one past contract and may not be available. */
  contract_specific: boolean;
  note: string;
}

export interface EvidenceHit {
  file: string;
  name: string;
  kind: string;
  hits: number;
  snippet: string;
  /** Search similarity (0 to 1) for passages found by the backend. */
  similarity?: number;
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
  /** Draft wording supplied with the initiative (backend AI) or written by the user; otherwise it is written from the pattern. */
  wording?: string;
  /** Initiatives Infosys has already committed that are like this one. */
  done_before?: PastInitiative[];
  /** True once the user has edited the name, description or wording. */
  edited?: boolean;
  /** A partner the AI proposed. It stays a suggestion — it is not named in the bid until chosen. */
  partner_suggested?: string;
  /** What the bid team settled on: a partner's name, or '' for Infosys alone. Undefined until they decide. */
  partner_choice?: string;
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
