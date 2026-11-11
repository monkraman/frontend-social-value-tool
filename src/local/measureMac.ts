// Which Model Award Criteria each Open Access TOM measure can evidence, per framework.
// DRAFT mapping shipped with the tool so all three frameworks work from day one. Codes only, no £ values.
// Rows in the "Measure-MAC map" tab of the local pattern library are added on top and take precedence.
import { frameworkOfVersion } from './frameworks';
import type { FrameworkId, LocalMacRow, MacLink, MacStrength } from './types';

type Row = [mac: string, strength: MacStrength, reason: string];

const D: MacStrength = 'direct';
const S: MacStrength = 'supporting';

const BARRIER_0620: Row[] = [
  ['2.2', D, 'Employment for people who face barriers to work'],
  ['6.1', S, 'Tackles inequality in employment in the contract workforce']
];
const BARRIER_002: Row[] = [
  ['6a', D, 'Employment for those who face barriers'],
  ['7a', S, 'Removes barriers to entry for under-represented groups'],
  ['1a', S, 'New jobs created under the contract']
];
const BARRIER_026: Row[] = [
  ['1a', D, 'Good jobs for the target cohorts'],
  ['2c', S, 'Builds the workforce from target cohorts']
];
const ENV_026 = 'Environment is not a scored outcome under PPN 026. It may still appear in the specification.';
const SPEND_026 = 'Spend-based commitments are not scored under PPN 026.';
const DONATION_026 = 'Financial donations do not count as social value under PPN 026.';

const MAP: Record<string, Record<FrameworkId, Row[]>> = {
  NT1: {
    PPN0620: [['2.2', D, 'Local employment created under the contract']],
    PPN002: [['1a', D, 'Jobs created and retained, reported by UK region']],
    PPN026: [['1a', D, 'New local jobs']]
  },
  NT3: { PPN0620: BARRIER_0620, PPN002: BARRIER_002, PPN026: BARRIER_026 },
  NT4: { PPN0620: BARRIER_0620, PPN002: BARRIER_002, PPN026: BARRIER_026 },
  NT76: { PPN0620: BARRIER_0620, PPN002: BARRIER_002, PPN026: BARRIER_026 },
  NT5: { PPN0620: BARRIER_0620, PPN002: BARRIER_002, PPN026: BARRIER_026 },
  NT6: {
    PPN0620: [['5.1', D, 'Disabled people recruited into the contract workforce'], ['2.2', S, 'Employment for people who face barriers']],
    PPN002: [['6b', D, 'Disabled people recruited into the contract workforce'], ['6a', S, 'Employment for those who face barriers']],
    PPN026: BARRIER_026
  },
  NT9: {
    PPN0620: [['2.3', D, 'Training that leads to recognised qualifications'], ['2.2', S, 'Training opportunities for new recruits']],
    PPN002: [['2a', D, 'Learning and skills development relevant to the contract']],
    PPN026: [['2a', D, 'Training that closes skills gaps']]
  },
  NT10: {
    PPN0620: [['2.2', D, 'Apprenticeships delivered in relation to the contract'], ['2.3', D, 'Recognised qualifications through apprenticeships']],
    PPN002: [['1a', D, 'Apprenticeship opportunities, reported by level and region'], ['2a', S, 'Skills development'], ['6a', S, 'Where apprentices come from under-represented groups']],
    PPN026: [['1a', D, 'Good jobs or apprenticeships'], ['2a', S, 'Training and retraining']]
  },
  NT80: {
    PPN0620: [['6.2', D, 'In-work progression through new skills'], ['2.3', S, 'Recognised qualifications']],
    PPN002: [['1d', D, 'Person-hours of upskilling'], ['2a', S, 'Skills development']],
    PPN026: [['2b', D, 'Upskilling and recognised qualifications']]
  },
  NT11: {
    PPN0620: [['2.2', D, 'Career advice, mentoring, mock interviews and CV support']],
    PPN002: [['6a', D, 'Support into work for those who face barriers'], ['7a', S, 'Removes barriers to entry']],
    PPN026: [['2c', D, 'Talent pipeline from target cohorts']]
  },
  NT12: {
    PPN0620: [['2.2', D, 'Work experience and placements']],
    PPN002: [['7a', D, 'Removes barriers to entry for young people'], ['6a', S, 'Opportunities for those who face barriers']],
    PPN026: [['2c', D, 'Talent pipeline'], ['2a', S, 'Supported internships']]
  },
  NT13: {
    PPN0620: [['2.2', D, 'Paid placements and internships'], ['2.3', S, 'Skills gained on placement']],
    PPN002: [['7a', D, 'Removes barriers to entry for young people'], ['2a', S, 'Skills development']],
    PPN026: [['2c', D, 'Talent pipeline'], ['2a', S, 'Supported internships']]
  },
  NT8: {
    PPN0620: [['2.3', D, 'Careers talks and curriculum support']],
    PPN002: [['7b', D, 'Outreach that builds the future workforce']],
    PPN026: [['2c', S, 'Early pipeline and essential skills']]
  },
  NT99: {
    PPN0620: [['2.3', S, 'Visits that support education'], ['8.2', S, 'Community engagement']],
    PPN002: [['7b', D, 'Outreach activities']],
    PPN026: [['2c', S, 'Early pipeline']]
  },
  NT14: {
    PPN0620: [['3.1', D, 'VCSEs in the supply chain']],
    PPN002: [['3a', D, 'Direct spend with VCSEs']],
    PPN026: [['1a', S, `VCSE participation supports job creation. ${SPEND_026}`]]
  },
  NT18: {
    PPN0620: [['3.1', S, 'Local suppliers add to supply chain diversity']],
    PPN002: [['3a', S, 'Local suppliers in the supply chain']],
    PPN026: []
  },
  NT19: {
    PPN0620: [['3.1', D, 'SMEs in the supply chain']],
    PPN002: [['3a', D, 'Direct spend with SMEs']],
    PPN026: [['1a', S, `SME participation supports job creation. ${SPEND_026}`]]
  },
  NT15: {
    PPN0620: [['2.1', D, 'Helps new and small organisations to grow'], ['3.1', S, 'Builds supplier capability']],
    PPN002: [['3a', S, 'Builds SME and VCSE capability'], ['3b', S, 'Collaboration with community partners']],
    PPN026: []
  },
  NT16: {
    PPN0620: [['8.2', S, 'Support for community organisations']],
    PPN002: [['3b', S, 'Support for community partners']],
    PPN026: []
  },
  NT17: {
    PPN0620: [['8.2', D, 'Employee volunteering with community organisations']],
    PPN002: [['3b', S, 'Engagement with communities and anchor partners']],
    PPN026: [['2b', S, 'Volunteering counted as person-hours of development']]
  },
  NT28: {
    PPN0620: [['8.2', S, 'Support for local community projects']],
    PPN002: [['3b', S, 'Support for community projects']],
    PPN026: []
  },
  NT29: {
    PPN0620: [['8.2', D, 'Employee volunteering in the community']],
    PPN002: [['3b', S, 'Engagement with communities']],
    PPN026: [['2b', S, 'Volunteering counted as person-hours of development']]
  },
  NT26: {
    PPN0620: [['7.2', D, 'Supports community health and wellbeing']],
    PPN002: [['8a', S, 'Wellbeing in communities in the relevant area']],
    PPN026: []
  },
  NT27: {
    PPN0620: [['8.2', D, 'Strengthens community networks'], ['8.1', S, 'Work with communities']],
    PPN002: [['3b', S, 'Collaboration with communities']],
    PPN026: []
  },
  NT31: { PPN0620: [['4.1', D, 'Carbon reduction towards net zero']], PPN002: [['4a', D, 'Annual carbon reduction']], PPN026: [] },
  NT31a: { PPN0620: [['4.1', D, 'Carbon reduction towards net zero']], PPN002: [['4a', D, 'Annual carbon reduction']], PPN026: [] },
  NT32: { PPN0620: [['4.1', D, 'Lower travel emissions']], PPN002: [['4a', D, 'Additional environmental benefit']], PPN026: [] },
  NT116: {
    PPN0620: [['4.2', D, 'Influences suppliers on environmental improvement']],
    PPN002: [['4b', D, 'Influences suppliers on climate protection']],
    PPN026: []
  },
  NT119: {
    PPN0620: [['4.1', D, 'Additional environmental benefit'], ['4.2', S, 'Involves staff and communities']],
    PPN002: [['4a', D, 'Green space created or restored']],
    PPN026: []
  },
  NT87: { PPN0620: [['4.1', D, 'Waste reduction']], PPN002: [['4a', D, 'Waste reduction']], PPN026: [] }
};

