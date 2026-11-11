// The three central-government Social Value frameworks a tender can be scored against.
// Public Cabinet Office material: PPN 06/20 from the Social Value Model Edn 1.1 quick reference table,
// PPN 002 from the published model (Feb 2025), PPN 026 from the published summaries (applies 1 Jan 2027).
// Criterion wording is abbreviated; always check the tender's own text.
import type { Framework, FrameworkId } from './types';

const PPN0620: Framework = {
  id: 'PPN0620',
  name: 'Social Value Model · PPN 06/20',
  short: 'PPN 06/20',
  applies: 'Procurements from 1 Jan 2021 to 23 Feb 2025, and call-offs from frameworks let in that period.',
  summary: '5 themes, 8 policy outcomes, Model Award Criteria MAC 1.1 to 8.2.',
  groups: [
    { id: 'o1', title: 'Help local communities to manage and recover from the impact of COVID-19', parent: 'COVID-19 recovery' },
    { id: 'o2', title: 'Create new businesses, new jobs and new skills', parent: 'Tackling economic inequality' },
    { id: 'o3', title: 'Increase supply chain resilience and capacity', parent: 'Tackling economic inequality' },
    { id: 'o4', title: 'Effective stewardship of the environment', parent: 'Fighting climate change' },
    { id: 'o5', title: 'Reduce the disability employment gap', parent: 'Equal opportunity' },
    { id: 'o6', title: 'Tackle workforce inequality', parent: 'Equal opportunity' },
    { id: 'o7', title: 'Improve health and wellbeing', parent: 'Wellbeing' },
    { id: 'o8', title: 'Improve community integration', parent: 'Wellbeing' }
  ],
  criteria: [
    { code: '1.1', group: 'o1', title: 'Employment, re-training, return to work', wording: 'Employment, re-training and return-to-work opportunities for those left unemployed by COVID-19.' },
    { code: '1.2', group: 'o1', title: 'Supporting people and community recovery', wording: 'Support for people and communities to manage and recover from the impacts of COVID-19.' },
    { code: '1.3', group: 'o1', title: 'Supporting organisations and business to recover', wording: 'Support for organisations and businesses to manage and recover from the impacts of COVID-19.' },
    { code: '1.4', group: 'o1', title: 'Health and reduced demand on public services', wording: 'Support for the physical and mental health of people affected by COVID-19.' },
    { code: '1.5', group: 'o1', title: 'Workplace conditions', wording: 'Improvements to workplace conditions that support the COVID-19 recovery effort.' },
    { code: '2.1', group: 'o2', title: 'Entrepreneurship, growth and business creation', wording: 'Create opportunities for entrepreneurship and help new organisations to grow.' },
    { code: '2.2', group: 'o2', title: 'Employment', wording: 'Create employment and training opportunities, particularly for those who face barriers to employment or are in deprived areas, and in skills-shortage or high-growth sectors.' },
    { code: '2.3', group: 'o2', title: 'Education and training', wording: 'Support educational attainment relevant to the contract, including training that addresses skills gaps and results in recognised qualifications.' },
    { code: '3.1', group: 'o3', title: 'Diverse supply chains', wording: 'Create a diverse supply chain including new businesses, start-ups, SMEs, VCSEs and mutuals.' },
    { code: '3.2', group: 'o3', title: 'Innovation and disruptive technologies', wording: 'Support innovation and disruptive technologies throughout the supply chain.' },
    { code: '3.3', group: 'o3', title: 'Modernising delivery and increasing productivity', wording: 'Support scalable and future-proofed new methods to modernise delivery and increase productivity.' },
    { code: '3.4', group: 'o3', title: 'Collaboration throughout the supply chain', wording: 'Demonstrate collaboration and a fair and responsible approach to working with supply chain partners.' },
    { code: '3.5', group: 'o3', title: 'Manage cyber security risks', wording: 'Identify and manage cyber security risks in the delivery of the contract, including in the supply chain.' },
    { code: '4.1', group: 'o4', title: 'Additional environmental benefits', wording: 'Deliver additional environmental benefits in the performance of the contract, including working towards net zero.' },
    { code: '4.2', group: 'o4', title: 'Influence environmental protection and improvement', wording: 'Influence staff, suppliers, customers and communities to support environmental protection and improvement.' },
    { code: '5.1', group: 'o5', title: 'Increase representation of disabled people', wording: 'Increase the representation of disabled people in the contract workforce.' },
    { code: '5.2', group: 'o5', title: 'Supporting disabled people in developing new skills', wording: 'Support disabled people in developing new skills relevant to the contract, including recognised qualifications.' },
    { code: '5.3', group: 'o5', title: 'Influence to support disabled people', wording: 'Influence staff, suppliers, customers and communities to support disabled people.' },
    { code: '6.1', group: 'o6', title: 'Tackling inequality in the contract workforce', wording: 'Identify and tackle inequality in employment, skills and pay in the contract workforce.' },
    { code: '6.2', group: 'o6', title: 'In-work progression', wording: 'Support in-work progression to help people, including those from disadvantaged or minority groups, move into higher paid work.' },
    { code: '6.3', group: 'o6', title: 'Modern slavery risks', wording: 'Identify and manage the risks of modern slavery in the delivery of the contract, including in the supply chain.' },
    { code: '7.1', group: 'o7', title: 'Health and wellbeing in the contract workforce', wording: 'Support health and wellbeing, including physical and mental health, in the contract workforce.' },
    { code: '7.2', group: 'o7', title: 'Influence to support health and wellbeing', wording: 'Influence staff, suppliers, customers and communities to support health and wellbeing.' },
    { code: '8.1', group: 'o8', title: 'Co-design and delivery with communities', wording: 'Collaborate with users and communities in the co-design and delivery of the contract.' },
    { code: '8.2', group: 'o8', title: 'Influence to support strong, integrated communities', wording: 'Influence staff, suppliers, customers and communities to support strong, integrated communities.' }
  ],
  notes: [
    'Minimum 10% of the total score goes to social value.',
    'Evaluators mark the method statement and timed plan against the chosen MACs, not the £ value.'
  ]
};

