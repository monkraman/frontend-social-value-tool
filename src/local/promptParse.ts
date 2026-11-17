// Read a tender described in plain words: the facts for the form, and the criteria its themes point to.
import type { FrameworkId, TenderForm } from './types';

interface Theme {
  label: string;
  pattern: RegExp;
  criteria: Record<FrameworkId, string[]>;
}

const THEMES: Theme[] = [
  { label: 'Local community', pattern: /\b(local communit|communit(y|ies)|co-?design|residents|neighbourhood)/i, criteria: { PPN0620: ['8.1', '8.2'], PPN002: ['3b'], PPN026: [] } },
  { label: 'Jobs', pattern: /\b(jobs?|employment|recruit|hiring|unemploy)/i, criteria: { PPN0620: ['2.2'], PPN002: ['1a'], PPN026: ['1a'] } },
  { label: 'Apprenticeships', pattern: /\bapprentic/i, criteria: { PPN0620: ['2.2', '2.3'], PPN002: ['1a', '7b'], PPN026: ['1a', '2c'] } },
  { label: 'Skills and training', pattern: /\b(skills?|training|educat|schools?|colleges?|learning|stem)\b/i, criteria: { PPN0620: ['2.3'], PPN002: ['2a'], PPN026: ['2a'] } },
  { label: 'Digital inclusion', pattern: /\bdigital (inclusion|exclusion|skills|divide)/i, criteria: { PPN0620: ['2.3', '1.2'], PPN002: ['2a'], PPN026: ['2a'] } },
  { label: 'Young people', pattern: /\b(young people|youth|neet|school leavers|talent pipeline)/i, criteria: { PPN0620: ['2.3'], PPN002: ['7b'], PPN026: ['2c'] } },
  { label: 'Barriers to work', pattern: /\b(barriers?|ex-?offenders?|care leavers?|veterans?|homeless|disadvantaged|deprived|under-?represented)/i, criteria: { PPN0620: ['6.1'], PPN002: ['6a', '7a'], PPN026: ['1a'] } },
  { label: 'SMEs and VCSEs', pattern: /\b(smes?|vcses?|small business|charit|social enterprise|supply chain|local suppliers?)/i, criteria: { PPN0620: ['3.1'], PPN002: ['3a'], PPN026: [] } },
  { label: 'Cyber security', pattern: /\bcyber/i, criteria: { PPN0620: ['3.5'], PPN002: [], PPN026: [] } },
  { label: 'Innovation', pattern: /\b(innovat|disruptive|productivity)/i, criteria: { PPN0620: ['3.2', '3.3'], PPN002: [], PPN026: [] } },
  { label: 'Environment', pattern: /\b(net zero|carbon|climate|environment|emissions|green|biodiversity|nature)/i, criteria: { PPN0620: ['4.1', '4.2'], PPN002: ['4a', '4b'], PPN026: [] } },
  { label: 'Disability', pattern: /\bdisab/i, criteria: { PPN0620: ['5.1', '5.2'], PPN002: ['6b'], PPN026: [] } },
  { label: 'Equality and diversity', pattern: /\b(equalit|inequalit|diversity|(?<!digital )inclusion|gender|ethnic)/i, criteria: { PPN0620: ['6.1'], PPN002: ['6c'], PPN026: [] } },
  { label: 'Progression', pattern: /\b(progression|career development|promotion)/i, criteria: { PPN0620: ['6.2'], PPN002: ['1d'], PPN026: ['2b'] } },
  { label: 'Modern slavery', pattern: /\bmodern slavery/i, criteria: { PPN0620: ['6.3'], PPN002: ['1e'], PPN026: [] } },
  { label: 'Health and wellbeing', pattern: /\b(wellbeing|well-being|mental health|health)/i, criteria: { PPN0620: ['7.1', '7.2'], PPN002: ['8a'], PPN026: [] } },
  { label: 'Fair pay', pattern: /\b(living wage|fair pay|pay gap)/i, criteria: { PPN0620: ['1.5'], PPN002: ['1c'], PPN026: ['1c'] } },
  { label: 'Fair working conditions', pattern: /\b(fair work|working conditions|zero.hours)/i, criteria: { PPN0620: ['1.5'], PPN002: ['1b'], PPN026: ['1b'] } },
  { label: 'Domestic abuse', pattern: /\bdomestic (abuse|violence)/i, criteria: { PPN0620: [], PPN002: ['5a'], PPN026: [] } }
];

export interface PromptReading {
  facts: Partial<TenderForm>;
  found: string[];
  themes: string[];
  criteria: string[];
}

const money = (n: number, unit: string | undefined) => {
  const u = (unit ?? '').toLowerCase();
  if (u.startsWith('b')) return n * 1e9;
  if (u.startsWith('m')) return n * 1e6;
  if (u.startsWith('k')) return n * 1e3;
  return n;
};

export function readPrompt(text: string, regions: string[], framework: FrameworkId): PromptReading {
  const facts: Partial<TenderForm> = {};
  const found: string[] = [];

  const fw = /ppn\s*0?26|\b026\b/i.test(text) ? 'PPN026' : /ppn\s*0?02\b|\b002\b/i.test(text) ? 'PPN002' : /06\s*\/\s*20|ppn\s*0?620/i.test(text) ? 'PPN0620' : null;
  if (fw) {
    facts.framework = fw;
    found.push('framework');
  }
  const value = text.match(/£\s?(\d+(?:[.,]\d+)?)\s*(bn|billion|m|million|k|thousand)?/i);
  if (value) {
    facts.contract_value_gbp = Math.round(money(Number(value[1].replace(',', '')), value[2]));
    found.push('contract value');
  }
  const pct = text.match(/(\d+(?:\.\d+)?)\s*%/);
  if (pct) {
    facts.sv_percent = Number(pct[1]);
    found.push('target %');
  }
  const years = text.match(/(\d+)\s*[- ]?(?:\+\s*\d+\s*)?(?:year|yr)/i);
  if (years) {
    facts.duration_years = Number(years[1]);
    found.push('duration');
  }
  const region = regions.find((r) => new RegExp(`\\b${r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text));
  if (region) {
    facts.region = region;
    found.push('region');
  }
  const client = text.match(/\b(?:for|client:?|buyer:?)\s+(?:the\s+)?((?:[A-Z][\w&'’-]*)(?:\s+(?:of|and|for|the|[A-Z][\w&'’-]*))*)/);
  if (client && !/^(PPN|The)$/.test(client[1])) {
    facts.client = client[1].replace(/\s+(of|and|for|the)$/i, '');
    found.push('client');
  }

  const fwId = fw ?? framework;
  const matched = THEMES.filter((t) => t.pattern.test(text));
  return {
    facts,
    found,
    themes: matched.map((t) => t.label),
    criteria: [...new Set(matched.flatMap((t) => t.criteria[fwId]))]
  };
}

export const PROMPT_EXAMPLES = [
  {
    label: 'Council IT services',
    text: 'IT managed services for North East Lincolnshire Council, £12m over 5 years in the North East, 10% social value weighting under PPN 06/20. The council wants local jobs, apprenticeships, digital inclusion for residents and support for local community groups.'
  },
  {
    label: 'NHS digital programme',
    text: 'Digital transformation for an NHS trust in the North West, £25m over 4 years, 15% weighting under PPN 002. Priorities: health and wellbeing, a talent pipeline for young people, people facing barriers to work and net zero.'
  },
  {
    label: 'Central government (PPN 026)',
    text: 'Central government data platform, £40m, 3 years, London, scored under PPN 026 at 10%. Focus on apprenticeships, training, fair pay and in-work progression.'
  }
];
