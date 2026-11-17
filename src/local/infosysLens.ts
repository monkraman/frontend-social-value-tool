// The Infosys lens: how well each initiative shape suits an IT services and consulting company,
// what to search for in past responses, and a few built-in shapes that have no Open Access measure.
// These are draft judgements for Infosys to confirm; they hold no £ values.
import type { InfosysFit, Pattern } from './types';

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
