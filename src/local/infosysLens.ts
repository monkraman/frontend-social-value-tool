// The Infosys lens: how well each initiative shape suits an IT services and consulting company,
// what to search for in past responses, and a few built-in shapes that have no Open Access measure.
// These are draft judgements for Infosys to confirm; they hold no £ values.
import type { FrameworkId, InfosysFit, MacLink, Pattern } from './types';

interface Lens {
  fit: InfosysFit;
  reason: string;
  /** Words that show the shape was offered before, searched in past responses and contract schedules. */
  terms: string[];
}

const LENS: Record<string, Lens> = {
  'PAT-01': { fit: 'Core strength', reason: 'Technology apprenticeships fit Infosys delivery teams, and apprentices can work on the contract itself.', terms: ['apprentice'] },
  'PAT-02': { fit: 'Deliverable', reason: 'Infosys can create the roles; it needs a referral partner to reach the cohort.', terms: ['NEET', 'care leaver', 'prison leaver', 'ex-offender', 'long-term unemployed', 'disabled people', 'barriers to employment'] },
  'PAT-03': { fit: 'Core strength', reason: 'Infosys already runs accredited learning for its workforce at scale.', terms: ['upskill', 'accredited training', 'reskill', 'Lex'] },
  'PAT-04': { fit: 'Deliverable', reason: 'Staff can mentor and run CV and interview sessions; a job centre or charity brings the participants.', terms: ['employability', 'mock interview', 'CV ', 'work placement', 'work experience'] },
  'PAT-05': { fit: 'Core strength', reason: 'STEM and digital careers sessions are a natural offer for a technology employer.', terms: ['STEM', 'school', 'college', 'careers'] },
  'PAT-06': { fit: 'Needs a partner', reason: 'IT services are delivered mostly by Infosys staff, so local supply-chain spend is usually small. Commit only what procurement can evidence.', terms: ['local supplier', 'local spend', 'SME', 'supply chain spend'] },
  'PAT-07': { fit: 'Core strength', reason: 'Digital, data and cyber expertise is exactly what small charities and SMEs lack.', terms: ['pro bono', 'pro-bono', 'expert support', 'VCSE', 'charity'] },
  'PAT-08': { fit: 'Deliverable', reason: 'Depends on enough contract staff being based near the community.', terms: ['volunteer'] },
  'PAT-09': { fit: 'Core strength', reason: 'Devices, connectivity and digital skills are close to Infosys\'s core work.', terms: ['digital inclusion', 'device', 'digital skills', 'Good Things'] },
  'PAT-10': { fit: 'Core strength', reason: 'Infosys can measure and cut the footprint of the service it runs (cloud, data centres, code).', terms: ['carbon', 'net zero', 'emission', 'green IT', 'sustainable IT'] },
  'PAT-11': { fit: 'Needs a partner', reason: 'Outside Infosys\'s core work; an environmental partner would lead and Infosys would fund and volunteer.', terms: ['green space', 'biodiversity', 'tree planting'] },
  'PAT-12': { fit: 'Core strength', reason: 'Infosys handles large volumes of IT equipment that can be refurbished and reused.', terms: ['refurbish', 'e-waste', 'reuse', 'recycl'] },
  'INF-01': { fit: 'Core strength', reason: 'Infosys Springboard is a free digital learning platform Infosys already operates.', terms: ['Springboard', 'digital skills', 'bootcamp'] },
  'INF-02': { fit: 'Core strength', reason: 'Cyber security is a core Infosys service line.', terms: ['cyber'] },
  'INF-03': { fit: 'Deliverable', reason: 'Infosys publishes a modern slavery statement and audits suppliers; the contract-specific part is the supplier checks.', terms: ['modern slavery'] },
  'INF-04': { fit: 'Deliverable', reason: 'Builds on wellbeing support Infosys gives its own staff, applied to the contract workforce.', terms: ['mental health', 'wellbeing'] },
  'INF-05': { fit: 'Deliverable', reason: 'A pay and contract commitment for the people working on the contract.', terms: ['living wage', 'fair pay', 'flexible working'] },
  'INF-06': { fit: 'Deliverable', reason: 'Design workshops with users are part of how Infosys delivers digital services.', terms: ['co-design', 'co-creation', 'user research'] },
  'INF-07': { fit: 'Needs a partner', reason: 'Needs a specialist charity to design and deliver the content.', terms: ['domestic abuse'] }
};

