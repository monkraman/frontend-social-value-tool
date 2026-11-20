// What an initiative costs to deliver, as the bid team enters it. The tool supplies no rates or
// figures of its own: only the structure (rate × quantity × multiplier) and the link from a
// quantity to a target, so "40 apprentices" in the cost follows any change to the target.
import { initiativeValue, isOn, unitsOf } from './engine';
import { plainMeasure } from './plainLanguage';
import type { CostBasis, CostItem, Initiative, InitiativeLine } from './types';

export const BASIS_LABEL: Record<CostBasis, string> = {
  hour: 'per hour',
  day: 'per day',
  month: 'per month',
  person: 'per person',
  unit: 'per unit',
  fixed: 'fixed sum'
};

/** The people behind a line: its first factor when the target is split (apprentices × weeks). */
export function peopleOf(line: InitiativeLine): number | null {
  return line.factors.length > 1 && !line.factors[0].percent && !line.factors[0].fixed ? line.factors[0].value : null;
}

/** The quantity a cost row uses: typed in, or taken live from a target. */
export function quantityOf(item: CostItem, ini: Initiative): number {
  if (!item.link) return item.quantity;
  const line = ini.lines.find((l) => l.code === item.link!.code);
  if (!line || !isOn(line)) return 0;
  return item.link.what === 'people' ? (peopleOf(line) ?? unitsOf(line)) : unitsOf(line);
}

/** What a linked quantity counts, in words: "apprentices" or "apprentice weeks". */
export function quantityLabel(item: CostItem, ini: Initiative): string {
  if (!item.link) return '';
  const line = ini.lines.find((l) => l.code === item.link!.code);
  if (!line) return '';
  if (item.link.what === 'people') return line.factors.length > 1 ? line.factors[0].label.toLowerCase() : 'people';
  return plainMeasure(line.code, line.name, line.unit).unit;
}

export const itemCost = (item: CostItem, ini: Initiative): number =>
  item.basis === 'fixed' ? item.rate : item.rate * quantityOf(item, ini) * (item.each || 1);

let seq = 0;
export const newCostId = () => `c${Date.now().toString(36)}${(seq++).toString(36)}`;

export const initiativeCost = (ini: Initiative): number => (ini.costs ?? []).reduce((t, c) => t + itemCost(c, ini), 0);

/** Social value per £1 of the cost the bid team entered, or null until something is costed. */
export function returnOnCost(ini: Initiative): number | null {
  const cost = initiativeCost(ini);
  return cost > 0 ? initiativeValue(ini) / cost : null;
}
