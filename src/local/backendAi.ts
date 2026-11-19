// Optional: ask the backend's AI to propose initiatives, then value and rate them locally.
// Only tender facts and labels are sent. The client name, the documents in the reference folder
// and any policy text never leave this computer.
import type { GeneratedInitiative, GeneratorForm, GeneratorResult } from '../api/generator';
import { exclusiveGroupOf, initiativeConditional, initiativeValue, localisedProxy, questionsFor } from './engine';
import { lensFor } from './infosysLens';
import { doneBefore } from './trackRecord';
import { frameworkById, macLabel } from './frameworks';
import { macsForMeasure, unscoredReason } from './measureMac';
import { plainMeasure } from './plainLanguage';
import type { EvidenceHit, Initiative, InitiativeLine, LineStatus, LocalKnowledge, Pattern, PastInitiative, PolicyReading, TenderForm } from './types';

const BRIEF_LIMIT = 5000;

/** The whole of what the AI is told beyond the numbers: framework, criteria, priority labels, shape names. */
export function buildBrief(form: TenderForm, policy: PolicyReading): string {
  const framework = frameworkById(form.framework);
  const selected = framework.criteria.filter((c) => form.criteria.includes(c.code));
  const parts = [
    `Scored under the ${framework.name}.`,
    selected.length
      ? `Criteria being scored: ${selected.map((c) => `${macLabel(c.code)} (${c.title})`).join('; ')}. Propose initiatives that evidence these criteria.`
      : 'No specific criteria selected: cover the framework broadly.',
    framework.id === 'PPN026' ? 'Under this model environmental, supply-chain spend and donation commitments are not scored.' : '',
    policy.buyer.length ? `Buyer priorities: ${policy.buyer.slice(0, 8).map((t) => t.label).join(', ')}.` : '',
    'The supplier is an IT services and consulting company: prefer initiatives that use digital, data and technology skills.',
    'Go deep on a few commitments. Name a target cohort, how it is reached and a first delivery within 12 months.'
  ];
  return parts.filter(Boolean).join(' ').slice(0, BRIEF_LIMIT);
}

/** The request body. `client` is deliberately left out. */
export function backendRequest(form: TenderForm, knowledge: LocalKnowledge, policy: PolicyReading): GeneratorForm {
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
    industry: form.industry || undefined,
    framework: form.framework,
    themes: relevant.length ? relevant : all,
    brief: buildBrief(form, policy)
  };
}

const STATUS: Record<string, LineStatus> = { Counted: 'Counted', Conditional: 'Conditional', Alternative: 'Alternative', 'Not valued': 'Not valued' };

function toLines(g: GeneratedInitiative, knowledge: LocalKnowledge, form: TenderForm): InitiativeLine[] {
  const lines = g.lines.map((l, i): InitiativeLine => {
    const m = knowledge.measures.find((x) => x.code === l.measure);
    // The backend's proxy is the one source of value: the browser multiplies it by the units only.
    // The local calculation is kept only for its wording of the basis; it uses the same tables.
    const local = m ? localisedProxy(m, knowledge, form) : null;
    const proxy = l.proxy_gbp;
    // Label the quantity with what is actually being counted: the draft wording reads the label,
    // so "633 apprentice weeks" beats "633 units".
    const plain = plainMeasure(l.measure, m?.name ?? l.measure_name ?? l.measure, m?.unit ?? l.unit ?? 'units');
    const factors = [{ label: plain.unit, value: l.units ?? 0, min: 0, max: exclusiveGroupOf(l.measure) === 'spend' ? form.contract_value_gbp : 1_000_000_000, step: 1 }];
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
    // A partner the AI named has agreed to nothing, so it is not recorded as the deliverer here.
    delivered_by: 'Infosys',
    unit_driver: '',
    typical_scale: '',
    needs: '',
    where_fits: '',
    additionality: '',
    status: 'Active',
    measures: g.lines.map((l, j) => ({ code: l.measure, primary: j === 0, basis: l.basis })),
    origin: 'ai',
    ai_model: result.model
  }));
}

