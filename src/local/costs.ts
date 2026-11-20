// What an initiative costs Infosys to deliver, and cheaper measures that serve the same criteria.
// Unit costs and value per £1 come from the workbook's Levers sheet; staff rates and past
// non-staff costs (devices, licences, partner fees) from its Cost sheet.
import { initiativeValue, isOn, unitsOf } from './engine';
import { macsForMeasure } from './measureMac';
import { plainMeasure } from './plainLanguage';
import type { CostBasis, CostExample, CostItem, CostTables, Initiative, InitiativeLine, LocalKnowledge, MeasureCost, TenderForm } from './types';

export const BASIS_LABEL: Record<CostBasis, string> = {
  hour: 'per hour',
  day: 'per day',
  month: 'per month',
  person: 'per person',
  unit: 'per unit',
  fixed: 'fixed sum'
};

const EMPTY: CostTables = { levers: [], rate_card: [], examples: [] };
export const costTables = (k: LocalKnowledge | null | undefined): CostTables => k?.costs ?? EMPTY;

const leverOf = (code: string, t: CostTables): MeasureCost | undefined => t.levers.find((l) => l.code === code);

/** The better of UK and offshore delivery: what £1 of Infosys cost returns in social value. */
export function valuePerPound(code: string, t: CostTables): number | null {
  const l = leverOf(code, t);
  if (!l) return null;
  const both = [l.value_per_gbp_uk, l.value_per_gbp_offshore].filter((v): v is number => typeof v === 'number');
  return both.length ? Math.max(...both) : null;
}

/** The people behind a line: its first factor when the quantity is split (apprentices × weeks). */
export function peopleOf(line: InitiativeLine): number | null {
  return line.factors.length > 1 && !line.factors[0].percent && !line.factors[0].fixed ? line.factors[0].value : null;
}

/** The quantity a cost row takes from the valuation, so "40 apprentices" follows any edit there. */
export function quantityOf(item: CostItem, ini: Initiative): number {
  if (!item.link) return item.quantity;
  const line = ini.lines.find((l) => l.code === item.link!.code);
  if (!line || !isOn(line)) return 0;
  return item.link.what === 'people' ? (peopleOf(line) ?? unitsOf(line)) : unitsOf(line);
}

/** What the row's quantity is, in words: "40 apprentices" or "480 apprentice weeks". */
export function quantityLabel(item: CostItem, ini: Initiative): string {
  if (!item.link) return '';
  const line = ini.lines.find((l) => l.code === item.link!.code);
  if (!line) return '';
  if (item.link.what === 'people') return line.factors.length > 1 ? line.factors[0].label.toLowerCase() : 'people';
  return plainMeasure(line.code, line.name, line.unit).unit;
}

export const itemCost = (item: CostItem, ini: Initiative): number => (item.basis === 'fixed' ? item.rate : item.rate * quantityOf(item, ini) * (item.each || 1));

let seq = 0;
export const newCostId = () => `c${Date.now().toString(36)}${(seq++).toString(36)}`;

/** Only what the bid team entered: nothing is costed on their behalf. */
export const costsOf = (ini: Initiative): CostItem[] => ini.costs ?? [];

export const initiativeCost = (ini: Initiative, _k?: LocalKnowledge | null): number => costsOf(ini).reduce((t, c) => t + itemCost(c, ini), 0);

/** Social value per £1 Infosys spends delivering it, or null when nothing is costed. */
export function returnOnCost(ini: Initiative, k: LocalKnowledge | null): number | null {
  const cost = initiativeCost(ini, k);
  return cost > 0 ? initiativeValue(ini) / cost : null;
}

/** Non-staff costs past initiatives like this one needed, offered as rows to add. */
export function pastCosts(ini: Initiative, k: LocalKnowledge | null): CostExample[] {
  const ids = new Set((ini.done_before ?? []).map((d) => d.id));
  return costTables(k).examples.filter((e) => ids.has(e.initiative) && (e.amount_gbp ?? 0) > 0);
}

export interface CheaperOption {
  code: string;
  name: string;
  unit: string;
  value_per_gbp: number;
  instead_of: string;
  instead_value_per_gbp: number;
  mac: string;
}

/** Measures that serve the same criterion as a costly line and return clearly more per £1.
 *
 * Apprenticeships return about 50p of social value per £1 they cost Infosys; employability
 * support returns about £5. Where both serve the criterion being scored, the cheaper one should
 * at least be on the table.
 */
export function cheaperOptions(ini: Initiative, k: LocalKnowledge | null, form: TenderForm): CheaperOption[] {
  if (!k) return [];
  const t = costTables(k);
  const used = new Set(ini.lines.map((l) => l.code));
  const out: CheaperOption[] = [];
  for (const line of ini.lines.filter((l) => isOn(l) && l.proxy_gbp != null)) {
    const own = valuePerPound(line.code, t);
    if (own == null) continue;
    const macs = macsForMeasure(line.code, form.framework, k.measure_mac)
      .filter((m) => m.strength === 'direct')
      .map((m) => m.mac)
      .filter((m) => form.criteria.length === 0 || form.criteria.includes(m));
    for (const m of k.measures) {
      if (used.has(m.code) || out.some((o) => o.code === m.code)) continue;
      const v = valuePerPound(m.code, t);
      if (v == null || v < own * 1.5 || v < 1) continue;
      const shared = macsForMeasure(m.code, form.framework, k.measure_mac).find((x) => x.strength === 'direct' && macs.includes(x.mac));
      if (!shared) continue;
      const plain = plainMeasure(m.code, m.name, m.unit);
      out.push({ code: m.code, name: plain.name, unit: plain.unit, value_per_gbp: v, instead_of: plainMeasure(line.code, line.name, line.unit).name, instead_value_per_gbp: own, mac: shared.mac });
    }
  }
  return out.sort((a, b) => b.value_per_gbp - a.value_per_gbp).slice(0, 3);
}