const blank = { family: '', typical_scale: '', where_fits: 'Any contract', status: 'Active', measures: [], origin: 'built-in' as const };

/** Shapes Infosys can offer that the 30 Open Access measures cannot value (or only partly). */
export const BUILT_IN_PATTERNS: Pattern[] = [
  {
    ...blank,
    id: 'INF-01',
    name: 'Digital skills academy on Infosys Springboard',
    family: 'Employment & skills',
    theme_concepts: ['Skills', 'Equal opportunity'],
    what: 'Free digital, data and AI courses for a named local cohort, with cohort onboarding, mentoring by Infosys staff and a completion certificate.',
    who_benefits: 'Residents, students and job seekers in the contract area',
    delivered_by: 'Infosys + local education or community partner',
    unit_driver: 'no. learners completing a course',
    needs: 'A local partner to recruit learners; named staff mentors',
    additionality: 'Springboard is a company-wide platform. Only the cohort recruited and supported for this contract counts.'
  },
  {
    ...blank,
    id: 'INF-02',
    name: 'Cyber security clinics for small suppliers and charities',
    family: 'Economy',
    theme_concepts: ['Local economy'],
    what: 'Infosys security specialists run health checks and training that help SMEs and VCSEs in the supply chain reach a recognised standard.',
    who_benefits: 'SMEs and VCSEs in the supply chain and the contract area',
    delivered_by: 'Infosys (cyber specialists)',
    unit_driver: 'no. expert hours',
    needs: 'Specialist time; a list of suppliers and charities to invite',
    additionality: 'Support beyond the security assurance the contract already requires of suppliers.',
    measures: [{ code: 'NT15', primary: true, basis: 'no. staff expert hours' }]
  },
  {
    ...blank,
    id: 'INF-03',
    name: 'Modern slavery checks in the contract supply chain',
    family: 'Economy',
    theme_concepts: ['Equal opportunity'],
    what: 'Risk-assess and audit the suppliers used on the contract, train the contract workforce to spot the signs, and report findings to the buyer.',
    who_benefits: 'Workers in the supply chain',
    delivered_by: 'Infosys procurement and compliance',
    unit_driver: 'no. suppliers assessed; % of staff trained',
    needs: 'Supplier list for the contract; training slots',
    additionality: 'Contract-specific supplier checks and training, beyond the company-wide statement.'
  },
  {
    ...blank,
    id: 'INF-04',
    name: 'Health and wellbeing programme for the contract workforce',
    family: 'Community',
    theme_concepts: ['Community'],
    what: 'Mental health first-aiders, wellbeing sessions and an annual wellbeing survey for everyone working on the contract, including suppliers.',
    who_benefits: 'The contract workforce',
    delivered_by: 'Infosys HR',
    unit_driver: 'no. staff hours on wellbeing activity',
    needs: 'Trained first-aiders; survey and action plan',
    additionality: 'Activity set up for the contract workforce, beyond the standard employee offer.'
  },
  {
    ...blank,
    id: 'INF-05',
    name: 'Fair pay and secure contracts on the contract',
    family: 'Employment & skills',
    theme_concepts: ['Jobs', 'Equal opportunity'],
    what: 'Everyone working on the contract is paid at least the real Living Wage, on permanent contracts that reflect their hours, with flexible working by default.',
    who_benefits: 'The contract workforce, including supplier staff',
    delivered_by: 'Infosys HR and procurement',
    unit_driver: '% of contract workforce covered',
    needs: 'Pay data for the contract workforce; supplier terms',
    additionality: 'A commitment that covers supplier staff as well as Infosys employees.'
  },
  {
    ...blank,
    id: 'INF-06',
    name: 'Co-design with service users and community groups',
    family: 'Community',
    theme_concepts: ['Community'],
    what: 'Involve residents, service users and local anchor organisations in designing and testing the service, with paid participation and published findings.',
    who_benefits: 'Service users and community groups',
    delivered_by: 'Infosys design team + community partners',
    unit_driver: 'no. engagement sessions',
    needs: 'Community partners; budget for participants\' time',
    additionality: 'Engagement beyond the user research the specification already requires.'
  },
  {
    ...blank,
    id: 'INF-07',
    name: 'Domestic abuse awareness for staff and suppliers',
    family: 'Community',
    theme_concepts: ['Community'],
    what: 'Training with a specialist charity so the contract workforce can recognise domestic abuse and signpost support.',
    who_benefits: 'Contract workforce and the people they serve',
    delivered_by: 'Specialist charity, hosted by Infosys',
    unit_driver: 'no. learning hours',
    needs: 'Specialist charity partner',
    additionality: 'New training for this contract.'
  }
];

