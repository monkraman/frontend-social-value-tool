// A draft bid response for one initiative, laid out like Infosys's past social value responses:
// method statement, who we prioritise, mobilisation, the commitment, delivery plan, track record, governance, impact.
import { formatGbp } from '../utils/formatters';
import { initiativeMacs, isOn, lineValue, unitsOf } from './engine';
import { frameworkById, macLabel } from './frameworks';
import { plainMeasure } from './plainLanguage';
import type { Initiative, TenderForm } from './types';

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
  const partner = /infosys|supplier/i.test(p.delivered_by) ? '' : p.delivered_by;

  const sections: DraftSection[] = [];

  sections.push({
    heading: 'Method statement',
    paragraphs: [
      ini.wording?.trim() ||
        `Through delivery of the contract, Infosys will ${p.what ? p.what.charAt(0).toLowerCase() + p.what.slice(1).replace(/\.$/, '') : `deliver ${p.name.toLowerCase()}`}${form.region ? ` in the ${form.region}` : ''}. This builds on the technology and services delivered under this contract, so that the benefit is additional to business as usual and directly relevant to ${buyer}.`,
      sentence(ini.fit_reason)
    ].filter(Boolean)
  });

  sections.push({ heading: 'Infosys will prioritise engagement with', bullets: cohorts(ini) });

  sections.push({
    heading: 'Mobilisation',
    paragraphs: [
      `During mobilisation, Infosys will work with ${partner ? `${partner} and ` : ''}local partners to identify participants, agree baselines and confirm the measures we report against. Activities will be shaped around participants’ needs and barriers, so that content is relevant, accessible and inclusive.`
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

  const shown = Math.min(years, 5);
  const head = ['Activity', ...Array.from({ length: shown }, (_, i) => (i === shown - 1 && years > shown ? `Years ${shown}–${years}` : `Year ${i + 1}`))];
  const perYear = (total: number, i: number) => {
    const span = i === shown - 1 ? years - shown + 1 : 1;
    return fmt((total / years) * span);
  };
  sections.push({
    heading: 'Delivery plan',
    table: {
      head,
      rows: [
        ['Identify cohorts and engage delivery partners', ...head.slice(1).map((_, i) => (i === 0 ? 'Q1' : 'Review and refine'))],
        ...counted.map((l) => {
          const plain = plainMeasure(l.code, l.name, l.unit);
          return [`${plain.name} (${plain.unit})`, ...head.slice(1).map((_, i) => perYear(unitsOf(l), i))];
        }),
        ['Progress report to ' + buyer, ...head.slice(1).map(() => '✓')]
      ]
    }
  });

  if (ini.done_before?.length) {
    const contracts = [...new Set(ini.done_before.map((d) => d.contract))].join(' and ');
    sections.push({
      heading: 'Track record',
      paragraphs: [`Infosys has already committed similar work on the ${contracts}:`],
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
