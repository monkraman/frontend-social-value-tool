// "Done before": link a suggested initiative to initiatives Infosys has already committed on past contracts.
import { lensFor } from './infosysLens';
import type { Initiative, PastInitiative } from './types';

const STOP = new Set(
  'about after their there these those which while where would could should support supporting through within across infosys contract programme people local staff deliver delivered including other using based years'.split(' ')
);

// Related words count as a match: "academy" and "online learning" are both education.
const CONCEPTS: Record<string, string[]> = {
  '#education': ['schoo', 'colle', 'stude', 'pupil', 'educa', 'acade', 'unive', 'learn', 'cours', 'caree'],
  '#digital': ['digit', 'techn', 'sprin', 'cyber', 'compu', 'codin'],
  '#environment': ['carbo', 'emiss', 'green', 'renew', 'susta', 'clima', 'natur'],
  '#reuse': ['waste', 'ewast', 'recyc', 'recov', 'refur', 'circu', 'equip', 'devic'],
  '#jobs': ['emplo', 'recru', 'appre', 'hirin'],
  '#slavery': ['slave', 'traff', 'explo']
};

// Five-letter stems, so "schools" meets "school" and "learners" meets "learning".
function words(text: string): Set<string> {
  const stems = text
    .toLowerCase()
    .replace(/e-waste/g, 'ewaste waste')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 5 && !STOP.has(w))
    .map((w) => w.slice(0, 5));
  const concepts = Object.entries(CONCEPTS)
    .filter(([, list]) => stems.some((s) => list.includes(s)))
    .map(([c]) => c);
  return new Set([...stems, ...concepts]);
}

function score(ini: Initiative, past: PastInitiative): number {
  const codes = new Set(ini.lines.map((l) => l.code));
  const shared = past.measures.filter((c) => codes.has(c)).length;
  const p = ini.pattern;
  const mine = words([p.name, p.what, p.family, ...lensFor(p).terms].join(' '));
  const theirs = words(`${past.name} ${past.what}`);
  const overlap = [...mine].filter((w) => theirs.has(w)).length;
  // A word from the initiative's own name says more than one from its description.
  const named = [...words(p.name)].filter((w) => !w.startsWith('#') && theirs.has(w)).length;
  return shared * 3 + Math.min(overlap, 6) + named;
}

export function doneBefore(ini: Initiative, record: PastInitiative[]): PastInitiative[] {
  return record
    .map((past) => ({ past, s: score(ini, past) }))
    .filter((x) => x.s >= 3)
    .sort((a, b) => b.s - a.s)
    .slice(0, 3)
    .map((x) => x.past);
}

export const withTrackRecord = (list: Initiative[], record: PastInitiative[]): Initiative[] => list.map((ini) => ({ ...ini, done_before: doneBefore(ini, record) }));
