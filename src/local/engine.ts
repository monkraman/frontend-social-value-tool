// The generator's code layer: values the AI's initiatives as units × the (localised) proxy from
// the tables, and enforces the counting rules. Pure functions, no network.
// Rule references (A-xx) are to the Assumptions sheet of the Monk Spaces knowledge base workbook.
import { frameworkById, macLabel } from './frameworks';
import { plainMeasure } from './plainLanguage';
import type { Initiative, InitiativeLine, LocalKnowledge, LocalMeasure, MacLink, TenderForm } from './types';

// A-07: one measure per activity. Only one of these can be counted within an initiative.
const EMPLOYMENT = new Set(['NT1', 'NT3', 'NT4', 'NT5', 'NT6', 'NT76', 'NT10', 'NT9']);
// Units are £ of supply-chain spend. Local SME and VCSE spend sit inside local spend, so they are not additive.
// A-13: carbon counts only beyond the business-as-usual baseline, so it stays conditional.
const CARBON = new Set(['NT31', 'NT31a']);
const SPEND = new Set(['NT14', 'NT18', 'NT19']);
const NT19_FACTOR = 1.0073;

export const DEFAULT_INDUSTRY = 'Computer programming, consultancy and related services';

/** What the buyer asked for: the weighting applied to the contract value. */
const targetOf = (form: TenderForm): number => Math.round((form.contract_value_gbp * form.sv_percent) / 100);

/** Measures in the same group are not additive within one initiative. */
export const exclusiveGroupOf = (code: string): string | null => (EMPLOYMENT.has(code) ? 'employment' : SPEND.has(code) ? 'spend' : null);


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
  // Phrased so it stays true whichever partner is picked later: the choice itself lives on the
  // card, and a question baked in at generation time would go stale the moment it changed.
  if (ini.partner_suggested || ini.fit === 'Needs a partner')
    q.push('Confirm the delivery partner has agreed to deliver this, and on what terms.');
  if (p.additionality) q.push(`Additionality: ${p.additionality}`);
  if (ini.evidence.length) q.push('Infosys has offered this before. State the baseline and what is new for this contract, so it is not read as a company-wide programme.');
  if (ini.in_infosys_policy.length) q.push(`Your Infosys policy already covers ${ini.in_infosys_policy.join(', ').toLowerCase()}. Show what this contract adds beyond business as usual.`);
  if (ini.lines.some((l) => CARBON.has(l.code))) q.push('Carbon value needs a measured prior-year baseline before it can be claimed.');
  q.push('Confirm cost, delivery owner and evidence before committing.');
  return q;
}

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

/** True once any volume differs from what the AI proposed, whether scaled or edited by hand. */
/** Who the bid may say delivers this.
 *
 * A partner the AI proposed has agreed to nothing. Until the bid team picks one, the wording
 * says a partner is still to be confirmed rather than naming a firm that has never been asked.
 */
export function deliveryOf(ini: Initiative): { by: string; partner: string; pending: boolean } {
  const suggested = (ini.partner_suggested ?? '').trim();
  if (ini.partner_choice !== undefined) {
    const chosen = ini.partner_choice.trim();
    return { by: chosen || 'Infosys', partner: chosen, pending: false };
  }
  if (!suggested) return { by: ini.pattern.delivered_by || 'Infosys', partner: '', pending: false };
  return { by: 'Infosys with a delivery partner, to be confirmed', partner: '', pending: true };
}

export const unitsChanged = (initiatives: Initiative[]): boolean => initiatives.some(volumesEdited);

/** True once a volume on this initiative differs from what the AI proposed. */
/** The bid team has changed this line's numbers since the AI's answer came back. */
export const lineEdited = (l: InitiativeLine): boolean => l.factors.some((f, k) => f.value !== l.suggested[k]?.value);

