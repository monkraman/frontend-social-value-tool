// The RFP editor's document: one numbered block per initiative, laid out like Schedule 8 Annex 6
// (Supplier Solution – Social Value), with the performance indicators Schedule 3b reports against.
// The generator hands blocks to the editor through this browser's storage, so the editor can open
// in its own window and keep what was written there while the generator moves on.
import { bidDraft, type DraftSection } from './bidDraft';
import { amountIn, initiativeMacs, initiativeValue, isOn, unitsOf } from './engine';
import { macLabel } from './frameworks';
import { plainMeasure } from './plainLanguage';
import type { Initiative, LocalKnowledge, TenderForm } from './types';

export interface Kpi {
  ref: string;
  indicator: string;
  target: string;
  measure: string;
  cycle: string;
}

export interface BidBlock {
  /** Unique within the document. */
  id: string;
  /** The generator initiative it came from, so it is not imported twice. */
  initiative_id?: string;
  ref: string;
  mac: string;
  heading: string;
  sections: DraftSection[];
  kpis: Kpi[];
  value_gbp?: number;
}

export interface BidDocument {
  title: string;
  client: string;
  framework: string;
  introduction: string[];
  blocks: BidBlock[];
}

/** What the generator offers the editor: every initiative in the package, ready to add. */
export interface EditorCandidates {
  tender: string;
  client: string;
  framework: string;
  blocks: BidBlock[];
}

export const INTRODUCTION =
  'These proposals form the initial Social Value commitments as part of the contract delivery. These can be varied to deliver equivalent benefits by mutual agreement.';

export const emptyDocument = (): BidDocument => ({ title: 'Social value response', client: '', framework: '', introduction: [INTRODUCTION], blocks: [] });

/** One initiative as a Schedule 8 block: the draft bid response plus a KPI per counted line. */
export function blockFromInitiative(ini: Initiative, form: TenderForm, _knowledge?: LocalKnowledge | null): BidBlock {
  const draft = bidDraft(ini, form, form.client);
  const lead = initiativeMacs(ini).find((m) => form.criteria.length === 0 || form.criteria.includes(m.mac)) ?? initiativeMacs(ini)[0];
  const counted = ini.lines.filter((l) => isOn(l) && l.proxy_gbp != null && unitsOf(l) > 0);
  return {
    id: `${ini.id}-${Date.now().toString(36)}`,
    initiative_id: ini.id,
    ref: '',
    mac: lead ? macLabel(lead.mac) : '',
    heading: ini.pattern.name,
    sections: draft.sections.map((s) => ({ ...s })),
    kpis: counted.map((l) => {
      const plain = plainMeasure(l.code, l.name, l.unit);
      return { ref: '', indicator: plain.name, target: `${amountIn(unitsOf(l), plain.unit)} over the contract`, measure: l.code, cycle: 'Quarterly' };
    }),
    value_gbp: Math.round(initiativeValue(ini))
  };
}

/** SV1, SV2… and KPI refs follow the order of the blocks, unless the user typed their own. */
export function numbered(doc: BidDocument): BidDocument {
  return {
    ...doc,
    blocks: doc.blocks.map((b, i) => ({
      ...b,
      ref: b.ref || `SV${i + 1}`,
      kpis: b.kpis.map((k, j) => ({ ...k, ref: k.ref || `SV${i + 1}-KPI${j + 1}` }))
    }))
  };
}

// --- Hand-over between the generator and the editor window ---------------------------------

const CANDIDATES = 'sv-rfp-candidates';
const INCOMING = 'sv-rfp-incoming';
export const EDITOR_DRAFT = 'sv-rfp-editor';

const read = <T,>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};
const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: the editor still opens, just without the hand-over */
  }
};

export const readCandidates = () => read<EditorCandidates>(CANDIDATES);

/** Blocks sent from the generator that the editor has not taken yet. Reading them takes them. */
export function takeIncoming(): BidBlock[] {
  const blocks = read<BidBlock[]>(INCOMING) ?? [];
  try {
    localStorage.removeItem(INCOMING);
  } catch {
    /* ignore */
  }
  return blocks;
}

export const isEditorStorageKey = (key: string | null) => key === INCOMING || key === CANDIDATES;

/** Open the editor window, optionally adding blocks to what is already there. */
export function openEditor(candidates: EditorCandidates, add: BidBlock[] = [], bidId?: string) {
  write(CANDIDATES, candidates);
  if (add.length) write(INCOMING, [...(read<BidBlock[]>(INCOMING) ?? []), ...add]);
  const url = `${window.location.pathname}?editor=${encodeURIComponent(bidId ?? 'current')}`;
  window.open(url, 'sv-rfp-editor');
}