const ENVIRONMENT = new Set(['NT31', 'NT31a', 'NT32', 'NT116', 'NT119', 'NT87']);
const DONATION = new Set(['NT16', 'NT28']);
const SPEND = new Set(['NT14', 'NT18', 'NT19']);

/** Why a measure has no criterion under a framework, when that is by design rather than a gap. */
export function unscoredReason(code: string, framework: FrameworkId): string | null {
  if (framework !== 'PPN026') return null;
  if (ENVIRONMENT.has(code)) return ENV_026;
  if (DONATION.has(code)) return DONATION_026;
  if (SPEND.has(code)) return SPEND_026;
  return null;
}

const normaliseMac = (mac: string) => mac.replace(/^mac\s*/i, '').trim();

/** MAC links for one measure: local library rows first, then the built-in draft rows. */
export function macsForMeasure(code: string, framework: FrameworkId, local: LocalMacRow[]): MacLink[] {
  const links: MacLink[] = [];
  for (const r of local) {
    if (r.code !== code || frameworkOfVersion(r.framework_version) !== framework) continue;
    const mac = normaliseMac(r.mac);
    if (!/^\d/.test(mac)) continue; // "—" marks a measure the library says is not scored
    links.push({ mac, strength: 'direct', reason: r.note || r.serves, source: 'library' });
  }
  for (const [mac, strength, reason] of MAP[code]?.[framework] ?? []) {
    if (!links.some((l) => l.mac === mac)) links.push({ mac, strength, reason, source: 'built-in' });
  }
  return links;
}

/** Measures in the tables that the draft map does not cover yet. */
export const unmappedMeasures = (codes: string[]): string[] => codes.filter((c) => !MAP[c]);
