import type { OpportunityRequest } from '../types';

/**
 * Standard prompt template recommended by the client for UK Social Value RFPs.
 */
export const CLIENT_PROMPT_TEMPLATE =
  'I need to build a Social Value bid response, for a {DURATION} contract of £{VALUE} with {WEIGHTING}% Social Value weighting. The client {CLIENT} in {LOCATION} wants the Social Value offer to address {PRIORITIES}. Based on: previous responses that have scored highly, what Infosys have delivered so far, approved partnerships in our repository, recognised frameworks for SVROI (National TOMS) and geographical location - build a template of initiatives we can present to the client that would achieve {WEIGHTING}% SV, and the impact we can expect to deliver.';

export type PromptIntent =
  | 'rfp_generator'
  | 'navigation_documents'
  | 'navigation_search'
  | 'conversational';

export interface ParsedPromptResult {
  isRfpPrompt: boolean;
  intent: PromptIntent;
  confidence: number;
  explanation?: string;
  suggestedAction?: 'navigate_to_documents' | 'navigate_to_search' | 'load_template';
  extractedFields: {
    duration?: number;
    value?: number;
    weighting?: number;
    client?: string;
    location?: string;
    priorities?: string[];
  };
  request?: OpportunityRequest;
  defaultedFields: string[];
}

const UK_LOCATIONS = [
  'Birmingham', 'Manchester', 'Leeds', 'London', 'Bristol', 'Liverpool',
  'Newcastle', 'Sheffield', 'Glasgow', 'Edinburgh', 'Cardiff', 'Coventry',
  'Leicester', 'Nottingham', 'Southampton', 'Belfast', 'Westminster', 'Salford',
  'Bradford', 'Sunderland', 'Wolverhampton', 'Brighton', 'Plymouth', 'Derby',
  'Stoke', 'Hull', 'York', 'Reading', 'Milton Keynes', 'Aberdeen', 'Swansea',
  'Oxford', 'Cambridge', 'Bath', 'Exeter', 'Norwich', 'Dundee', 'Gloucester'
];

/**
 * Intelligently parse natural language RFP prompts into structured OpportunityRequest parameters,
 * while detecting user intent and non-RFP queries.
 */
