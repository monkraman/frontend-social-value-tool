import { undashText } from '../../utils/undash';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FilePenLine, LoaderCircle, MessageSquare, RotateCcw, Sliders, Sparkles, Upload, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { createRun, getRun, runGenerator, updateRun, type RunInput } from '../../api/generator';
import { backendRequest, fromBackend, searchTerms, valueChecks } from '../../local/backendAi';
import { formatGbp } from '../../utils/formatters';
import { FRAMEWORKS, frameworkById, macLabel } from '../../local/frameworks';
import { readPolicy } from '../../local/policy';
import { extractFileText, fetchDocumentText, fetchEvidence, fetchKnowledge, type KnowledgeState } from '../../local/repository';
import { DEFAULT_INDUSTRY, checksOf, resetUnits, setFactor, toggleLine, totalsOf, unitsChanged } from '../../local/engine';
import type { FrameworkId, Initiative, KnownPartner, LocalDocument, PolicyReading, PolicyTopic, TenderForm } from '../../local/types';
import { PROMPT_EXAMPLES, readPrompt, type PromptReading } from '../../local/promptParse';
import { InitiativeCard, type InitiativeEdit } from './InitiativeCard';
import { blockFromInitiative, openEditor, type EditorCandidates } from '../../local/rfpDoc';
import type { CostItem, LocalKnowledge, PastInitiative } from '../../local/types';

const INITIAL_FORM: TenderForm = {
  client: '',
  contract_value_gbp: 10_000_000,
  sv_percent: 10,
  duration_years: 3,
  region: '',
  industry: DEFAULT_INDUSTRY,
  framework: 'PPN0620',
  criteria: []
};

interface PolicyDoc {
  name: string;
  text: string;
}

interface PolicyInput {
  pasted: string;
  docs: PolicyDoc[];
}

const EMPTY_POLICY: PolicyInput = { pasted: '', docs: [] };
const policyText = (p: PolicyInput) => [p.pasted, ...p.docs.map((d) => d.text)].join('\n\n');

const applyEdit = (ini: Initiative, e: InitiativeEdit): Initiative => ({
  ...ini,
  edited: true,
  // Wording left as generated keeps following the targets; only wording the user rewrote is frozen.
  ...(e.wording.trim() ? { wording: e.wording.trim(), wording_edited: true } : { wording_edited: ini.wording_edited ?? false }),
  pattern: { ...ini.pattern, name: e.name.trim(), what: e.what.trim(), who_benefits: e.who_benefits.trim(), delivered_by: e.delivered_by.trim() || 'Infosys' },
  lines: ini.lines.map((l) => {
    const t = e.targets.find((x) => x.code === l.code);
    if (!t || !t.factors.length) return l;
    // A changed set of factors (one added or removed) keeps the suggestion's shape for "Reset targets"
    // only where it still lines up; otherwise the suggestion becomes the AI's single total.
    const sameShape = t.factors.length === l.suggested.length;
    const total = l.suggested.reduce((p, f) => p * (f.percent ? f.value / 100 : f.value), 1);
    return {
      ...l,
      factors: t.factors.map((f) => ({ ...f, label: f.label.trim() || 'Multiplier' })),
      suggested: sameShape ? l.suggested : [{ label: t.factors[0].label, value: total, min: 0, max: 1_000_000_000, step: 1 }]
    };
  })
});

/** Swap the AI's initiative for one Infosys has delivered before. Only the words change: the
 * measures and targets stay as they were, so the value and the package total do not move. */
const replaceWithPast = (ini: Initiative, past: PastInitiative): Initiative => ({
  ...ini,
  replaced_from: ini.replaced_from ?? { name: ini.pattern.name, what: ini.pattern.what, wording: ini.wording, wording_edited: ini.wording_edited },
  replaced_with: past.id,
  edited: true,
  wording_edited: false,
  wording: undefined,
  pattern: { ...ini.pattern, name: past.name, what: past.what || ini.pattern.what }
});

const undoReplace = (ini: Initiative): Initiative =>
  ini.replaced_from
    ? {
        ...ini,
        pattern: { ...ini.pattern, name: ini.replaced_from.name, what: ini.replaced_from.what },
        wording: ini.replaced_from.wording,
        wording_edited: ini.replaced_from.wording_edited,
        replaced_from: undefined,
        replaced_with: undefined
      }
    : ini;