/** The package was cut back to the target, so this line is no longer what the AI proposed. */
export const lineTrimmed = (l: InitiativeLine): boolean => l.units_proposed != null && l.units_proposed !== unitsOf({ ...l, factors: l.suggested });

/** True once any number on this initiative differs from what the AI wrote into its prose. */
export const volumesEdited = (ini: Initiative): boolean => ini.lines.some((l) => lineEdited(l) || lineTrimmed(l));

/** "12 apprentices, 78 weeks each", "10 people", "£300,000 spent": a line's quantity in words. */
export function quantityPhrase(l: InitiativeLine): string {
  return l.factors
    .filter((f) => !f.fixed && f.label !== 'Years')
    .map((f) => {
      const n = f.value.toLocaleString('en-GB', { maximumFractionDigits: f.value < 10 ? 1 : 0 });
      if (/^£/.test(f.label)) return `£${n} ${f.label.replace(/^£\s*/, '')}`.trim();
      return `${n}${f.percent ? '%' : ''} ${lower(f.label.replace(/\s*\(%\)$/, ''))}`;
    })
    .join(', ');
}

/** What this initiative commits to, written from the lines that are counted.
 *
 * "Hiring people out of work for a year or more: 10 people". Built from the same numbers as the
 * value, so the commitment and the table cannot disagree, and any edit shows up in both.
 */
export function commitmentOf(ini: Initiative): string {
  return ini.lines
    .filter((l) => isOn(l) && l.proxy_gbp != null && unitsOf(l) > 0)
    .map((l) => `${plainMeasure(l.code, l.name, l.unit).name}: ${quantityPhrase(l)}`)
    .join('; ');
}

/** Take the figures out of the AI's description, so it cannot contradict the table.
 *
 * The AI used to write "recruit 40 people" while its own line said 20 — and after any edit
 * both are wrong. The quantity is shown from the lines; the description keeps only the who,
 * where and how. "Level 3/4" and durations like "over 5 years" are left alone.
 */
export const withoutQuantities = (text: string): string =>
  text
    .replace(/(?<![\w/£.-])(?<!Level )\d[\d,]*(?:\.\d+)?%?\s+(?=[a-z])(?!(?:years?|months?|days?|weeks? each)\b)/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

/** The wording to show: the AI's until a volume changes under it, then one built from the numbers.
 *
 * The AI writes its volumes into the prose. Change sixteen apprentices to twenty and the table,
 * the value and the paragraph stop agreeing — so once a volume moves, the paragraph is rebuilt
 * from the lines. Wording the bid team typed themselves is always kept.
 */
export function wordingFor(ini: Initiative, form: TenderForm): string {
  if (ini.edited && ini.wording) return ini.wording;
  if (ini.wording && !volumesEdited(ini)) return ini.wording;
  return bidParagraph(ini, form);
}

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
  const volumes = ini.lines.filter(isOn).map(quantityPhrase).filter(Boolean);
  const macs = initiativeMacs(ini).filter((l) => form.criteria.length === 0 || form.criteria.includes(l.mac));
  const parts = [
    // The description's own figures would contradict the volumes stated next; only the bid team's own words keep theirs.
    [`${p.name}.`, ini.edited ? p.what : withoutQuantities(p.what), p.who_benefits ? `This is for ${lower(p.who_benefits)}${form.region ? ` in ${form.region}` : ''}.` : ''].filter(Boolean).join(' '),
    volumes.length ? `Over the ${form.duration_years}-year contract Infosys commits to ${volumes.join('; ')}.` : '',
    // Not lowercased: this is a partner's name or "Infosys", and both are proper nouns.
    `Delivery is led by ${deliveryOf(ini).by}, with the first activity in the opening 12 months and progress reported to ${form.client || 'the Authority'} every quarter.`,
    macs.length ? `This evidences ${macs.map((l) => macLabel(l.mac)).join(', ')} of the ${frameworkById(form.framework).short} model.` : ''
  ];
  return parts.filter(Boolean).join(' ');
}
