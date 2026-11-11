// Reads a policy or tender text for the priorities it names. Rule-based: a fixed list of topics,
// each found by its own words, with the sentences it was found in. No language model is involved.
import type { Pattern, PolicyTopic } from './types';

interface Topic {
  id: string;
  label: string;
  words: RegExp;
  /** Pattern theme concepts this topic favours. */
  concepts: string[];
  /** Pattern IDs this topic favours most. */
  patterns: string[];
}

const TOPICS: Topic[] = [
  { id: 'jobs', label: 'Local jobs', words: /local (jobs?|employment|people|residents|recruitment)|job creation|employment opportunit/gi, concepts: ['Jobs'], patterns: ['PAT-01', 'PAT-02'] },
  { id: 'apprenticeships', label: 'Apprenticeships', words: /apprentice|t[- ]levels?|traineeship/gi, concepts: ['Jobs', 'Skills'], patterns: ['PAT-01'] },
  { id: 'barriers', label: 'People facing barriers to work', words: /\bneets?\b|care leavers?|care[- ]experienced|ex-?offenders?|prison leavers?|long[- ]term unemployed|disab|barriers to (work|employment)|under-?represented|veterans?|homeless/gi, concepts: ['Equal opportunity'], patterns: ['PAT-02', 'PAT-04'] },
  { id: 'skills', label: 'Skills and training', words: /skills|training|upskill|retrain|qualifications?/gi, concepts: ['Skills'], patterns: ['PAT-03', 'INF-01'] },
  { id: 'education', label: 'Schools and young people', words: /schools?|colleges?|students?|young people|careers? (talks?|advice)|\bstem\b|work experience/gi, concepts: ['Skills'], patterns: ['PAT-05', 'PAT-04'] },
  { id: 'supply', label: 'Local, SME and VCSE supply chain', words: /\bsmes?\b|\bvcses?\b|\bvcfse\b|local (suppliers?|businesses|spend|econom)|supply chains?|social enterprises?|voluntary sector/gi, concepts: ['Local economy'], patterns: ['PAT-06', 'PAT-07', 'INF-02'] },
  { id: 'community', label: 'Community and volunteering', words: /volunteer|community (groups?|projects?|organisations?|cohesion)|charit|donat/gi, concepts: ['Community'], patterns: ['PAT-08', 'PAT-07', 'INF-06'] },
  { id: 'health', label: 'Health and wellbeing', words: /wellbeing|well-being|mental health|health inequalit|healthy|loneliness/gi, concepts: ['Community'], patterns: ['PAT-09', 'INF-04'] },
  { id: 'digital', label: 'Digital inclusion', words: /digital (inclusion|exclusion|skills|divide|access|poverty)|digitally excluded|connectivity/gi, concepts: ['Community', 'Skills'], patterns: ['PAT-09', 'INF-01', 'PAT-12'] },
  { id: 'climate', label: 'Carbon and net zero', words: /carbon|net[- ]zero|emissions?|climate|decarboni[sz]|greenhouse/gi, concepts: ['Environment'], patterns: ['PAT-10'] },
  { id: 'nature', label: 'Green space and nature', words: /biodiversity|green spaces?|nature|tree planting|habitats?/gi, concepts: ['Environment'], patterns: ['PAT-11'] },
  { id: 'waste', label: 'Waste and circular economy', words: /waste|recycl|circular|re-?use|refurbish|plastics?/gi, concepts: ['Environment'], patterns: ['PAT-12'] },
  { id: 'pay', label: 'Fair pay and good work', words: /living wage|fair (pay|work)|good work|zero[- ]hours|flexible working|pay gap/gi, concepts: ['Jobs'], patterns: ['INF-05'] },
  { id: 'slavery', label: 'Modern slavery and ethical supply', words: /modern slavery|ethical (sourcing|procurement|supply)|human rights/gi, concepts: ['Equal opportunity'], patterns: ['INF-03'] },
  { id: 'cyber', label: 'Cyber security', words: /cyber/gi, concepts: ['Local economy'], patterns: ['INF-02'] },
  { id: 'abuse', label: 'Crime and domestic abuse', words: /domestic abuse|violence against women|community safety|reoffending|crime/gi, concepts: ['Community'], patterns: ['INF-07', 'PAT-02'] }
];

function sentenceAround(text: string, index: number): string {
  const start = Math.max(text.lastIndexOf('.', index - 1), text.lastIndexOf('\n', index - 1), index - 200) + 1;
  const stops = [text.indexOf('.', index), text.indexOf('\n', index)].filter((i) => i > 0);
  const end = Math.min(stops.length ? Math.min(...stops) + 1 : text.length, index + 240);
  return text.slice(start, end).replace(/\s+/g, ' ').trim();
}

/** Topics the text names, most mentioned first, each with up to two sentences as evidence. */
export function readPolicy(text: string): PolicyTopic[] {
  if (!text.trim()) return [];
  const found: PolicyTopic[] = [];
  for (const t of TOPICS) {
    const matches = [...text.matchAll(t.words)];
    if (!matches.length) continue;
    const snippets: string[] = [];
    for (const m of matches) {
      const s = sentenceAround(text, m.index ?? 0);
      if (s.length > 30 && !snippets.includes(s)) snippets.push(s);
      if (snippets.length === 2) break;
    }
    found.push({ id: t.id, label: t.label, hits: matches.length, snippets });
  }
  return found.sort((a, b) => b.hits - a.hits);
}

/** Topics (by label) that favour a pattern, and how strongly (0 to 1) given how often each is named. */
export function topicsForPattern(pattern: Pattern, topics: PolicyTopic[]): { labels: string[]; weight: number } {
  if (!topics.length) return { labels: [], weight: 0 };
  const top = topics[0].hits;
  // Shapes the topic list names are matched by name only; shapes added to the library later fall back to their theme concepts.
  const isKnown = TOPICS.some((t) => t.patterns.includes(pattern.id));
  const labels: string[] = [];
  let weight = 0;
  for (const found of topics) {
    const t = TOPICS.find((x) => x.id === found.id);
    if (!t) continue;
    const named = t.patterns.includes(pattern.id);
    const byConcept = !isKnown && t.concepts.some((c) => pattern.theme_concepts.includes(c));
    if (!named && !byConcept) continue;
    labels.push(found.label);
    weight += (named ? 1 : 0.5) * (0.4 + 0.6 * (found.hits / top));
  }
  return { labels, weight: Math.min(1, weight / 2) };
}
