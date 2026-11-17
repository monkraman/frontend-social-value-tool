// The generator's code layer. Picks initiative shapes for a tender, proposes starting volumes and
// values them: units × the (localised) proxy from the local tables. Pure functions, no network.
// Rule references (A-xx) are to the Assumptions sheet of the Monk Spaces knowledge base workbook.
import { frameworkById, macLabel } from './frameworks';
import { BUILT_IN_PATTERNS, directCriteria, lensFor } from './infosysLens';
import { macsForMeasure, unscoredReason } from './measureMac';
import { topicsForPattern } from './policy';
import type {
  EvidenceHit,
  Initiative,
  InitiativeLine,
  LineStatus,
  LocalKnowledge,
  LocalMeasure,
  MacLink,
  Pattern,
  PolicyReading,
  TenderForm,
  UnitFactor
} from './types';

// A-07: one measure per activity. Only one of these can be counted within an initiative.
const EMPLOYMENT = new Set(['NT1', 'NT3', 'NT4', 'NT5', 'NT6', 'NT76', 'NT10', 'NT9']);
// A-06: barrier-group recruitment, capped at one FTE-year per person.
const BARRIER = new Set(['NT3', 'NT4', 'NT5', 'NT6', 'NT76']);
// A-13: carbon counts only beyond the business-as-usual baseline, so it stays conditional.
const CARBON = new Set(['NT31', 'NT31a']);
// Units are £ of supply-chain spend. Local SME and VCSE spend sit inside local spend, so they are not additive.
const SPEND = new Set(['NT14', 'NT18', 'NT19']);
// Secondary measures that describe a separate activity of the same initiative and are on by default.
const COMPANION: Record<string, string> = { NT29: 'NT28', NT13: 'NT11', NT31a: 'NT31' };
const NT19_FACTOR = 1.0073;
const DEFAULT_INCLUDED = 6;

export const DEFAULT_INDUSTRY = 'Computer programming, consultancy and related services';

/** Measures in the same group are not additive within one initiative. */
export const exclusiveGroupOf = (code: string): string | null => (EMPLOYMENT.has(code) ? 'employment' : SPEND.has(code) ? 'spend' : null);

export const targetOf = (form: TenderForm): number => Math.round((form.contract_value_gbp * form.sv_percent) / 100);