export function parseRfpPrompt(prompt: string): ParsedPromptResult {
  const cleanPrompt = prompt.trim();
  const lowerPrompt = cleanPrompt.toLowerCase();

  // 1. Intent Detection: User wants to view documents
  if (
    /(?:view|show|see|open|access|read|list|check)\s+(?:the\s+)?(?:docs?|documents?|knowledge\s*base|files?)/i.test(lowerPrompt) ||
    /^(?:documents?|knowledge\s*docs?|files?)\b/i.test(lowerPrompt)
  ) {
    return {
      isRfpPrompt: false,
      intent: 'navigation_documents',
      confidence: 1.0,
      explanation: 'You requested to view knowledge documents.',
      suggestedAction: 'navigate_to_documents',
      extractedFields: {},
      defaultedFields: []
    };
  }

  // 2. Intent Detection: User wants to search
  if (
    /^(?:search|find|query|lookup)\s+(?:for\s+)?(.*?)$/i.test(lowerPrompt) &&
    !lowerPrompt.includes('contract') &&
    !lowerPrompt.includes('£') &&
    !lowerPrompt.includes('%')
  ) {
    return {
      isRfpPrompt: false,
      intent: 'navigation_search',
      confidence: 1.0,
      explanation: 'You requested to search the vector knowledge base.',
      suggestedAction: 'navigate_to_search',
      extractedFields: {},
      defaultedFields: []
    };
  }

  // 3. Extract RFP Parameters
  const extracted: ParsedPromptResult['extractedFields'] = {};
  const defaultedFields: string[] = [];

  // Duration (e.g. "3-year", "3 years", "for 5 years", "24 months")
  const durationMatch = cleanPrompt.match(/(\d+)\s*[- ]*(?:year|yr|month)s?/i) ||
    cleanPrompt.match(/for\s+(\d+)\s*y\b/i);
  if (durationMatch) {
    let years = parseInt(durationMatch[1], 10);
    if (/month/i.test(durationMatch[0])) {
      years = Math.max(1, Math.round(years / 12));
    }
    extracted.duration = Math.min(Math.max(years, 1), 10);
  }

  // Contract Value (£10M, £10,000,000, 5 million pounds, £500k, 10m)
  const gbpValueMatch =
    cleanPrompt.match(/£\s*([\d,]+(?:\.\d+)?)\s*(m(?:illion)?|k|thousand|b(?:illion)?)?/i) ||
    cleanPrompt.match(/([\d,]+(?:\.\d+)?)\s*(?:m(?:illion)?|k)\s*(?:pounds|gbp)?/i) ||
    cleanPrompt.match(/([\d,]+(?:\.\d+)?)\s*(?:million|m)\b/i) ||
    cleanPrompt.match(/(?:value|contract)\s*(?:of|:)?\s*£?([\d,]+(?:\.\d+)?)/i);

  if (gbpValueMatch) {
    let baseNum = parseFloat(gbpValueMatch[1].replace(/,/g, ''));
    const unit = (gbpValueMatch[2] || '').toLowerCase();
    if (unit.startsWith('m') || /million/i.test(cleanPrompt.slice(gbpValueMatch.index || 0, (gbpValueMatch.index || 0) + 20))) {
      baseNum = baseNum < 1000 ? baseNum * 1000000 : baseNum;
    } else if (unit.startsWith('k')) {
      baseNum = baseNum * 1000;
    } else if (unit.startsWith('b')) {
      baseNum = baseNum * 1000000000;
    }
    if (baseNum >= 1000) {
      extracted.value = baseNum;
    }
  }

  // Social Value Weighting (e.g. "10%", "15% Social Value weighting")
  const weightingMatch =
    cleanPrompt.match(/(\d+(?:\.\d+)?)\s*%\s*(?:social\s*value|sv|weighting)?/i) ||
    cleanPrompt.match(/(?:weighting|social\s*value)\s*(?:of|:)?\s*(\d+(?:\.\d+)?)\s*%?/i);
  if (weightingMatch) {
    const w = parseFloat(weightingMatch[1]);
    if (w > 0 && w <= 100) {
      extracted.weighting = w;
    }
  }

  // Location detection: Search for known UK locations
  for (const loc of UK_LOCATIONS) {
    const locRegex = new RegExp(`\\b${loc}\\b`, 'i');
    if (locRegex.test(cleanPrompt)) {
      extracted.location = loc;
      break;
    }
  }

  // Explicit location patterns (e.g. "in Leeds", "location: Bristol")
  const locPatternMatch = cleanPrompt.match(/(?:in|around|region of|location\s*[:=]?)\s+([A-Z][A-Za-z\s]+?)(?:\s+(?:wants|requires|address|,|\.|$|\s+contract))/i);
  if (locPatternMatch && !/(the|a|an|address)/i.test(locPatternMatch[1].trim())) {
    extracted.location = locPatternMatch[1].trim();
  }

  // Client Name (e.g. "client Leeds City Council", "for Manchester City Council", "NHS England")
  const explicitClientMatch =
    cleanPrompt.match(/client\s*[:=]?\s*([A-Za-z0-9\s&'-]+?)(?:\s+(?:in|wants|requires|located)|,|$|\.)/i) ||
    cleanPrompt.match(/(?:for|with|to)\s+([A-Za-z0-9\s&'-]+?\s+(?:City\s+Council|Council|Borough\s+Council|County\s+Council|Authority|Trust|NHS(?:\s+Trust)?|Department|Ministry|Police|Constabulary))/i);

  if (explicitClientMatch) {
    extracted.client = explicitClientMatch[1].trim();
  } else if (extracted.location) {
    // If location is identified (e.g. Leeds) and prompt has "Council" or "tender"
    if (/council/i.test(cleanPrompt)) {
      extracted.client = `${extracted.location} City Council`;
    } else {
      extracted.client = `${extracted.location} Authority`;
    }
  }

  // Priorities / Themes
  const commonThemes = [
    { key: 'Digital Inclusion', regex: /digital\s*inclusion|digital\s*skills|it\s*literacy|broadband|coding/i },
    { key: 'Youth Employment', regex: /youth\s*employment|young\s*people|apprenticeships?|neet|early\s*careers?/i },
    { key: 'Local Supply Chain', regex: /local\s*supply\s*chain|sme|vcse|local\s*spend|tier\s*2/i },
    { key: 'Net Zero & Green Skills', regex: /net\s*zero|green|carbon|environmental|decarbonis|sustainability|circular/i },
    { key: 'Health & Wellbeing', regex: /health|wellbeing|mental\s*health|social\s*prescribing/i },
    { key: 'STEM Education', regex: /stem|schools|education|mentoring/i }
  ];

  const foundPriorities: string[] = [];
  commonThemes.forEach(({ key, regex }) => {
    if (regex.test(cleanPrompt)) {
      foundPriorities.push(key);
    }
  });

  // Check for custom priorities in "address X and Y"
  const addressMatch = cleanPrompt.match(/address\s+([A-Za-z0-9\s,&-]+?)(?:\.|\s+based\s+on|$|\s+and\s+the\s+impact)/i);
  if (addressMatch) {
    const rawThemes = addressMatch[1].split(/(?:,|and|&)/).map(s => s.trim()).filter(s => s.length > 2);
    rawThemes.forEach(theme => {
      const capitalized = theme.charAt(0).toUpperCase() + theme.slice(1);
      if (!foundPriorities.includes(capitalized) && foundPriorities.length < 5) {
        foundPriorities.push(capitalized);
      }
    });
  }

  if (foundPriorities.length > 0) {
    extracted.priorities = foundPriorities;
  }

  // 4. Evaluate whether this is a legitimate tender RFP prompt
  const hasSpecificTenderTokens =
    extracted.duration !== undefined ||
    extracted.value !== undefined ||
    extracted.weighting !== undefined ||
    extracted.client !== undefined ||
    extracted.location !== undefined ||
    (extracted.priorities && extracted.priorities.length > 0);

  const containsRfpKeywords = /(?:tender|bid|contract|social\s*value|rfp|proposal|procurement|svroi|toms|weighting)/i.test(cleanPrompt);

  if (!hasSpecificTenderTokens && !containsRfpKeywords) {
    return {
      isRfpPrompt: false,
      intent: 'conversational',
      confidence: 0,
      explanation: `No tender requirements detected in: "${cleanPrompt}". Please specify details such as Client name, Contract Value, Duration, or Priorities.`,
      suggestedAction: 'load_template',
      extractedFields: {},
      defaultedFields: []
    };
  }

  // Record defaulted fields for full transparency
  if (!extracted.duration) defaultedFields.push('Duration (defaulted to 3 years)');
  if (!extracted.value) defaultedFields.push('Contract Value (defaulted to £10,000,000)');
  if (!extracted.weighting) defaultedFields.push('Weighting (defaulted to 10%)');
  if (!extracted.client && !extracted.location) {
    defaultedFields.push('Client & Location (defaulted to Public Sector Authority)');
  }
  if (!extracted.priorities || extracted.priorities.length === 0) {
    defaultedFields.push('Priorities (defaulted to standard Social Value pillars)');
  }

  const effectiveClient = extracted.client || (extracted.location ? `${extracted.location} City Council` : 'UK Public Sector Authority');
  const effectiveLocation = extracted.location || (extracted.client ? extracted.client.split(' ')[0] : 'UK Regional');

  const request: OpportunityRequest = {
    contract_duration_years: extracted.duration || 3,
    contract_value_gbp: extracted.value || 10000000,
    social_value_weighting_percent: extracted.weighting || 10,
    client: effectiveClient,
    location: effectiveLocation,
    priorities: extracted.priorities && extracted.priorities.length > 0
      ? extracted.priorities
      : ['Local Skills & Employment', 'Local Economic Growth', 'Community Wellbeing'],
    top_k: 5,
    raw_prompt: cleanPrompt
  };

  const confidenceScore =
    (extracted.duration ? 0.2 : 0) +
    (extracted.value ? 0.25 : 0) +
    (extracted.weighting ? 0.2 : 0) +
    (extracted.client || extracted.location ? 0.25 : 0) +
    (extracted.priorities ? 0.1 : 0);

  return {
    isRfpPrompt: true,
    intent: 'rfp_generator',
    confidence: Number(confidenceScore.toFixed(2)),
    extractedFields: extracted,
    request,
    defaultedFields
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
