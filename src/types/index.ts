export interface OpportunityRequest {
  contract_duration_years: number;
  contract_value_gbp: number;
  social_value_weighting_percent: number;
  client: string;
  location: string;
  priorities: string[];
  top_k?: number;
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

export interface SocialValuePackage {
  name: string;
  initiatives: InitiativeItem[];
  rationale: string;
  expected_impact: string[];
  dependencies: string[];
  financial_calculation?: PackageCalculation;
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
  is_mock?: boolean;
}

export interface DocumentItem {
  id: string;
  filename: string;
  document_type: string;
  metadata?: Record<string, any>;
  created_at: string;
  chunks_count: number;
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