/** A citation the backend kept, with the details the track record holds for it. */
function citation(c: GeneratedInitiative['done_before'][number], knowledge: LocalKnowledge): PastInitiative {
  const past = knowledge.track_record.find((p) => p.id === c.id);
  return {
    id: c.id,
    name: past?.name ?? c.name ?? c.id,
    what: past?.what ?? c.what ?? '',
    volume: past?.volume ?? '',
    mac: past?.mac ?? String(c.mac ?? '').replace(/^MAC\s*/i, ''),
    pillar: past?.pillar ?? '',
    delivered_by: past?.delivered_by ?? '',
    measures: c.measures.length ? c.measures : (past?.measures ?? []),
    contract: past?.contract ?? '',
    why: c.why || undefined,
    delivery: knowledge.delivery?.[c.id]
  };
}

const backendEvidence = (g: GeneratedInitiative): EvidenceHit[] =>
  (g.evidence ?? []).map((e) => ({ file: e.document_id, name: e.filename, kind: e.kind, hits: 1, snippet: e.snippet, similarity: e.similarity }));

/** The AI's initiatives as the screen shows them: values, criteria, citations and fit exactly as the backend checked them. */
export function fromBackend(result: GeneratorResult, knowledge: LocalKnowledge, form: TenderForm, localEvidence: Record<string, EvidenceHit[]> = {}): Initiative[] {
  const cohorts = frameworkById(form.framework).cohorts;
  return patternsOf(result).map((pattern, i) => {
    const g = result.initiatives[i];
    const lines = toLines(g, knowledge, form);
    const lens = lensFor(pattern);
    const fromRepository = backendEvidence(g);
    const cited = (g.done_before ?? []).map((c) => citation(c, knowledge));
    const ini: Initiative = {
      id: pattern.id,
      pattern,
      included: true,
      score: 1000 - i,
      lines,
      direct_macs: [],
      // The curated rating when the AI tagged a known type; otherwise the same rule-based rating as before.
      fit: g.type?.fit ?? lens.fit,
      fit_reason: g.type?.reason ?? lens.reason,
      // The repository's passages when there are any; the local reference folder is a dev-only extra.
      evidence: fromRepository.length ? fromRepository : (localEvidence[pattern.id] ?? []),
      done_before: [],
      policy_topics: [],
      in_infosys_policy: [],
      untraced_reason: lines.some((l) => l.proxy_gbp != null)
        ? null
        : g.no_tom_reason || 'No TOM traced. None of the Open Access measures in your library values this activity.',
      questions: [],
      wording: g.bid_paragraph || undefined,
      partner_suggested: g.attribution === 'Partner-led' ? (g.partner || '').trim() || undefined : undefined
    };
    // Citations the backend checked come first; with none, the same word-matching as before fills in.
    ini.done_before = cited.length
      ? cited
      : doneBefore(ini, knowledge.track_record).map((past) => ({ ...past, delivery: knowledge.delivery?.[past.id] }));
    const own = questionsFor(ini, form, cohorts);
    ini.questions = [...g.questions, ...own.filter((q) => !g.questions.includes(q))];
    return ini;
  });
}

/** D5: the screen must show the backend's values. Any difference means the two calculations have drifted. */
export function valueChecks(result: GeneratorResult, initiatives: Initiative[]): string[] {
  return result.initiatives.flatMap((g, i) => {
    const ini = initiatives[i];
    if (!ini) return [];
    const drift = Math.abs(initiativeValue(ini) - g.value_gbp) + Math.abs(initiativeConditional(ini) - g.conditional_gbp);
    return drift > 1 ? [`${g.name}: the value on screen differs from the backend's by ${Math.round(drift)} GBP. Report this before using the figures.`] : [];
  });
}

/** Words to look for in the local reference folder (dev only), from the curated type the AI tagged. */
export const searchTerms = (result: GeneratorResult): { id: string; terms: string[] }[] =>
  patternsOf(result).map((p, i) => ({ id: p.id, terms: result.initiatives[i].type?.terms ?? p.name.split(/\s+/).filter((w) => w.length > 4).slice(0, 4) }));
