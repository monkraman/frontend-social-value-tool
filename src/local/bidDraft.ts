// A draft bid response for one initiative, laid out like Infosys's past social value responses:
// method statement, who we prioritise, mobilisation, the commitment, delivery plan, track record, governance, impact.
import { formatGbp } from '../utils/formatters';
import { deliveryOf, initiativeMacs, isOn, lineValue, unitsOf, wordingFor } from './engine';
import { frameworkById, macLabel } from './frameworks';
import { plainMeasure } from './plainLanguage';
import type { Initiative, InitiativeLine, TenderForm } from './types';

export interface DraftSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  table?: { head: string[]; rows: string[][] };
}

export interface BidDraft {
  title: string;
  sections: DraftSection[];
}

const fmt = (n: number) => n.toLocaleString('en-GB', { maximumFractionDigits: n < 10 ? 1 : 0 });
const sentence = (s: string) => {
  const t = s.trim();
  return t ? t[0].toUpperCase() + t.slice(1) + (/[.!?]$/.test(t) ? '' : '.') : '';
};

function cohorts(ini: Initiative): string[] {
  const listed = ini.pattern.who_benefits
    .split(/[;,]|\band\b/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
  if (listed.length) return listed.map((s) => s[0].toUpperCase() + s.slice(1));
  return ['People facing barriers to work in the local area', 'Learners from areas of economic deprivation', 'Groups under-represented in technology careers'];
}

export function bidDraft(ini: Initiative, form: TenderForm, client = ''): BidDraft {
  const buyer = client.trim() || 'the Authority';
  const fw = frameworkById(form.framework);
  const macs = initiativeMacs(ini).filter((l) => form.criteria.length === 0 || form.criteria.includes(l.mac));
  const lead = macs[0] ?? initiativeMacs(ini)[0];
  const criterion = lead ? fw.criteria.find((c) => c.code === lead.mac) : undefined;
  const p = ini.pattern;
  const years = form.duration_years;
  const counted = ini.lines.filter((l) => isOn(l) && l.proxy_gbp != null && unitsOf(l) > 0);
  // Only a partner the bid team has chosen is named here. An unconfirmed suggestion stays unnamed.
  const delivery = deliveryOf(ini);
  const partner = /infosys|supplier/i.test(delivery.partner) ? '' : delivery.partner;

  const sections: DraftSection[] = [];

  sections.push({
    heading: 'Method statement',
    paragraphs: [
      wordingFor(ini, form).trim() ||
        `Through delivery of the contract, Infosys will ${p.what ? p.what.charAt(0).toLowerCase() + p.what.slice(1).replace(/\.$/, '') : `deliver ${p.name.toLowerCase()}`}${form.region ? ` in the ${form.region}` : ''}. This builds on the technology and services delivered under this contract, so that the benefit is additional to business as usual and directly relevant to ${buyer}.`,
      sentence(ini.fit_reason)
    ].filter(Boolean)
  });

  sections.push({ heading: 'Infosys will prioritise engagement with', bullets: cohorts(ini) });

  sections.push({
    heading: 'Mobilisation',
    paragraphs: [
      `During mobilisation, Infosys will work with ${partner ? `${partner} and ` : ''}local partners to identify participants, agree baselines and confirm the measures we report against. Activities will be shaped around participants’ needs and barriers, so that content is relevant, accessible and inclusive.${
        delivery.pending ? ' [Confirm the delivery partner before this goes in a bid.]' : ''
      }`
    ]
  });

  sections.push({
    heading: `${years}-year commitment`,
    paragraphs: ['Over the contract period, Infosys will:'],
    bullets: counted.length
      ? counted.map((l) => {
          const plain = plainMeasure(l.code, l.name, l.unit);
          return `${plain.name}: ${fmt(unitsOf(l))} ${plain.unit} (${l.code}), worth ${formatGbp(lineValue(l))} in social value.`;
        })
      : [`Deliver ${p.name.toLowerCase()} with targets agreed with ${buyer} at mobilisation.`]
  });

  const phased = phasedFromPastDelivery(ini, years);
  if (phased) {
    sections.push(phased);
  } else {
    sections.push(yearByYear(years, buyer, counted));
  }

  if (ini.done_before?.length) {
    const contracts = [...new Set(ini.done_before.map((d) => d.contract).filter(Boolean))].join(' and ');
    sections.push({
      heading: 'Track record',
      paragraphs: [contracts ? `Infosys has already committed similar work on the ${contracts}:` : 'Infosys has already committed similar work:'],
      bullets: ini.done_before.map((d) => {
        const volume = d.volume.split(';')[0].replace(/\(.*?\)/g, '').trim();
        return /\d/.test(volume) ? `${d.name}: ${volume}.` : `${d.name}.`;
      })
    });
  }

  sections.push({
    heading: 'Governance and success measures',
    paragraphs: [
      `Delivery will be overseen by the Infosys Social Value Lead and reported to ${buyer} at agreed intervals, with an annual report and a final impact assessment.${
        counted.length ? ` Progress is measured with the Open Access TOM System (${counted.map((l) => l.code).join(', ')}).` : ''
      }`
    ]
  });

  sections.push({
    heading: 'Impact',
    paragraphs: [
      `${criterion ? `This commitment responds to ${macLabel(criterion.code)} (${criterion.title}). ` : ''}Through ${p.name}, Infosys will leave a lasting benefit for ${buyer}, local communities and the wider workforce.`
    ]
  });

  return { title: criterion ? `${macLabel(criterion.code)}: ${criterion.title} — ${p.name}` : p.name, sections };
}

/** Months between two dd/mm/yyyy dates, or null when either cannot be read. */
function monthsBetween(from: string, to: string): number | null {
  const parse = (d: string) => {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d.trim());
    return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null;
  };
  const a = parse(from);
  const b = parse(to);
  if (!a || !b) return null;
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

const when = (month: number) => (month < 12 ? `Month ${month + 1}` : `Year ${Math.floor(month / 12) + 1}, month ${(month % 12) + 1}`);

/** The sequence Infosys actually followed last time, re-based to this contract.
 *
 * The scorecard records real dates from a contract that started years ago and may run longer
 * than this one. Dates from another contract mean nothing in this bid, so they become offsets
 * from the first step and are squeezed to fit this contract's term.
 */
function phasedFromPastDelivery(ini: Initiative, years: number): DraftSection | null {
  const steps = (ini.done_before ?? []).flatMap((d) => d.delivery ?? []).filter((s) => s.step && s.due);
  if (steps.length < 2) return null;

  const dated = steps.map((s) => ({ ...s, offset: 0 }));
  const earliest = dated.reduce((a, b) => (monthsBetween(b.due, a.due) ?? 0) > 0 ? b : a);
  for (const s of dated) s.offset = Math.max(0, monthsBetween(earliest.due, s.due) ?? 0);

  const span = Math.max(...dated.map((s) => s.offset));
  const months = years * 12;
  // A 15-year programme compressed into a 5-year contract keeps its shape, not its calendar.
  const squeeze = span > months - 1 && span > 0 ? (months - 1) / span : 1;

  const seen = new Set<string>();
  const rows = dated
    .sort((a, b) => a.offset - b.offset)
    .filter((s) => !seen.has(s.step.toLowerCase()) && seen.add(s.step.toLowerCase()))
    .map((s) => [when(Math.round(s.offset * squeeze)), s.step, s.cycle || 'Once']);

  return {
    heading: 'Delivery plan',
    paragraphs: [
      `Phased as Infosys phased the same work before, timed from contract start over ${years} years. ` +
        'Confirm the dates with the Authority at mobilisation.'
    ],
    table: { head: ['When', 'Step', 'Reported'], rows }
  };
}

/** The fallback when there is no past phasing to follow: volumes spread across the term. */
function yearByYear(years: number, buyer: string, counted: InitiativeLine[]): DraftSection {
  const shown = Math.min(years, 5);
  const head = ['Activity', ...Array.from({ length: shown }, (_, i) => (i === shown - 1 && years > shown ? `Years ${shown}–${years}` : `Year ${i + 1}`))];
  const perYear = (total: number, i: number) => {
    const span = i === shown - 1 ? years - shown + 1 : 1;
    return fmt((total / years) * span);
  };
  return {
    heading: 'Delivery plan',
    table: {
      head,
      rows: [
        ['Identify cohorts and engage delivery partners', ...head.slice(1).map((_, i) => (i === 0 ? 'Q1' : 'Review and refine'))],
        ...counted.map((l) => {
          const plain = plainMeasure(l.code, l.name, l.unit);
          return [`${plain.name} (${plain.unit})`, ...head.slice(1).map((_, i) => perYear(unitsOf(l), i))];
        }),
        [`Progress report to ${buyer}`, ...head.slice(1).map(() => '✓')]
      ]
    }
  };
}

export function draftText(d: BidDraft): string {
  const out = [d.title, ''];
  for (const s of d.sections) {
    out.push(s.heading, '');
    s.paragraphs?.forEach((p) => out.push(p, ''));
    s.bullets?.forEach((b) => out.push(`• ${b}`));
    if (s.bullets) out.push('');
    if (s.table) {
      out.push(s.table.head.join(' | '));
      s.table.rows.forEach((r) => out.push(r.join(' | ')));
      out.push('');
    }
  }
  return out.join('\n').trim();
}
