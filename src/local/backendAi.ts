// Optional: ask the backend's AI to propose initiatives, then value and rate them locally.
// Only tender facts and labels are sent. The client name, the documents in the reference folder
// and any policy text never leave this computer.
import type { GeneratedInitiative, GeneratorForm, GeneratorResult } from '../api/generator';
import { exclusiveGroupOf, localisedProxy, questionsFor } from './engine';
import { frameworkById, macLabel } from './frameworks';
import { lensFor } from './infosysLens';
import { macsForMeasure, unscoredReason } from './measureMac';
import type { EvidenceHit, Initiative, InitiativeLine, LineStatus, LocalKnowledge, Pattern, PolicyReading, TenderForm } from './types';

const BRIEF_LIMIT = 5000;

/** The whole of what the AI is told beyond the numbers: framework, criteria, priority labels, shape names. */
export function buildBrief(form: TenderForm, policy: PolicyReading, shortlist: string[]): string {
  const framework = frameworkById(form.framework);
  const selected = framework.criteria.filter((c) => form.criteria.includes(c.code));
  const parts = [
    `Scored under the ${framework.name}.`,
    selected.length
      ? `Criteria being scored: ${selected.map((c) => `${macLabel(c.code)} (${c.title})`).join('; ')}. Propose initiatives that evidence these criteria.`
      : 'No specific criteria selected: cover the framework broadly.',
    framework.id === 'PPN026' ? 'Under this model environmental, supply-chain spend and donation commitments are not scored.' : '',
    policy.buyer.length ? `Buyer priorities: ${policy.buyer.slice(0, 8).map((t) => t.label).join(', ')}.` : '',
    shortlist.length ? `Initiative shapes that fit: ${shortlist.join('; ')}.` : '',
    'The supplier is an IT services and consulting company: prefer initiatives that use digital, data and technology skills.',
    'Go deep on a few commitments. Name a target cohort, how it is reached and a first delivery within 12 months.'
  ];
  return parts.filter(Boolean).join(' ').slice(0, BRIEF_LIMIT);
}

/** The request body. `client` is deliberately left out. */
export function backendRequest(form: TenderForm, knowledge: LocalKnowledge, policy: PolicyReading, shortlist: string[]): GeneratorForm {
  const scored = (code: string) => {
    const links = macsForMeasure(code, form.framework, knowledge.measure_mac);
    return form.criteria.length ? links.some((l) => form.criteria.includes(l.mac)) : links.length > 0;
  };
  const all = [...new Set(knowledge.measures.map((m) => m.theme).filter(Boolean))];
  const relevant = [...new Set(knowledge.measures.filter((m) => scored(m.code)).map((m) => m.theme).filter(Boolean))];
  return {
    company: 'Infosys',
    bid_amount_gbp: form.contract_value_gbp,
    sv_percent: form.sv_percent,
    region: form.region,
    duration_years: form.duration_years,
    themes: relevant.length ? relevant : all,
    brief: buildBrief(form, policy, shortlist)
  };
}

const STATUS: Record<string, LineStatus> = { Counted: 'Counted', Conditional: 'Conditional', Alternative: 'Alternative', 'Not valued': 'Not valued' };

function toLines(g: GeneratedInitiative, knowledge: LocalKnowledge, form: TenderForm): InitiativeLine[] {
  const lines = g.lines.map((l, i): InitiativeLine => {
    const m = knowledge.measures.find((x) => x.code === l.measure);
    const local = m ? localisedProxy(m, knowledge, form) : null;
    const proxy = local?.proxy ?? l.proxy_gbp;
    const factors = [{ label: 'Units', value: l.units ?? 0, min: 0, max: exclusiveGroupOf(l.measure) === 'spend' ? form.contract_value_gbp : 1_000_000_000, step: 1 }];
    return {
      code: l.measure,
      name: m?.name ?? l.measure_name ?? l.measure,
      unit: m?.unit ?? l.unit ?? '',
      theme: m?.theme ?? '',
      primary: i === 0,
      factors,
      suggested: factors.map((f) => ({ ...f })),
      proxy_gbp: proxy,
      proxy_basis: local?.basis ?? l.proxy_basis ?? '',
      status: proxy == null ? 'Not valued' : (STATUS[l.status] ?? 'Counted'),
      exclusive_group: exclusiveGroupOf(l.measure),
      macs: macsForMeasure(l.measure, form.framework, knowledge.measure_mac),
      note: [l.basis, l.note, unscoredReason(l.measure, form.framework)].filter(Boolean).join(' · '),
      evidence_required: m?.target_guidance || m?.evidence_required || ''
    };
  });
  for (const group of ['employment', 'spend']) {
    const members = lines.filter((l) => l.exclusive_group === group);
    if (members.length < 2) members.forEach((l) => (l.exclusive_group = null));
  }
  return lines;
}

/** Patterns for the AI's initiatives, so past responses can be searched for them. */
export function patternsOf(result: GeneratorResult): Pattern[] {
  return result.initiatives.map((g, i) => ({
    id: `AI-${i + 1}`,
    name: g.name,
    family: g.theme ?? '',
    theme_concepts: [],
    what: g.description ?? '',
    who_benefits: '',
    delivered_by: g.attribution === 'Partner-led' ? g.partner || 'A delivery partner' : 'Infosys',
    unit_driver: '',
    typical_scale: '',
    needs: '',
    where_fits: '',
    additionality: '',
    status: 'Active',
    measures: g.lines.map((l, j) => ({ code: l.measure, primary: j === 0, basis: l.basis })),
    origin: 'ai'
  }));
}

/** The AI's initiatives as local ones: valued from the local tables, with MAC links and the Infosys lens. */
export function fromBackend(result: GeneratorResult, knowledge: LocalKnowledge, form: TenderForm, evidence: Record<string, EvidenceHit[]>): Initiative[] {
  const cohorts = frameworkById(form.framework).cohorts;
  return patternsOf(result).map((pattern, i) => {
    const g = result.initiatives[i];
    const lens = lensFor(pattern);
    const lines = toLines(g, knowledge, form);
    const ini: Initiative = {
      id: pattern.id,
      pattern,
      included: true,
      score: 1000 - i,
      lines,
      direct_macs: [],
      fit: lens.fit,
      fit_reason: lens.reason,
      evidence: evidence[pattern.id] ?? [],
      policy_topics: [],
      in_infosys_policy: [],
      untraced_reason: lines.some((l) => l.proxy_gbp != null) ? null : 'No TOM traced. None of the Open Access measures in your library values this activity.',
      questions: [],
      wording: g.bid_paragraph || undefined
    };
    const own = questionsFor(ini, form, cohorts);
    ini.questions = [...g.questions, ...own.filter((q) => !g.questions.includes(q))];
    return ini;
  });
}