type Row = [mac: string, strength: 'direct' | 'supporting', reason: string];

/** Criteria the measure-less shapes serve directly. Kept apart from the patterns, like the Measure-MAC map. */
const PATTERN_CRITERIA: Record<string, Record<FrameworkId, Row[]>> = {
  'INF-01': {
    PPN0620: [['2.3', 'direct', 'Training that addresses skills gaps'], ['2.2', 'supporting', 'Training opportunities in deprived areas']],
    PPN002: [['2a', 'direct', 'Learning and skills development'], ['7b', 'supporting', 'Outreach that builds the future workforce']],
    PPN026: [['2a', 'direct', 'Training that closes skills gaps'], ['2c', 'direct', 'Essential and digital skills for target cohorts']]
  },
  'INF-02': {
    PPN0620: [['3.5', 'direct', 'Manages cyber security risk in the supply chain']],
    PPN002: [['3a', 'supporting', 'Builds SME and VCSE resilience']],
    PPN026: []
  },
  'INF-03': {
    PPN0620: [['6.3', 'direct', 'Identifies and manages modern slavery risk']],
    PPN002: [['1e', 'direct', 'Suppliers audited and staff trained']],
    PPN026: []
  },
  'INF-04': {
    PPN0620: [['7.1', 'direct', 'Health and wellbeing in the contract workforce']],
    PPN002: [['8a', 'direct', 'Hours spent on staff health and wellbeing']],
    PPN026: [['1b', 'direct', 'Flexible working and wellbeing']]
  },
  'INF-05': {
    PPN0620: [['6.1', 'direct', 'Tackles inequality in pay in the contract workforce']],
    PPN002: [['1c', 'direct', 'Fair pay practices'], ['1b', 'direct', 'Permanent contracts']],
    PPN026: [['1c', 'direct', 'Fair pay'], ['1b', 'direct', 'Fair working conditions']]
  },
  'INF-06': {
    PPN0620: [['8.1', 'direct', 'Co-design and delivery with users and communities']],
    PPN002: [['3b', 'direct', 'Co-design with communities and anchor partners']],
    PPN026: [['2a', 'supporting', 'Provision co-designed with civil society']]
  },
  'INF-07': {
    PPN0620: [['7.2', 'supporting', 'Influences staff and suppliers on wellbeing']],
    PPN002: [['5a', 'direct', 'Learning hours on domestic abuse awareness']],
    PPN026: []
  }
};

export function directCriteria(patternId: string, framework: FrameworkId): MacLink[] {
  return (PATTERN_CRITERIA[patternId]?.[framework] ?? []).map(([mac, strength, reason]) => ({ mac, strength, reason, source: 'built-in' }));
}

const TECH = /digital|\bit\b|cyber|data|software|skills|training|apprentice|stem|device|carbon/i;
const OUTSIDE = /green space|biodiversity|construction|supply-chain spend|local spend/i;
const STOP = new Set(['programme', 'support', 'people', 'local', 'staff', 'projects', 'project', 'with', 'from', 'through', 'and', 'the', 'for']);

/** Lens for a pattern; shapes added to the library later get a sensible default from their wording. */
export function lensFor(pattern: Pattern): Lens {
  const known = LENS[pattern.id];
  if (known) return known;
  const text = `${pattern.name} ${pattern.what}`;
  const terms = pattern.name
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length > 4 && !STOP.has(w))
    .slice(0, 4);
  if (OUTSIDE.test(text)) return { fit: 'Needs a partner', reason: 'Outside Infosys\'s core work; a partner would lead delivery.', terms };
  if (TECH.test(text)) return { fit: 'Core strength', reason: 'Close to the skills Infosys already has in its delivery teams.', terms };
  return { fit: 'Deliverable', reason: 'Infosys can deliver this with staff time and a local partner.', terms };
}
