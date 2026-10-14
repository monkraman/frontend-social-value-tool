import type { OpportunityRequest } from '../types';

/**
 * Standard prompt template recommended by the client for UK Social Value RFPs.
 */
export const CLIENT_PROMPT_TEMPLATE =
  'I need to build a Social Value bid response, for a {DURATION} contract of £{VALUE} with {WEIGHTING}% Social Value weighting. The client {CLIENT} in {LOCATION} wants the Social Value offer to address {PRIORITIES}. Based on: previous responses that have scored highly, what Infosys have delivered so far, approved partnerships in our repository, recognised frameworks for SVROI (National TOMS) and geographical location - build a template of initiatives we can present to the client that would achieve {WEIGHTING}% SV, and the impact we can expect to deliver.';

export interface ParsedPromptResult {
  request: OpportunityRequest;
  confidence: number;
  extractedFields: {
    duration?: number;
    value?: number;
    weighting?: number;
    client?: string;
    location?: string;
    priorities?: string[];
  };
}

/**
 * Intelligently parse natural language RFP prompts into structured OpportunityRequest parameters.
 */
export function parseRfpPrompt(prompt: string): ParsedPromptResult {
  const cleanPrompt = prompt.trim();
  const extracted: ParsedPromptResult['extractedFields'] = {};

  // 1. Extract Contract Duration (e.g. "3-year", "3 years", "5 year")
  const durationMatch = cleanPrompt.match(/(\d+)\s*[- ]*(?:year|yr|month)/i);
  if (durationMatch) {
    let years = parseInt(durationMatch[1], 10);
    if (/month/i.test(durationMatch[0])) {
      years = Math.max(1, Math.round(years / 12));
    }
    extracted.duration = Math.min(Math.max(years, 1), 10);
  }

  // 2. Extract Contract Value (£10,000,000 or £10M or 10 million or £500k)
  const gbpValueMatch = cleanPrompt.match(/£\s*([\d,]+(?:\.\d+)?)\s*(m(?:illion)?|k|thousand)?/i) ||
    cleanPrompt.match(/([\d,]+(?:\.\d+)?)\s*(?:million|m)\s*(?:pounds|gbp)?/i);

  if (gbpValueMatch) {
    let baseNum = parseFloat(gbpValueMatch[1].replace(/,/g, ''));
    const unit = (gbpValueMatch[2] || '').toLowerCase();
    if (unit.startsWith('m') || /million/i.test(cleanPrompt.slice(gbpValueMatch.index || 0, (gbpValueMatch.index || 0) + 20))) {
      baseNum = baseNum < 1000 ? baseNum * 1000000 : baseNum;
    } else if (unit.startsWith('k')) {
      baseNum = baseNum * 1000;
    }
    extracted.value = baseNum > 10000 ? baseNum : 10000000;
  }

  // 3. Extract Social Value Weighting (e.g. "10%", "15% Social Value weighting")
  const weightingMatch = cleanPrompt.match(/(\d+(?:\.\d+)?)\s*%\s*(?:social value|sv|weighting)?/i);
  if (weightingMatch) {
    extracted.weighting = parseFloat(weightingMatch[1]);
  }

  // 4. Extract Client Name (e.g. "client Birmingham City Council", "for Birmingham City Council", "for the NHS")
  const clientMatch =
    cleanPrompt.match(/client\s+([A-Z][A-Za-z0-9\s&]+?)(?:\s+(?:in|wants|requires|located)|,|$)/i) ||
    cleanPrompt.match(/(?:for|with)\s+([A-Z][A-Za-z0-9\s&]+?(?:Council|Authority|Trust|NHS|Department|Borough))(?:\s+|,|$)/i);
  if (clientMatch) {
    extracted.client = clientMatch[1].trim();
  }

  // 5. Extract Location (e.g. "in Birmingham", "geographical location Birmingham", "West Midlands")
  const locationMatch =
    cleanPrompt.match(/(?:in|around|region of|location)\s+([A-Z][A-Za-z\s]+?)(?:\s+wants|\s+address|,|\.|$)/i);
  if (locationMatch && !/(the|a|an|address)/i.test(locationMatch[1].trim())) {
    extracted.location = locationMatch[1].trim();
  }

  // 6. Extract Priorities / Themes (e.g. digital inclusion, youth employment, healthcare, green skills, local supply chain)
  const commonThemes = [
    { key: 'Digital Inclusion', regex: /digital\s*inclusion|digital\s*skills|it\s*literacy/i },
    { key: 'Youth Employment', regex: /youth\s*employment|young\s*people|apprenticeships|neet/i },
    { key: 'Local Supply Chain', regex: /local\s*supply\s*chain|sme|vcse|local\s*spend/i },
    { key: 'Net Zero & Green Skills', regex: /net\s*zero|green|carbon|environmental|decarbonis/i },
    { key: 'Health & Wellbeing', regex: /health|wellbeing|healthcare|mental\s*health/i },
    { key: 'STEM Education', regex: /stem|schools|education|mentoring/i }
  ];

  const foundPriorities: string[] = [];
  commonThemes.forEach(({ key, regex }) => {
    if (regex.test(cleanPrompt)) {
      foundPriorities.push(key);
    }
  });

  if (foundPriorities.length > 0) {
    extracted.priorities = foundPriorities;
  }

  // Fallback defaults if not fully specified in prompt
  const request: OpportunityRequest = {
    contract_duration_years: extracted.duration || 3,
    contract_value_gbp: extracted.value || 10000000,
    social_value_weighting_percent: extracted.weighting || 10,
    client: extracted.client || (extracted.location ? `${extracted.location} City Council` : 'Birmingham City Council'),
    location: extracted.location || (extracted.client?.split(' ')[0] || 'Birmingham'),
    priorities: extracted.priorities && extracted.priorities.length > 0 ? extracted.priorities : ['Digital Inclusion', 'Youth Employment', 'Local Supply Chain'],
    top_k: 5
  };

  return {
    request,
    confidence: 0.9,
    extractedFields: extracted
  };
}

/**
 * Generate a ready-to-run prompt from parameters using the client's template.
 */
export function formatClientPrompt(params: {
  durationYears: number;
  contractValueGbp: number;
  weightingPercent: number;
  client: string;
  location: string;
  priorities: string[];
}): string {
  const valString = params.contractValueGbp >= 1000000
    ? `${(params.contractValueGbp / 1000000).toLocaleString()}M`
    : params.contractValueGbp.toLocaleString();

  return `I need to build a Social Value bid response, for a ${params.durationYears}-year contract of £${valString} with ${params.weightingPercent}% Social Value weighting. The client ${params.client} in ${params.location} wants the Social Value offer to address ${params.priorities.join(' and ')}. Based on: previous responses that have scored highly, what Infosys have delivered so far, approved partnerships in our repository, recognised frameworks for SVROI (National TOMS) and geographical location - build a template of initiatives we can present to the client that would achieve ${params.weightingPercent}% SV, and the impact we can expect to deliver.`;
}
