import type { OpportunityRequest } from '../types';

/**
 * Pre-configured UK Public Sector Tender Presets.
 * Allows developers and bid managers to test different contract sizes, authorities, and target weightings.
 */
export const PRESET_OPPORTUNITIES: Array<{
  id: string;
  label: string;
  data: OpportunityRequest;
}> = [
  {
    id: 'birmingham-council',
    label: 'Birmingham City Council (£10M / 10% SV)',
    data: {
      client: 'Birmingham City Council',
      location: 'Birmingham',
      contract_value_gbp: 10000000,
      contract_duration_years: 3,
      social_value_weighting_percent: 10,
      priorities: ['Digital Inclusion', 'Youth Employment', 'Local Supply Chain'],
      top_k: 5
    }
  },
  {
    id: 'manchester-digital',
    label: 'Greater Manchester Combined Authority (£25M / 15% SV)',
    data: {
      client: 'Greater Manchester Combined Authority',
      location: 'Manchester',
      contract_value_gbp: 25000000,
      contract_duration_years: 5,
      social_value_weighting_percent: 15,
      priorities: ['Net Zero & Green Skills', 'STEM Education', 'Local Supply Chain'],
      top_k: 5
    }
  },
  {
    id: 'leeds-nhs',
    label: 'Leeds Teaching Hospitals NHS Trust (£5M / 12% SV)',
    data: {
      client: 'Leeds Teaching Hospitals NHS Trust',
      location: 'Leeds',
      contract_value_gbp: 5000000,
      contract_duration_years: 2,
      social_value_weighting_percent: 12,
      priorities: ['Health & Wellbeing', 'Youth Employment', 'Digital Inclusion'],
      top_k: 4
    }
  },
  {
    id: 'dwp-digital',
    label: 'Department for Work and Pensions (£40M / 10% SV)',
    data: {
      client: 'Department for Work and Pensions (DWP)',
      location: 'London & Nationwide',
      contract_value_gbp: 40000000,
      contract_duration_years: 4,
      social_value_weighting_percent: 10,
      priorities: ['Digital Inclusion', 'Youth Employment', 'Local Supply Chain', 'Net Zero & Green Skills'],
      top_k: 6
    }
  }
];

export const DEFAULT_OPPORTUNITY = PRESET_OPPORTUNITIES[0].data;