const PPN002: Framework = {
  id: 'PPN002',
  name: 'Social Value Model · PPN 002',
  short: 'PPN 002',
  applies: 'Procurements from 24 Feb 2025 (mandatory from 1 Oct 2025) until the end of 2026.',
  summary: '5 missions, 8 outcomes, 17 Model Award Criteria (1a to 8a).',
  groups: [
    { id: 'o1', title: 'Outcome 1 · Fair work', parent: 'Mission 1: Kick-start economic growth' },
    { id: 'o2', title: 'Outcome 2 · Skills for growth', parent: 'Mission 1: Kick-start economic growth' },
    { id: 'o3', title: 'Outcome 3 · Resilient, innovative and flexible supply chains', parent: 'Mission 1: Kick-start economic growth' },
    { id: 'o4', title: 'Outcome 4 · Sustainable procurement practices', parent: 'Mission 2: Clean energy superpower' },
    { id: 'o5', title: 'Outcome 5 · Support the reduction in crime', parent: 'Mission 3: Take back our streets' },
    { id: 'o6', title: 'Outcome 6 · Employment and training for those who face barriers', parent: 'Mission 4: Break down barriers to opportunity' },
    { id: 'o7', title: 'Outcome 7 · A pipeline of opportunities for the contract workforce', parent: 'Mission 4: Break down barriers to opportunity' },
    { id: 'o8', title: 'Outcome 8 · Productivity through physical and mental wellbeing', parent: 'Mission 5: An NHS fit for the future' }
  ],
  criteria: [
    { code: '1a', group: 'o1', title: 'Create and retain high quality jobs', wording: 'Create and retain high quality jobs. Reported as employment and apprenticeship opportunities by UK region.' },
    { code: '1b', group: 'o1', title: 'Fair working conditions', wording: 'Fair working conditions. Reported as people on the contract with permanent contracts.' },
    { code: '1c', group: 'o1', title: 'Fair pay practices', wording: 'Fair pay practices. Reported as people paid above the National Minimum / Living Wage.' },
    { code: '1d', group: 'o1', title: 'In-work progression', wording: 'In-work progression to help people move into higher paid work by developing new skills.' },
    { code: '1e', group: 'o1', title: 'Modern slavery risks', wording: 'Identifying and managing the risks of modern slavery.' },
    { code: '2a', group: 'o2', title: 'Learning and skills development', wording: 'Learning and skills development opportunities relevant to the contract to address skills gaps.' },
    { code: '3a', group: 'o3', title: 'Diverse supply chain', wording: 'Create a diverse supply chain including new businesses, start-ups, SMEs, VCSEs and mutuals.' },
    { code: '3b', group: 'o3', title: 'Co-design with communities and anchor partners', wording: 'Collaborate in co-design and delivery with communities and anchor partners.' },
    { code: '4a', group: 'o4', title: 'Additional environmental benefits', wording: 'Deliver additional environmental benefits in the performance of the contract (carbon, water, waste, green space).' },
    { code: '4b', group: 'o4', title: 'Influence on climate and nature', wording: 'Influence staff, suppliers, customers and communities to support climate and nature protection.' },
    { code: '5a', group: 'o5', title: 'Reduction in domestic abuse', wording: 'Influence staff, suppliers, customers and communities to support the reduction in domestic abuse.' },
    { code: '6a', group: 'o6', title: 'Opportunities for those who face barriers', wording: 'Create employment and training opportunities particularly for those who face barriers to employment.' },
    { code: '6b', group: 'o6', title: 'Representation of disabled people', wording: 'Increase the representation of disabled people in the contract workforce.' },
    { code: '6c', group: 'o6', title: 'Tackle inequality in employment, skills and pay', wording: 'Identify and tackle inequality in employment, skills and pay in the contract workforce.' },
    { code: '7a', group: 'o7', title: 'Remove barriers to entry', wording: 'Remove barriers to entry for young people and under-represented groups.' },
    { code: '7b', group: 'o7', title: 'Pipeline for the future contract workforce', wording: 'Create a pipeline of opportunities for the future contract workforce (outreach activities).' },
    { code: '8a', group: 'o8', title: 'Health and wellbeing in the contract workforce', wording: 'Support health and wellbeing in the contract workforce, including physical and mental health.' }
  ],
  notes: [
    'Minimum 10% of the total score goes to social value.',
    'Buyers are encouraged to pick one outcome, except on the largest contracts.',
    'A response needs a specific, measurable and time-bound commitment to score at all.'
  ]
};