/** Ask to open a saved run (id) or start a blank tender (null). `nonce` makes a repeat request count. */
export interface OpenRunRequest {
  id: string | null;
  nonce: number;
}

/** What a saved run holds: the tender as it was generated and the initiatives as the user left them. */
interface SavedState {
  version: 1;
  prompt: string;
  form: TenderForm;
  reading: PolicyReading;
  aiChecks: string[];
  initiatives: Initiative[];
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const AUTOSAVE_DELAY_MS = 1200;

/** The history entry for a result: its label and headline numbers, plus everything needed to reopen it. */
function runInput(state: SavedState): RunInput {
  const totals = totalsOf(state.initiatives, state.form);
  const f = state.form;
  const fallback = `${f.region || 'Tender'} · £${(f.contract_value_gbp / 1_000_000).toLocaleString('en-GB', { maximumFractionDigits: 1 })}m`;
  return {
    title: f.client.trim() || fallback,
    client: f.client.trim() || null,
    region: f.region || null,
    framework: f.framework,
    contract_value_gbp: f.contract_value_gbp,
    target_gbp: totals.target,
    value_gbp: totals.counted,
    initiative_count: totals.included,
    state: state as unknown as Record<string, unknown>
  };
}

interface LocalGeneratorProps {
  /** Set by the sidebar's history and the New bid button. */
  openRun?: OpenRunRequest;
  /** Called after a run is saved or changed, so the history list can refresh. */
  onRunsChanged?: () => void;
  /** The saved run now on screen, or null for an unsaved one. */
  onActiveRunChange?: (id: string | null) => void;
}

/** The Initiative Generator. Each result is saved to the signed-in user's own history and can be reopened. */
export const LocalGenerator: React.FC<LocalGeneratorProps> = ({ openRun, onRunsChanged, onActiveRunChange }) => {
  const toast = useToast();
  const [knowledge, setKnowledge] = useState<KnowledgeState | null>(null);
  const [mode, setMode] = useState<'prompt' | 'form'>('prompt');
  const [prompt, setPrompt] = useState('');
  const [promptRead, setPromptRead] = useState<PromptReading | null>(null);
  /** Criteria the user clicked on or off; everything else follows the prompt. */
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState<TenderForm>(INITIAL_FORM);
  const [buyer, setBuyer] = useState<PolicyInput>(EMPTY_POLICY);
  const [infosys, setInfosys] = useState<PolicyInput>(EMPTY_POLICY);
  const [initiatives, setInitiatives] = useState<Initiative[] | null>(null);
  const [reading, setReading] = useState<PolicyReading>({ buyer: [], infosys: [] });
  const [resultForm, setResultForm] = useState<TenderForm>(INITIAL_FORM);
  const [isAsking, setIsAsking] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiChecks, setAiChecks] = useState<string[]>([]);
  /** The prompt as it was when the result on screen was generated. */
  const [resultPrompt, setResultPrompt] = useState('');
  const [runId, setRunId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [openingRun, setOpeningRun] = useState(false);
  /** JSON of the last state written to history, so unchanged screens are not saved again. */
  const lastSaved = useRef('');
  /** The autosave waiting on its timer, if any. */
  const pendingSave = useRef<(() => void) | null>(null);

  const apply = (k: KnowledgeState) => {
    setKnowledge(k);
    if (k.connected) {
      setForm((f) => ({
        ...f,
        region: f.region || k.regions[0]?.region || '',
        industry: k.industries.some((i) => i.industry === f.industry) ? f.industry : k.industries[0]?.industry || ''
      }));
    }
  };
  useEffect(() => {
    // In dev, always re-read the folder so workbook edits show up without restarting the server.
    fetchKnowledge(import.meta.env.DEV).then(apply);
  }, []);

  const framework = frameworkById(form.framework);
  const set = <K extends keyof TenderForm>(key: K, value: TenderForm[K]) => setForm((f) => ({ ...f, [key]: value }));
  const auto = useMemo(() => (prompt.trim() ? (promptRead?.criteria ?? []) : []), [prompt, promptRead]);
  const criteria = framework.criteria.map((c) => c.code).filter((c) => overrides[c] ?? auto.includes(c));
  const tender: TenderForm = { ...form, criteria };
  const toggleCriterion = (code: string) => setOverrides((o) => ({ ...o, [code]: !(o[code] ?? auto.includes(code)) }));
  const chooseFramework = (id: FrameworkId) => {
    setForm((x) => ({ ...x, framework: id }));
    setOverrides({});
    if (prompt.trim() && knowledge?.connected) setPromptRead(readPrompt(prompt, knowledge.regions.map((r) => r.region), id));
  };

  const onPrompt = (text: string) => {
    setPrompt(text);
    if (!knowledge?.connected) return;
    const read = readPrompt(text, knowledge.regions.map((r) => r.region), form.framework);
    setPromptRead(read);
    if (read.facts.framework && read.facts.framework !== form.framework) setOverrides({});
    setForm((f) => ({ ...f, ...read.facts }));
  };

  /** Ask the AI for initiatives, then value and rate them from the tables. */
  const handleAskAi = async () => {
    if (!knowledge?.connected) return;
    setIsAsking(true);
    setAiError(null);
    try {
      const policy: PolicyReading = { buyer: readPolicy(policyText(buyer)), infosys: readPolicy(policyText(infosys)) };
      const result = await runGenerator(backendRequest(tender, knowledge, policy));
      // Past-response passages come with the result from the backend; the local folder is a dev-only extra.
      const localEvidence = knowledge.origin === 'local' ? await fetchEvidence(searchTerms(result)) : {};
      const built = fromBackend(result, knowledge, tender, localEvidence);
      const checksFromBackend = [...result.checks, ...valueChecks(result, built)];
      setReading(policy);
      setResultForm(tender);
      setResultPrompt(prompt);
      setAiChecks(checksFromBackend);
      setInitiatives(built);
      setRunId(null);
      onActiveRunChange?.(null);
      await saveNewRun({ version: 1, prompt, form: tender, reading: policy, aiChecks: checksFromBackend, initiatives: built });
    } catch (e) {
      setAiError((e as Error).message);
    } finally {
      setIsAsking(false);
    }
  };

  /** A fresh result goes into history straight away. A failed save never loses the result on screen. */
  const saveNewRun = async (state: SavedState) => {
    setSaveStatus('saving');
    try {
      const saved = await createRun(runInput(state));
      lastSaved.current = JSON.stringify(state);
      setRunId(saved.id);
      setSaveStatus('saved');
      onActiveRunChange?.(saved.id);
      onRunsChanged?.();
    } catch (e) {
      setSaveStatus('error');
      toast.error(`Not saved to history: ${(e as Error).message}`);
    }
  };

  // Edits to a saved result (units, lines, wording, partners) are written back shortly after they stop.
  useEffect(() => {
    pendingSave.current = null;
    if (!runId || !initiatives) return;
    const state: SavedState = { version: 1, prompt: resultPrompt, form: resultForm, reading, aiChecks, initiatives };
    const json = JSON.stringify(state);
    if (json === lastSaved.current) return;
    const save = async () => {
      pendingSave.current = null;
      setSaveStatus('saving');
      try {
        await updateRun(runId, runInput(state));
        lastSaved.current = json;
        setSaveStatus('saved');
        onRunsChanged?.();
      } catch {
        setSaveStatus('error');
      }
    };
    pendingSave.current = save;
    const timer = window.setTimeout(save, AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, initiatives, resultForm, resultPrompt, reading, aiChecks]);

  // Leaving the screen with an edit still waiting: save it now rather than drop it.
  useEffect(() => () => pendingSave.current?.(), []);

  /** Back to an empty tender, keeping the region and industry defaults from the tables. */
  const startBlank = () => {
    setPrompt('');
    setPromptRead(null);
    setOverrides({});
    setBuyer(EMPTY_POLICY);
    setInfosys(EMPTY_POLICY);
    setForm({
      ...INITIAL_FORM,
      region: knowledge?.connected ? knowledge.regions[0]?.region || '' : '',
      industry:
        knowledge?.connected && !knowledge.industries.some((i) => i.industry === DEFAULT_INDUSTRY)
          ? knowledge.industries[0]?.industry || ''
          : DEFAULT_INDUSTRY
    });
    setInitiatives(null);
    setReading({ buyer: [], infosys: [] });
    setResultForm(INITIAL_FORM);
    setResultPrompt('');
    setAiChecks([]);
    setAiError(null);
    setRunId(null);
    setSaveStatus('idle');
    lastSaved.current = '';
    onActiveRunChange?.(null);
  };

  /** Put a saved run back on screen exactly as it was left. */
  const restoreRun = async (id: string) => {
    if (!knowledge?.connected) return;
    setOpeningRun(true);
    setAiError(null);
    try {
      const run = await getRun(id);
      const state = run.state as unknown as SavedState;
      if (!state || state.version !== 1 || !Array.isArray(state.initiatives)) {
        throw new Error('This saved tender is in a format this version cannot open.');
      }
      const fw = frameworkById(state.form.framework);
      lastSaved.current = JSON.stringify(state);
      setPrompt(state.prompt);
      setPromptRead(state.prompt.trim() ? readPrompt(state.prompt, knowledge.regions.map((r) => r.region), state.form.framework) : null);
      setOverrides(Object.fromEntries(fw.criteria.map((c) => [c.code, state.form.criteria.includes(c.code)])));
      setForm(state.form);
      setBuyer(EMPTY_POLICY);
      setInfosys(EMPTY_POLICY);
      setResultForm(state.form);
      setResultPrompt(state.prompt);
      setReading(state.reading ?? { buyer: [], infosys: [] });
      setAiChecks(state.aiChecks ?? []);
      setInitiatives(state.initiatives);
      setRunId(run.id);
      setSaveStatus('saved');
      onActiveRunChange?.(run.id);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOpeningRun(false);
    }
  };

  // The sidebar asks for a saved run (or a blank tender) through `openRun`; act once the tables are loaded.
  const handledOpen = useRef<number | null>(null);
  useEffect(() => {
    if (!openRun || !knowledge?.connected || handledOpen.current === openRun.nonce) return;
    handledOpen.current = openRun.nonce;
    if (openRun.id) restoreRun(openRun.id);
    else startBlank();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openRun, knowledge]);

  const update = (id: string, change: (ini: Initiative) => Initiative) => setInitiatives((list) => list?.map((i) => (i.id === id ? change(i) : i)) ?? null);

  const totals = useMemo(() => (initiatives ? totalsOf(initiatives, resultForm) : null), [initiatives, resultForm]);
  const changed = useMemo(() => (initiatives ? unitsChanged(initiatives) : false), [initiatives]);
  // Partners come from the capability profile. Where that is not loaded, fall back to the ones
  // named on past contracts, so there is always something to choose from.
  const partners = useMemo<KnownPartner[]>(() => {
    if (!knowledge?.connected) return [];
    if (knowledge.partners?.length) return knowledge.partners;
    const names = new Set<string>();
    for (const t of knowledge.track_record) {
      for (const part of t.delivered_by.split(/[/,]| and /)) {
        const name = part.replace(/\(.*?\)/g, '').trim();
        if (name && !/^infosys/i.test(name)) names.add(name);
      }
    }
    return [...names].sort().map((name) => ({ name, capability: '', worked_with_before: true, contract_specific: false, note: '' }));
  }, [knowledge]);
  const checks = useMemo(
    () => (initiatives && knowledge?.connected ? checksOf(initiatives, resultForm, knowledge) : []),
    [initiatives, resultForm, knowledge]
  );

  const connected: LocalKnowledge | null = knowledge?.connected ? (knowledge as LocalKnowledge) : null;
  // Every initiative in the package, as the editor would lay it out, so it can import any of them.
  const candidates = (): EditorCandidates => ({
    tender: resultForm.client.trim() || 'Social value response',
    client: resultForm.client,
    framework: resultForm.framework,
    blocks: (initiatives ?? []).filter((x) => x.included).map((x) => blockFromInitiative(x, resultForm, connected))
  });

  if (!knowledge) {
    return (
      <p className="muted">
        <LoaderCircle size={14} className="spin-icon" /> Reading your reference folder…
      </p>
    );
  }

  if (!knowledge.connected) {
    return (
      <section className="card">
        <div className="card-body">
          <h2 className="section-title">Measures and criteria could not be loaded</h2>
          <p className="body-text">{knowledge.reason}</p>
          {import.meta.env.DEV && (
            <>
              <p className="body-text">
                To read them from a folder on this computer instead of the backend, add this line to a file named <code>.env.local</code> in the project folder, then
                restart <code>npm run dev</code>:
              </p>
              <pre className="gen-code">SV_LOCAL_REPOSITORY=C:\path\to\your reference folder</pre>
              <p className="muted">Documents in that folder stay there. They are not copied into the tool, the build or the backend.</p>
            </>
          )}
        </div>
      </section>
    );
  }

  return (
    <div className="gen-scope">
      <section className="card">
        <div className="card-toolbar">
          <h2 className="section-title">Tender</h2>
          <div className="segmented" role="tablist" aria-label="Input mode">
            <button role="tab" aria-selected={mode === 'prompt'} className={mode === 'prompt' ? 'is-active' : ''} onClick={() => setMode('prompt')}>
              <MessageSquare size={14} /> Prompt
            </button>
            <button role="tab" aria-selected={mode === 'form'} className={mode === 'form' ? 'is-active' : ''} onClick={() => setMode('form')}>
              <Sliders size={14} /> Form
            </button>
          </div>
        </div>
        <div className="card-body">
          {mode === 'prompt' ? (
            <>
              <div className="chip-row">
                {PROMPT_EXAMPLES.map((p) => (
                  <button key={p.label} type="button" className={`chip${prompt === p.text ? ' is-active' : ''}`} onClick={() => onPrompt(p.text)}>
                    {p.label}
                  </button>
                ))}
              </div>
              <textarea
                aria-label="Describe the tender"
                rows={4}
                value={prompt}
                onChange={(e) => onPrompt(e.target.value)}
                placeholder="Describe the tender in your own words: the buyer, contract value, length, region, the social value weighting and framework, and what the buyer cares about (for example local community, apprenticeships, net zero)."
                style={{ width: '100%', resize: 'vertical' }}
              />
              {promptRead && prompt.trim() && <PromptSummary read={promptRead} form={form} onEdit={() => setMode('form')} />}
            </>
          ) : (
          <div className="field-grid">
            <label className="field">
              <span>Client</span>
              <input value={form.client} onChange={(e) => set('client', e.target.value)} placeholder="e.g. Ministry of Justice" />
            </label>
            <label className="field">
              <span>Contract value (£)</span>
              <input type="number" min={1} step={100000} value={form.contract_value_gbp} onChange={(e) => set('contract_value_gbp', Number(e.target.value))} />
            </label>
            <label className="field">
              <span>Social Value target (% of contract value)</span>
              <input type="number" min={0.1} max={100} step={0.5} value={form.sv_percent} onChange={(e) => set('sv_percent', Number(e.target.value))} />
            </label>
            <label className="field">
              <span>Duration (years)</span>
              <input type="number" min={1} max={30} value={form.duration_years} onChange={(e) => set('duration_years', Number(e.target.value))} />
            </label>
            <label className="field">
              <span>Region</span>
              <select value={form.region} onChange={(e) => set('region', e.target.value)}>
                {knowledge.regions.map((r) => (
                  <option key={r.region}>{r.region}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Industry (localises supply-chain spend)</span>
              <select value={form.industry} onChange={(e) => set('industry', e.target.value)}>
                {knowledge.industries.map((i) => (
                  <option key={i.industry}>{i.industry}</option>
                ))}
              </select>
            </label>
          </div>
          )}
        </div>

        <details className="gen-more">
          <summary>
            Framework <span className="gen-summary-note">· {framework.short} · {criteria.length ? `${criteria.length} criteri${criteria.length === 1 ? 'on' : 'a'} selected` : 'all criteria'}</span>
          </summary>
          <div className="gen-more-body gen-framework">
          <div className="section-row">
            <div className="segmented" role="tablist" aria-label="Framework">
              {FRAMEWORKS.map((f) => (
                <button
                  key={f.id}
                  role="tab"
                  aria-selected={form.framework === f.id}
                  className={form.framework === f.id ? 'is-active' : ''}
                  onClick={() => chooseFramework(f.id as FrameworkId)}
                >
                  {f.short}
                </button>
              ))}
            </div>
          </div>
          <p className="muted">
            {framework.summary} {framework.applies}
          </p>
          <p className="muted">
            {auto.length > 0
              ? `${auto.length} criteria were picked from your prompt (marked with a dot). Click any criterion to add or remove it.`
              : 'Pick the criteria this tender scores. Leave all unselected to consider every criterion.'}
          </p>
          {framework.groups.map((g) => (
            <div key={g.id} className="gen-criteria">
              <span className="gen-criteria-title" title={g.parent}>
                {g.title}
              </span>
              <div className="chip-row" role="group" aria-label={g.title}>
                {framework.criteria
                  .filter((c) => c.group === g.id)
                  .map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      title={auto.includes(c.code) ? `Picked from your prompt. ${c.wording}` : c.wording}
                      aria-pressed={criteria.includes(c.code)}
                      className={`chip${criteria.includes(c.code) ? ' is-active' : ''}`}
                      onClick={() => toggleCriterion(c.code)}
                    >
                      {auto.includes(c.code) && <span className="gen-dot" aria-label="from your prompt" />}
                      {macLabel(c.code)} · {c.title}
                    </button>
                  ))}
              </div>
            </div>
          ))}
          <ul className="muted gen-notes">
            {framework.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          </div>
        </details>

        <details className="gen-more" open={buyer.docs.length + infosys.docs.length > 0 || undefined}>
          <summary>
            Policies to assess (optional)
            {buyer.docs.length + infosys.docs.length > 0 ? ` · ${buyer.docs.length + infosys.docs.length} added` : ''}
          </summary>
          <div className="gen-more-body field-grid">
            <PolicyBox
              title="Buyer's policy or tender question"
              hint="Paste the buyer's social value policy or question. Initiatives that match what it asks for rank higher."
              value={buyer}
              onChange={setBuyer}
              documents={knowledge.documents}
              origin={knowledge.origin}
              suggest={['policy', 'request']}
            />
            <PolicyBox
              title="Infosys policies"
              hint="Paste Infosys's own policies. Anything they already cover is flagged, so only what is new for the contract is claimed."
              value={infosys}
              onChange={setInfosys}
              documents={knowledge.documents}
              origin={knowledge.origin}
              suggest={['policy']}
            />
          </div>
        </details>

        <div className="card-footer gen-actions">
          <span className="muted">
            Sends the contract value, target %, duration, region and the selected criteria to the AI. The client name, your documents and any policy text are not
            sent to the AI. Each result is saved to your history, which only you can see.
          </span>
          <button className="btn-primary" onClick={handleAskAi} disabled={isAsking || !form.region || !(form.contract_value_gbp > 0)}>
            {isAsking ? <LoaderCircle size={16} className="spin-icon" /> : <Sparkles size={16} />}
            {isAsking ? 'Writing initiatives…' : 'Ask the AI'}
          </button>
        </div>
      </section>

      {aiError && (
        <div className="notice notice-error" role="alert">
          The AI could not be reached: {aiError}
        </div>
      )}

      {openingRun && (
        <p className="muted">
          <LoaderCircle size={14} className="spin-icon" /> Opening saved tender…
        </p>
      )}

      {initiatives && totals && !isAsking && !openingRun && (
        <>
          <SaveNote status={saveStatus} />
          <div className="stat-row">
            <Stat
              label="Social value target"
              value={formatGbp(totals.target)}
              note={`${resultForm.sv_percent}% of the £${(resultForm.contract_value_gbp / 1_000_000).toLocaleString('en-GB', { maximumFractionDigits: 1 })}m contract`}
            />
            <Stat
              label="Package value"
              value={formatGbp(totals.counted)}
              note={`${((totals.counted / resultForm.contract_value_gbp) * 100).toFixed(1)}% of the contract`}
              strong
            />
            <Stat
              label="Target achieved"
              value={`${totals.percent_of_target.toFixed(0)}%`}
              note={
                totals.counted >= totals.target
                  ? `${formatGbp(totals.counted - totals.target)} above target`
                  : `${formatGbp(totals.target - totals.counted)} short of target`
              }
            />
            <Stat
              label="Conditional value"
              value={formatGbp(totals.conditional)}
              note="Counts only once evidenced, e.g. carbon savings. Not in the package value."
            />
            <Stat
              label="Initiatives"
              value={`${totals.included} included`}
              note={
                totals.untraced
                  ? `${totals.included - totals.untraced} valued · ${totals.untraced} without a TOM measure`
                  : 'All valued with a TOM measure'
              }
            />
          </div>

          <div className="section-row">
            <span className="muted">
              Values are units × proxy from your tables. Volumes are sized to the {resultForm.sv_percent}% target and no further - going above it
              commits Infosys to more for no extra score. Lower them to what can actually be delivered.
            </span>
            {changed && (
              <button className="btn-secondary" onClick={() => setInitiatives((list) => list?.map(resetUnits) ?? null)}>
                <RotateCcw size={14} /> Undo my changes
              </button>
            )}
            <button className="btn-secondary" onClick={() => openEditor(candidates())} title="Write the bid response from these initiatives">
              <FilePenLine size={14} /> RFP editor
            </button>
          </div>

          {(reading.buyer.length > 0 || reading.infosys.length > 0) && (
            <section className="card">
              <div className="card-toolbar">
                <h2 className="section-title">Policy summary</h2>
                <span className="muted">Found by keyword rules, not a language model. Check against the text.</span>
              </div>
              <div className="card-body">
                {reading.buyer.length > 0 && <TopicList title="Buyer priorities" topics={reading.buyer} />}
                {reading.infosys.length > 0 && <TopicList title="Covered by Infosys policy" topics={reading.infosys} />}
              </div>
            </section>
          )}

          {checks.length + aiChecks.length > 0 && (
            <details className="notice gen-checks">
              <summary>Points to review ({checks.length + aiChecks.length})</summary>
              <ul>
                {[...checks, ...aiChecks.map(undashText)].map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </details>
          )}

          {/* Every initiative stays on screen; an unticked one is left out of the totals, not removed. */}
          {(initiatives ?? []).map((ini, i) => (
            <InitiativeCard
              key={ini.id}
              index={i + 1}
              initiative={ini}
              form={resultForm}
              onInclude={(on) => update(ini.id, (x) => ({ ...x, included: on }))}
              onFactor={(code, factor, value) => update(ini.id, (x) => setFactor(x, code, factor, value))}
              onToggleLine={(code) => update(ini.id, (x) => toggleLine(x, code))}
              onReset={() => update(ini.id, resetUnits)}
              onEdit={(e) => {
                update(ini.id, (x) => applyEdit(x, e));
                toast.success('Initiative updated');
              }}
              onChoosePartner={(choice) => update(ini.id, (x) => ({ ...x, partner_choice: choice }))}
              partners={partners}
              onCosts={(items: CostItem[] | undefined) => update(ini.id, (x) => ({ ...x, costs: items }))}
              onReplace={(past) => update(ini.id, (x) => replaceWithPast(x, past))}
              onUndoReplace={() => update(ini.id, undoReplace)}
              onOpenEditor={() => openEditor(candidates(), [blockFromInitiative(ini, resultForm, connected)])}
            />
          ))}

          <Footnote />
        </>
      )}
    </div>
  );
};

const PromptSummary: React.FC<{ read: PromptReading; form: TenderForm; onEdit: () => void }> = ({ read, form, onEdit }) => {
  const facts: [string, string][] = [
    ['client', form.client || 'not named'],
    ['contract value', formatGbp(form.contract_value_gbp)],
    ['target %', `${form.sv_percent}%`],
    ['duration', `${form.duration_years} years`],
    ['region', form.region],
    ['framework', frameworkById(form.framework).short]
  ];
  const missing = facts.filter(([k]) => !read.found.includes(k)).map(([k]) => k);
  return (
    <div className="gen-read">
      <p className="body-text">
        <strong>We read:</strong> {facts.map(([, v]) => v).join(' · ')}{' '}
        <button type="button" className="btn-link" onClick={onEdit}>
          Check in the form
        </button>
      </p>
      {missing.length > 0 && <p className="muted">Not in your prompt, so the form value is used: {missing.join(', ')}.</p>}
      {read.themes.length > 0 && <p className="muted">Themes: {read.themes.join(', ')}.</p>}
    </div>
  );
};

const SAVE_TEXT: Record<SaveStatus, string> = {
  idle: '',
  saving: 'Saving to your history…',
  saved: 'Saved to your history. Changes save automatically.',
  error: 'Not saved to history. Your next change will try again.'
};

const SaveNote: React.FC<{ status: SaveStatus }> = ({ status }) =>
  status === 'idle' ? null : (
    <p className={status === 'error' ? 'notice notice-error' : 'muted'} role="status" aria-live="polite">
      {SAVE_TEXT[status]}
    </p>
  );

const Stat: React.FC<{ label: string; value: string; note?: string; strong?: boolean }> = ({ label, value, note, strong }) => (
  <div className="stat">
    <span className="stat-label">{label}</span>
    <span className={`stat-value${strong ? ' is-strong' : ''}`}>{value}</span>
    {note && <span className="stat-note">{note}</span>}
  </div>
);

const TopicList: React.FC<{ title: string; topics: PolicyTopic[] }> = ({ title, topics }) => (
  <div>
    <h3 className="section-title">{title}</h3>
    <ul className="gen-topics">
      {topics.slice(0, 8).map((t) => (
        <li key={t.id}>
          <details>
            <summary>
              <span className="chip is-active">{t.label}</span> <span className="muted">{t.hits} mention{t.hits > 1 ? 's' : ''}</span>
            </summary>
            {t.snippets.map((s) => (
              <p key={s} className="muted">
                “{s}”
              </p>
            ))}
          </details>
        </li>
      ))}
    </ul>
  </div>
);

const Footnote: React.FC = () => (
  <p className="footnote">
    Values are units × the Open Access TOM System proxy for the region and industry. Criteria links marked “draft mapping” are the tool's own until the
    Measure-MAC map is approved. Framework wording is abbreviated: check the tender's own text.
  </p>
);

interface PolicyBoxProps {
  title: string;
  hint: string;
  value: PolicyInput;
  onChange: (next: PolicyInput) => void;
  documents: LocalDocument[];
  /** Where the listed documents live: the local reference folder (dev) or the backend repository. */
  origin?: 'local' | 'backend';
  suggest: LocalDocument['kind'][];
}

/** Paste text, add a file from this computer, or pick a document already in the reference folder. */
const PolicyBox: React.FC<PolicyBoxProps> = ({ title, hint, value, onChange, documents, origin, suggest }) => {
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const sorted = useMemo(
    () => [...documents].sort((a, b) => Number(suggest.includes(b.kind)) - Number(suggest.includes(a.kind)) || a.name.localeCompare(b.name)),
    [documents, suggest]
  );

  const add = async (read: () => Promise<PolicyDoc>) => {
    setBusy(true);
    try {
      const doc = await read();
      if (!doc.text.trim()) toast.error(`No text could be read from ${doc.name}`);
      else onChange({ ...value, docs: [...value.docs.filter((d) => d.name !== doc.name), doc] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="field">
      <span>{title}</span>
      <textarea rows={4} value={value.pasted} onChange={(e) => onChange({ ...value, pasted: e.target.value })} placeholder={hint} style={{ width: '100%', resize: 'vertical' }} />
      <div className="chip-row">
        <button type="button" className="btn-secondary" onClick={() => fileInput.current?.click()} disabled={busy}>
          {busy ? <LoaderCircle size={14} className="spin-icon" /> : <Upload size={14} />} Add file
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".pdf,.docx,.xlsx,.txt,.md"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) add(() => extractFileText(file));
            e.target.value = '';
          }}
        />
        <select
          className="select-compact"
          value=""
          disabled={busy}
          aria-label={`${title}: pick a document`}
          onChange={(e) => {
            const path = e.target.value;
            if (path) add(() => fetchDocumentText(path, origin));
          }}
        >
          <option value="">{origin === 'local' ? 'From your folder…' : 'From the repository…'}</option>
          {sorted.map((d) => (
            <option key={d.path} value={d.path}>
              {d.name}
            </option>
          ))}
        </select>
      </div>
      {value.docs.length > 0 && (
        <div className="chip-row">
          {value.docs.map((d) => (
            <span key={d.name} className="chip is-active">
              {d.name} · {Math.round(d.text.length / 1000)}k characters
              <button type="button" className="gen-chip-x" aria-label={`Remove ${d.name}`} onClick={() => onChange({ ...value, docs: value.docs.filter((x) => x.name !== d.name) })}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
