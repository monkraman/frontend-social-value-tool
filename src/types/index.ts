export interface OpportunityRequest {
  contract_duration_years: number;
  contract_value_gbp: number;
  social_value_weighting_percent: number;
  client: string;
  location: string;
  priorities: string[];
  top_k?: number;
  raw_prompt?: string;
}

export interface InitiativeItem {
  name: string;
  theme: string;
  location: string;
  description: string;
  delivery_mechanism: string;
  target_beneficiaries: string;
  annual_volume: number;
  toms_metric_code?: string | null;
  partner?: string | null;
  evidence_source: string;
  is_from_knowledge_base: boolean;
  sessions_per_year?: number | null;
  hours_per_session?: number | null;
  participants_per_session?: number | null;
  indicative_cost_gbp?: number | null;
  commercial_viability?: string | null;
}

export interface InitiativeCalculation {
  initiative_name: string;
  toms_code: string;
  metric_name: string;
  unit: string;
  unit_value_gbp: number;
  annual_volume: number;
  duration_years: number;
  total_volume: number;
  total_social_value_gbp: number;
  calculation_formula: string;
}

export interface PackageCalculation {
  package_name: string;
  initiatives: InitiativeCalculation[];
  total_social_value_gbp: number;
  contract_value_gbp: number;
  social_value_percentage: number;
  target_weighting_percent: number;
  target_social_value_gbp: number;
  target_met: boolean;
  audit_trail: string[];
}

export interface GovernanceCadence {
  social_value_lead: string;
  kickoff_cadence: string;
  reporting_frequency: string;
  annual_review: string;
}

export interface SocialValuePackage {
  name: string;
  initiatives: InitiativeItem[];
  rationale: string;
  expected_impact: string[];
  dependencies: string[];
  financial_calculation?: PackageCalculation;
  indicative_delivery_cost_gbp?: number;
  commercial_viability_summary?: string;
  governance?: GovernanceCadence;
}

export interface AIReasoningStep {
  step_number: number;
  title: string;
  detail: string;
  status?: string;
}

export interface ResponseGenerationResult {
  opportunity: {
    client: string;
    location: string;
    contract_value_gbp: number;
    duration_years: number;
    social_value_weighting_percent: number;
    target_social_value_gbp?: number;
    priorities?: string[];
  };
  core_package: SocialValuePackage;
  enhanced_package: SocialValuePackage;
  localised_package: SocialValuePackage;
  assumptions: string[];
  validation_required: string[];
  retrieved_evidence_chunks: number;
  grounding_summary: Record<string, any>;
  ai_reasoning_chain?: AIReasoningStep[];
  is_mock?: boolean;
}

export interface DocumentItem {
  id: string;
  filename: string;
  document_type: string;
  metadata?: Record<string, any>;
  created_at: string;
  chunks_count: number;
  is_archived?: boolean;
  archived_at?: string | null;
}

export interface PromptSubmissionResponse {
  prompt_id: string;
  session_id?: string | null;
  turn_index?: number;
  is_rfp_prompt: boolean;
  intent: string;
  explanation?: string | null;
  refinement_note?: string | null;
  request?: OpportunityRequest | null;
  result?: ResponseGenerationResult | null;
  created_at: string;
}

export interface PromptHistoryItem {
  id: string;
  session_id?: string | null;
  turn_index?: number;
  raw_prompt: string;
  intent: string;
  is_rfp_prompt: boolean;
  client_name?: string | null;
  location?: string | null;
  contract_value_gbp?: number | null;
  duration_years?: number | null;
  weighting_percent?: number | null;
  priorities?: string[];
  explanation?: string | null;
  response_summary?: Record<string, any> | null;
  full_result?: Record<string, any> | null;
  created_at?: string | null;
}


export interface TOMsMetric {
  code: string;
  name: string;
  theme: string;
  unit: string;
  unit_value_gbp: number;
  description: string;
  is_synthetic?: boolean;
}

export interface SearchResultItem {
  chunk_id: string;
  similarity: number;
  content: string;
  filename: string;
  document_id: string;
  metadata?: Record<string, any>;
}

export interface SearchResponse {
  query: string;
  total_results: number;
  results: SearchResultItem[];
}

export type UserRole = 'superadmin' | 'bid_author' | 'reviewer';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole | string;
  is_active: boolean;
  created_at: string;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  user: UserProfile;
}

export interface AuthStatusResponse {
  auth_enabled: boolean;
  rbac_active: boolean;
  default_superadmin_available: boolean;
  default_superadmin_email: string;
  active_roles: string[];
}

export interface DocumentChunkItem {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface BackendHealthData {
  status: string;
  app_name: string;
  database: {
    connected: boolean;
    engine?: string;
    postgres_version?: string;
    pgvector_installed?: boolean;
    pgvector_version?: string;
  };
  active_provider: string;
  providers: {
    gemini?: {
      configured: boolean;
      model: string;
    };
    openai?: {
      configured: boolean;
      model: string;
    };
  };
  embedding_dimension: number;
}

export interface AuditLogItem {
  id: string;
  request_id: string;
  timestamp: string;
  event_type: string;
  severity: string;
  endpoint?: string | null;
  method?: string | null;
  status_code?: number | null;
  duration_ms?: number | null;
  message: string;
  error_detail?: string | null;
  client_ip?: string | null;
}

export interface AuditSummary {
  total_logs: number;
  total_errors: number;
  errors_last_24h: number;
  total_warnings: number;
  retention_policy: string;
  retention_days: number;
  oldest_record_timestamp?: string | null;
  system_health: string;
}