const PPN026: Framework = {
  id: 'PPN026',
  name: 'Social Value Model · PPN 026',
  short: 'PPN 026',
  applies: 'Tender notices from 1 Jan 2027, central government contracts of £1m or more.',
  summary: '2 outcomes (Good Jobs, Skills) and 6 Model Award Criteria.',
  groups: [
    { id: 'o1', title: 'Outcome 1 · Good Jobs', parent: 'Good Jobs and Skills' },
    { id: 'o2', title: 'Outcome 2 · Skills', parent: 'Good Jobs and Skills' }
  ],
  criteria: [
    { code: '1a', group: 'o1', title: 'Create good jobs or apprenticeships', wording: 'New jobs and apprenticeships locally and for target cohorts, in high-growth sectors, with SME and VCSE participation.' },
    { code: '1b', group: 'o1', title: 'Fair working conditions', wording: 'Contracts reflecting actual hours, enhanced leave, flexible working and wellbeing, direct employment.' },
    { code: '1c', group: 'o1', title: 'Fair pay', wording: 'Pay above the minimum and living wage, pay-gap monitoring, sick pay from day one.' },
    { code: '2a', group: 'o2', title: 'Training and retraining', wording: 'Training that closes identified skills gaps, supported internships, provision co-designed with civil society.' },
    { code: '2b', group: 'o2', title: 'In-work progression', wording: 'Upskilling, career advice, mentoring and recognised qualifications.' },
    { code: '2c', group: 'o2', title: 'Talent pipeline', wording: 'Building workforces from target cohorts, deprived areas and shortage industries; essential skills.' }
  ],
  cohorts: [
    '16-24 year olds not in education, employment or training',
    'People moving from education into work',
    'People with a long-term health condition or disability',
    'People with special educational needs or neurodiversity',
    'Care leavers',
    'People on probation and prison leavers',
    'Victims of domestic abuse',
    'Veterans'
  ],
  notes: [
    'Minimum weighting 10% from £1m, 20% from £5m. Contracts of £5m or more carry at least one published KPI.',
    'Scoring is qualitative (0, 1, 3, 6, 10): the method statement and implementation plan are marked, not the volume.',
    'Environmental, supply-chain spend and donation commitments are not scored under this model.',
    'Commitments must be additional to the core contract. Financial donations do not count.'
  ]
};

export const FRAMEWORKS: Framework[] = [PPN0620, PPN002, PPN026];

export const frameworkById = (id: FrameworkId): Framework => FRAMEWORKS.find((f) => f.id === id) ?? PPN0620;

/** "MAC 2.2" for PPN 06/20, "MAC 6c" for the later models. */
export const macLabel = (code: string): string => `MAC ${code}`;

/** Which framework a row of the local Measure-MAC map belongs to, from its free-text version label. */
export function frameworkOfVersion(label: string): FrameworkId | null {
  const v = label.toLowerCase();
  if (/026|2027/.test(v)) return 'PPN026';
  if (/\b002\b|2025/.test(v)) return 'PPN002';
  if (/06\/?20/.test(v)) return 'PPN0620';
  return null;
}