/** Proxy £ per unit, localised where the TOM System requires it (A-03: NT1, NT18, NT19 only). */
export function localisedProxy(m: LocalMeasure, k: LocalKnowledge, form: TenderForm): { proxy: number | null; basis: string } {
  const year = m.proxy_year ? ` ${m.proxy_year}` : '';
  if (!m.localised) return { proxy: m.proxy_gbp, basis: `National proxy${year}` };
  const region = k.regions.find((r) => r.region === form.region);
  if (!region) return { proxy: m.proxy_gbp, basis: `National proxy${year} (region not in the tables)` };
  if (m.code === 'NT1') return { proxy: region.median_wage_gbp, basis: `${region.region} median wage` };
  const industry = k.industries.find((i) => i.industry === form.industry);
  if (!industry || region.regional_gva == null) return { proxy: m.proxy_gbp, basis: `National proxy${year} (industry not in the tables)` };
  const nt18 = (industry.gva_multiplier - 1) * region.regional_gva;
  return m.code === 'NT19'
    ? { proxy: nt18 * NT19_FACTOR, basis: `${region.region} GVA × industry multiplier × SME factor` }
    : { proxy: nt18, basis: `${region.region} GVA × industry multiplier` };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Starting volumes sized to the contract. They are a first suggestion for the bid team to change. */
function suggestFactors(code: string, form: TenderForm): UnitFactor[] {
  const s = clamp(form.contract_value_gbp / 10_000_000, 0.2, 20);
  const years = clamp(form.duration_years, 1, 30);
  const n = (label: string, value: number, min: number, max: number, step = 1): UnitFactor => ({ label, value: clamp(Math.round(value / step) * step, min, max), min, max, step });
  const yrs: UnitFactor = { label: 'Years', value: years, min: 1, max: 30, step: 1 };
  const invested = n('£ invested', form.contract_value_gbp * 0.001, 5_000, 250_000, 1_000);
  const share = (label: string, pct: number): UnitFactor[] => [
    { label: 'Contract value (£)', value: form.contract_value_gbp, fixed: true },
    { label, value: pct, percent: true, min: 0, max: 100, step: 0.5 }
  ];
  switch (code) {
    case 'NT1':
      return [n('People employed', 2 * s, 1, 100), yrs];
    case 'NT3':
    case 'NT4':
    case 'NT5':
    case 'NT6':
    case 'NT76':
      return [n('People recruited', 1.5 * s, 1, 80)];
    case 'NT10':
      return [n('Apprentices', 3 * s, 2, 80), n('Weeks each', years >= 1.5 ? 78 : 52, 26, 208)];
    case 'NT9':
      return [n('New employees', 3 * s, 2, 80), n('Weeks of training each', 12, 1, 52)];
    case 'NT80':
      return [n('Employees upskilled', 10 * s, 5, 500), n('Weeks each', 2, 1, 26)];
    case 'NT11':
      return [n('People supported', 20 * s, 10, 400), n('Hours each', 6, 1, 40)];
    case 'NT12':
      return [n('Placements', 2 * s, 1, 40), n('Weeks each', 4, 1, 26)];
    case 'NT13':
      return [n('Placements', 2 * s, 1, 40), n('Weeks each', 8, 1, 52)];
    case 'NT8':
      return [n('Staff volunteers', 8 * s, 4, 150), n('Hours each per year', 8, 1, 60), yrs];
    case 'NT99':
      return [n('Staff hosting visits', 4 * s, 2, 60), n('Hours each per year', 6, 1, 40), yrs];
    case 'NT15':
      return [n('Expert staff', 3 * s, 2, 40), n('Hours each per year', 20, 1, 200), yrs];
    case 'NT17':
    case 'NT29':
      return [n('Staff volunteers', 10 * s, 5, 300), n('Hours each per year', 7.5, 1, 40, 0.5), yrs];
    case 'NT14':
      return share('Spent with VCSEs (%)', 0.5);
    case 'NT18':
      return share('Spent with local companies (%)', 3);
    case 'NT19':
      return share('Spent with local SMEs (%)', 2);
    case 'NT16':
    case 'NT28':
    case 'NT26':
    case 'NT27':
    case 'NT116':
    case 'NT119':
      return [invested];
    case 'NT31':
    case 'NT31a':
      return [n('tCO2e saved per year', 10 * s, 1, 5_000), yrs];
    case 'NT32':
      return [n('Staff in the scheme', 10 * s, 5, 500), n('Miles saved each per year', 1_000, 100, 10_000, 100), yrs];
    case 'NT87':
      return [n('kg of plastic avoided per year', 50 * s, 10, 5_000, 10), yrs];
    default:
      return [{ label: 'Units', value: 0, min: 0, max: 1_000_000, step: 1 }];
  }
}

export const unitsOf = (line: InitiativeLine): number => line.factors.reduce((p, f) => p * (f.percent ? f.value / 100 : f.value), 1);

export const isOn = (line: InitiativeLine): boolean => line.status === 'Counted' || line.status === 'Conditional';

export const lineValue = (line: InitiativeLine): number => (line.proxy_gbp == null ? 0 : unitsOf(line) * line.proxy_gbp);

export const initiativeValue = (ini: Initiative): number => ini.lines.filter((l) => l.status === 'Counted').reduce((t, l) => t + lineValue(l), 0);

export const initiativeConditional = (ini: Initiative): number => ini.lines.filter((l) => l.status === 'Conditional').reduce((t, l) => t + lineValue(l), 0);

/** Criteria an initiative serves through its active lines and, for measure-less shapes, directly. */
export function initiativeMacs(ini: Initiative): MacLink[] {
  const out: MacLink[] = [];
  const add = (l: MacLink) => {
    const i = out.findIndex((x) => x.mac === l.mac);
    if (i < 0) out.push(l);
    else if (out[i].strength === 'supporting' && l.strength === 'direct') out[i] = l;
  };
  ini.lines.filter(isOn).forEach((l) => l.macs.forEach(add));
  ini.direct_macs.forEach(add);
  return out.sort((a, b) => a.mac.localeCompare(b.mac, undefined, { numeric: true }));
}

export type MacRating = 'Strong' | 'Partial' | 'Not scored';

/** How well an initiative evidences the criteria the buyer is scoring (all of them when none are picked). */
export function macRating(ini: Initiative, criteria: string[]): MacRating {
  const links = initiativeMacs(ini).filter((l) => criteria.length === 0 || criteria.includes(l.mac));
  if (links.some((l) => l.strength === 'direct')) return 'Strong';
  return links.length ? 'Partial' : 'Not scored';
}

function buildLines(pattern: Pattern, k: LocalKnowledge, form: TenderForm): InitiativeLine[] {
  const lines: InitiativeLine[] = pattern.measures.map((link) => {
    const m = k.measures.find((x) => x.code === link.code);
    const factors = suggestFactors(link.code, form);
    const { proxy, basis } = m ? localisedProxy(m, k, form) : { proxy: null, basis: '' };
    const notes: string[] = [];
    if (!m) notes.push('Not one of the Open Access measures in your library, so it has no proxy value.');
    if (BARRIER.has(link.code)) notes.push('Capped at one FTE-year per person; one barrier measure per person.');
    if (CARBON.has(link.code)) notes.push('Counts only for savings beyond business-as-usual decarbonisation, against a measured baseline.');
    if (SPEND.has(link.code)) notes.push('Spend cannot exceed the contract value.');
    const unscored = unscoredReason(link.code, form.framework);
    if (unscored) notes.push(unscored);
    const group = exclusiveGroupOf(link.code);
    let status: LineStatus = 'Optional';
    if (!m || proxy == null) status = 'Not valued';
    else if (link.primary || (COMPANION[link.code] && pattern.measures.some((x) => x.code === COMPANION[link.code]))) status = CARBON.has(link.code) ? 'Conditional' : 'Counted';
    return {
      code: link.code,
      name: m?.name ?? link.code,
      unit: m?.unit ?? link.basis,
      theme: m?.theme ?? '',
      primary: link.primary,
      factors,
      suggested: factors.map((f) => ({ ...f })),
      proxy_gbp: proxy,
      proxy_basis: basis,
      status,
      exclusive_group: group,
      macs: macsForMeasure(link.code, form.framework, k.measure_mac),
      note: notes.join(' '),
      evidence_required: m?.target_guidance || m?.evidence_required || ''
    };
  });

  // Within a not-additive group, count the measure that best evidences the selected criteria.
  for (const group of ['employment', 'spend']) {
    const members = lines.filter((l) => l.exclusive_group === group && l.status !== 'Not valued');
    if (members.length < 2) {
      members.forEach((l) => (l.exclusive_group = null));
      continue;
    }
    const direct = (l: InitiativeLine) => l.macs.some((x) => x.strength === 'direct' && form.criteria.includes(x.mac));
    const chosen = members.find((l) => l.primary && (form.criteria.length === 0 || direct(l))) ?? members.find(direct) ?? members.find((l) => l.primary) ?? members[0];
    members.forEach((l) => (l.status = l === chosen ? 'Counted' : 'Alternative'));
  }
  return lines;
}

const FIT_SCORE = { 'Core strength': 2, Deliverable: 1, 'Needs a partner': 0.3 } as const;
const RATING_SCORE = { Strong: 3, Partial: 1.5, 'Not scored': 0 } as const;

export interface BuildInput {
  knowledge: LocalKnowledge;
  form: TenderForm;
  policy: PolicyReading;
  evidence: Record<string, EvidenceHit[]>;
}

/** Every pattern Infosys could offer for this tender, ranked, with the best few switched on. */
export function buildInitiatives({ knowledge, form, policy, evidence }: BuildInput): Initiative[] {
  const framework = frameworkById(form.framework);
  const libraryIds = new Set(knowledge.patterns.map((p) => p.id));
  const patterns = [...knowledge.patterns.filter((p) => !/retired/i.test(p.status)), ...BUILT_IN_PATTERNS.filter((p) => !libraryIds.has(p.id))];

  const initiatives = patterns.map((pattern): Initiative => {
    const lens = lensFor(pattern);
    const lines = buildLines(pattern, knowledge, form);
    const buyer = topicsForPattern(pattern, policy.buyer);
    const own = topicsForPattern(pattern, policy.infosys);
    const hits = evidence[pattern.id] ?? [];
    const valued = lines.some((l) => l.proxy_gbp != null);
    const ini: Initiative = {
      id: pattern.id,
      pattern,
      included: false,
      score: 0,
      lines,
      direct_macs: directCriteria(pattern.id, form.framework),
      fit: lens.fit,
      fit_reason: lens.reason,
      evidence: hits,
      policy_topics: buyer.labels,
      in_infosys_policy: own.labels,
      untraced_reason: valued
        ? null
        : pattern.measures.length
          ? 'The measures linked to this shape are not in your Open Access set, so no value can be calculated yet.'
          : 'No TOM traced. None of the 30 Open Access measures in your library values this activity; the full TOM System has 116.',
      questions: []
    };
    const rating = macRating(ini, form.criteria);
    ini.score = RATING_SCORE[rating] * 2 + buyer.weight * 3 + FIT_SCORE[lens.fit] + Math.min(1, hits.length / 2) + (valued ? 0.3 : 0);
    ini.questions = questionsFor(ini, form, framework.cohorts);
    return ini;
  });

  initiatives.sort((a, b) => b.score - a.score);
  initiatives.filter((i) => macRating(i, form.criteria) !== 'Not scored').slice(0, DEFAULT_INCLUDED).forEach((i) => (i.included = true));
  return initiatives;
}

export function questionsFor(ini: Initiative, form: TenderForm, cohorts?: string[]): string[] {
  const p = ini.pattern;
  const q: string[] = [];
  q.push(
    cohorts
      ? `Name the target cohort (PPN 026 lists: ${cohorts.slice(0, 4).join('; ').toLowerCase()}…), how they will be reached and the places in ${form.region || 'the contract area'}.`
      : `Name the target cohort, how they will be reached and the places in ${form.region || 'the contract area'}.`
  );
  q.push('Set a timed plan with the first delivery within 6 to 12 months of contract start, and quarterly reporting.');
  if (p.needs) q.push(`Confirm these are in place: ${p.needs.toLowerCase()}.`);
  if (ini.fit === 'Needs a partner' || /partner|charity|centre/i.test(p.delivered_by)) q.push(`Name the delivery partner (${p.delivered_by}) and confirm they have agreed.`);
  if (p.additionality) q.push(`Additionality: ${p.additionality}`);
  if (ini.evidence.length) q.push('Infosys has offered this before. State the baseline and what is new for this contract, so it is not read as a company-wide programme.');
  if (ini.in_infosys_policy.length) q.push(`Your Infosys policy already covers ${ini.in_infosys_policy.join(', ').toLowerCase()}. Show what this contract adds beyond business as usual.`);
  if (ini.lines.some((l) => CARBON.has(l.code))) q.push('Carbon value needs a measured prior-year baseline before it can be claimed.');
  q.push('Confirm cost, delivery owner and evidence before committing.');
  return q;
}

/** Scale the counted volumes of the included initiatives towards the target, inside each measure's range. Only on request. */
export function fitToTarget(initiatives: Initiative[], target: number): Initiative[] {
  let next = initiatives;
  for (let pass = 0; pass < 3; pass++) {
    const total = next.filter((i) => i.included).reduce((t, i) => t + initiativeValue(i), 0);
    if (total <= 0 || target <= 0) break;
    const k = clamp(target / total, 0.25, 6);
    if (Math.abs(k - 1) < 0.03) break;
    next = next.map((ini) =>
      !ini.included
        ? ini
        : {
            ...ini,
            lines: ini.lines.map((line) => {
              if (line.status !== 'Counted') return line;
              const idx = line.factors.findIndex((f) => !f.fixed);
              if (idx < 0) return line;
              const f = line.factors[idx];
              const step = f.step ?? 1;
              const value = clamp(Math.round((f.value * k) / step) * step, f.min ?? 0, f.max ?? Number.MAX_SAFE_INTEGER);
              return { ...line, factors: line.factors.map((x, i) => (i === idx ? { ...x, value } : x)) };
            })
          }
    );
  }
  return next;
}

/** Switch a line on or off. Counting a line in a not-additive group turns its alternatives off. */
export function toggleLine(ini: Initiative, code: string): Initiative {
  const line = ini.lines.find((l) => l.code === code);
  if (!line || line.status === 'Not valued') return ini;
  const turningOn = !isOn(line);
  return {
    ...ini,
    lines: ini.lines.map((l) => {
      if (l.code === code) return { ...l, status: turningOn ? (CARBON.has(l.code) ? 'Conditional' : 'Counted') : l.exclusive_group ? 'Alternative' : 'Optional' };
      if (turningOn && line.exclusive_group && l.exclusive_group === line.exclusive_group && isOn(l)) return { ...l, status: 'Alternative' };
      return l;
    })
  };
}

export function setFactor(ini: Initiative, code: string, index: number, value: number): Initiative {
  return {
    ...ini,
    lines: ini.lines.map((l) =>
      l.code !== code ? l : { ...l, factors: l.factors.map((f, i) => (i === index ? { ...f, value: clamp(Number.isFinite(value) ? value : 0, f.min ?? 0, f.max ?? Number.MAX_SAFE_INTEGER) } : f)) }
    )
  };
}

export const resetUnits = (ini: Initiative): Initiative => ({ ...ini, lines: ini.lines.map((l) => ({ ...l, factors: l.suggested.map((f) => ({ ...f })) })) });

export interface Totals {
  target: number;
  counted: number;
  conditional: number;
  percent_of_target: number;
  included: number;
  untraced: number;
}

export function totalsOf(initiatives: Initiative[], form: TenderForm): Totals {
  const on = initiatives.filter((i) => i.included);
  const target = targetOf(form);
  const counted = on.reduce((t, i) => t + initiativeValue(i), 0);
  return {
    target,
    counted,
    conditional: on.reduce((t, i) => t + initiativeConditional(i), 0),
    percent_of_target: target > 0 ? (counted / target) * 100 : 0,
    included: on.length,
    untraced: on.filter((i) => i.untraced_reason).length
  };
}

/** Things the bid team should know about the package as it stands. */
export function checksOf(initiatives: Initiative[], form: TenderForm, knowledge: LocalKnowledge): string[] {
  const t = totalsOf(initiatives, form);
  const on = initiatives.filter((i) => i.included);
  const out: string[] = [];
  if (!on.length) out.push('No initiative is switched on. Add one from the list below.');
  else if (t.percent_of_target < 95) out.push(`The package reaches ${t.percent_of_target.toFixed(0)}% of the target. Raise units, add an initiative, or accept the gap: evaluators mark the method statement, not the £ total.`);
  else if (t.percent_of_target > 130) out.push(`The package is ${t.percent_of_target.toFixed(0)}% of the target. Check the volumes are deliverable before committing.`);
  if (t.untraced) out.push(`${t.untraced} initiative${t.untraced > 1 ? 's have' : ' has'} no TOM value: the activity is scoreable, but your library holds 30 of the 116 TOM measures and none covers it.`);
  const unscored = on.filter((i) => macRating(i, form.criteria) === 'Not scored');
  if (unscored.length) out.push(`${unscored.map((i) => i.pattern.name).join(', ')}: carries TOM value but does not evidence the selected criteria.`);
  const selected = frameworkById(form.framework).criteria.filter((c) => form.criteria.includes(c.code));
  const uncovered = selected.filter((c) => !on.some((i) => initiativeMacs(i).some((l) => l.mac === c.code)));
  if (uncovered.length) out.push(`No initiative evidences ${uncovered.map((c) => macLabel(c.code)).join(', ')} yet.`);
  if (t.conditional > 0) out.push('Conditional value (carbon) is shown separately and is not in the counted total.');
  if (on.length > 4) out.push('Scored bids did best with one or two commitments worked through in depth. Consider leading the written response with the strongest two.');
  out.push(...knowledge.warnings);
  return out;
}

const lower = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

/** First-draft wording for the method statement. No £ figures: the value sits in the tables. */
export function bidParagraph(ini: Initiative, form: TenderForm): string {
  const p = ini.pattern;
  const volumes = ini.lines
    .filter(isOn)
    .map((l) =>
      l.factors
        .filter((f) => !f.fixed && f.label !== 'Years')
        .map((f) => `${f.value.toLocaleString('en-GB')}${f.percent ? '%' : ''} ${lower(f.label.replace(/\s*\(%\)$/, ''))}`)
        .join(', ')
    )
    .filter(Boolean);
  const macs = initiativeMacs(ini).filter((l) => form.criteria.length === 0 || form.criteria.includes(l.mac));
  const parts = [
    [`${p.name}.`, p.what, p.who_benefits ? `This is for ${lower(p.who_benefits)}${form.region ? ` in ${form.region}` : ''}.` : ''].filter(Boolean).join(' '),
    volumes.length ? `Over the ${form.duration_years}-year contract Infosys commits to ${volumes.join('; ')}.` : '',
    `Delivery is led by ${lower(p.delivered_by)}, with the first activity in the opening 12 months and progress reported to ${form.client || 'the Authority'} every quarter.`,
    macs.length ? `This evidences ${macs.map((l) => macLabel(l.mac)).join(', ')} of the ${frameworkById(form.framework).short} model.` : ''
  ];
  return parts.filter(Boolean).join(' ');
}
