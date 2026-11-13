import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, FolderOpen, LoaderCircle, MessageSquare, RefreshCw, Sliders, Sparkles, Target, Upload, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { runGenerator } from '../../api/generator';
import { backendRequest, fromBackend, patternsOf } from '../../local/backendAi';
import { formatGbp } from '../../utils/formatters';
import { FRAMEWORKS, frameworkById, macLabel } from '../../local/frameworks';
import { BUILT_IN_PATTERNS, lensFor } from '../../local/infosysLens';
import { readPolicy } from '../../local/policy';
import { extractFileText, fetchDocumentText, fetchEvidence, fetchKnowledge, type KnowledgeState } from '../../local/repository';
import { DEFAULT_INDUSTRY, buildInitiatives, checksOf, fitToTarget, resetUnits, setFactor, targetOf, toggleLine, totalsOf } from '../../local/engine';
import type { FrameworkId, Initiative, LocalDocument, LocalKnowledge, PolicyReading, PolicyTopic, TenderForm } from '../../local/types';
import { PROMPT_EXAMPLES, readPrompt, type PromptReading } from '../../local/promptParse';
import { withTrackRecord } from '../../local/trackRecord';
import { IdeaRow, InitiativeCard, type InitiativeEdit } from './InitiativeCard';

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
  wording: e.wording.trim() || undefined,
  pattern: { ...ini.pattern, name: e.name.trim(), what: e.what.trim(), who_benefits: e.who_benefits.trim(), delivered_by: e.delivered_by.trim() || 'Infosys' }
});

/** Initiatives built from the reference folder on this computer. Nothing is sent to the backend. */
export const LocalGenerator: React.FC<{ onSendToBidStudio?: (text: string) => void }> = ({ onSendToBidStudio }) => {
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiChecks, setAiChecks] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    fetchKnowledge().then(apply);
  }, []);
  const reload = () => {
    setIsRefreshing(true);
    fetchKnowledge(true)
      .then(apply)
      .finally(() => setIsRefreshing(false));
  };

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

  /** Rank the library's shapes for this tender. Runs entirely on this computer. */
  const fromLibrary = async (k: LocalKnowledge) => {
    const policy: PolicyReading = { buyer: readPolicy(policyText(buyer)), infosys: readPolicy(policyText(infosys)) };
    const patterns = [...k.patterns, ...BUILT_IN_PATTERNS];
    const evidence = await fetchEvidence(patterns.map((p) => ({ id: p.id, terms: lensFor(p).terms })));
    return { policy, list: withTrackRecord(buildInitiatives({ knowledge: k, form: tender, policy, evidence }), k.track_record) };
  };

  const handleGenerate = async () => {
    if (!knowledge?.connected) return;
    setIsGenerating(true);
    setAiError(null);
    setAiChecks([]);
    try {
      const { policy, list } = await fromLibrary(knowledge);
      setReading(policy);
      setResultForm(tender);
      setInitiatives(list);
    } finally {
      setIsGenerating(false);
    }
  };

  /** Ask the backend's AI for initiatives, then value and rate them from the local tables. */
  const handleAskAi = async () => {
    if (!knowledge?.connected) return;
    setIsAsking(true);
    setAiError(null);
    try {
      const { policy, list } = await fromLibrary(knowledge);
      const shortlist = list.filter((i) => i.included).map((i) => i.pattern.name);
      const result = await runGenerator(backendRequest(tender, knowledge, policy, shortlist));
      const evidence = await fetchEvidence(patternsOf(result).map((p) => ({ id: p.id, terms: lensFor(p).terms })));
      setReading(policy);
      setResultForm(tender);
      setAiChecks(result.checks);
      // The AI's initiatives form the package; the library's shapes stay available as further ideas.
      const ai = withTrackRecord(fromBackend(result, knowledge, tender, evidence), knowledge.track_record);
      setInitiatives([...ai, ...list.map((i) => ({ ...i, included: false }))]);
    } catch (e) {
      setAiError((e as Error).message);
    } finally {
      setIsAsking(false);
    }
  };

  const update = (id: string, change: (ini: Initiative) => Initiative) => setInitiatives((list) => list?.map((i) => (i.id === id ? change(i) : i)) ?? null);

  const totals = useMemo(() => (initiatives ? totalsOf(initiatives, resultForm) : null), [initiatives, resultForm]);
  const checks = useMemo(
    () => (initiatives && knowledge?.connected ? checksOf(initiatives, resultForm, knowledge) : []),
    [initiatives, resultForm, knowledge]
  );

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
          <h2 className="section-title">Reference folder not connected</h2>
          <p className="body-text">{knowledge.reason}</p>
          <p className="body-text">
            The local library reads your pattern library, TOM measures and past responses straight from a folder on your computer. To connect it, add this line to a file
            named <code>.env.local</code> in the project folder, then restart <code>npm run dev</code>:
          </p>
          <pre className="gen-code">SV_LOCAL_REPOSITORY=C:\path\to\your reference folder</pre>
          <p className="muted">The documents stay in that folder. They are not copied into the tool, the build or the backend.</p>
        </div>
      </section>
    );
  }

  const included = initiatives?.filter((i) => i.included) ?? [];
  const ideas = initiatives?.filter((i) => !i.included) ?? [];
  const proxyYear = knowledge.measures.find((m) => m.proxy_year)?.proxy_year;

  return (
    <div className="gen-scope">
      <div className="gen-repo" role="status">
        <FolderOpen size={15} />
        <span>
          <strong>{knowledge.folder}</strong> on this computer · {knowledge.patterns.length} patterns · {knowledge.measures.length} TOM measures
          {proxyYear ? ` (${proxyYear} proxies)` : ''} · {knowledge.track_record.length} past Infosys initiatives · {knowledge.documents.length} documents. Nothing is
          uploaded.
        </span>
        <button className="btn-link" onClick={reload} disabled={isRefreshing}>
          <RefreshCw size={12} className={isRefreshing ? 'spin-icon' : ''} /> Re-read folder
        </button>
      </div>

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

        <div className="card-section">
          <div className="section-row">
            <h3 className="section-title">Framework</h3>
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
              suggest={['policy', 'request']}
            />
            <PolicyBox
              title="Infosys policies"
              hint="Paste Infosys's own policies. Anything they already cover is flagged, so only what is new for the contract is claimed."
              value={infosys}
              onChange={setInfosys}
              documents={knowledge.documents}
              suggest={['policy']}
            />
          </div>
        </details>

        <div className="card-footer gen-actions">
          <span className="muted">
            “Ask the backend AI” sends the contract value, target %, duration, region, the selected criteria and the names of matched priorities and shapes. The
            client name, your documents and any policy text are not sent.
          </span>
          <button className="btn-secondary" onClick={handleAskAi} disabled={isAsking || isGenerating || !form.region || !(form.contract_value_gbp > 0)}>
            {isAsking ? <LoaderCircle size={16} className="spin-icon" /> : <Sparkles size={16} />}
            {isAsking ? 'Asking the AI…' : 'Ask the backend AI'}
          </button>
          <button className="btn-primary" onClick={handleGenerate} disabled={isGenerating || isAsking || !form.region || !(form.contract_value_gbp > 0)}>
            {isGenerating ? <LoaderCircle size={16} className="spin-icon" /> : <FileText size={16} />}
            {isGenerating ? 'Reading your library…' : 'Suggest initiatives'}
          </button>
        </div>
      </section>

      {aiError && (
        <div className="notice notice-error" role="alert">
          The backend AI could not be reached: {aiError} Your library suggestions still work without it.
        </div>
      )}

      {initiatives && totals && !isGenerating && !isAsking && (
        <>
          <div className="stat-row">
            <Stat label={`Target (${resultForm.sv_percent}% of contract)`} value={formatGbp(totals.target)} />
            <Stat label="Counted social value" value={formatGbp(totals.counted)} strong />
            <Stat label="Of target" value={`${totals.percent_of_target.toFixed(0)}%`} />
            <Stat label="Conditional" value={formatGbp(totals.conditional)} />
            <Stat label="Initiatives · without a TOM" value={`${totals.included} · ${totals.untraced}`} />
          </div>

          <div className="section-row">
            <span className="muted">
              Values are units × proxy from your tables. Starting units are a suggestion sized to the contract: change them to what Infosys can deliver.
            </span>
            <button className="btn-secondary" onClick={() => setInitiatives((list) => (list ? fitToTarget(list, targetOf(resultForm)) : list))}>
              <Target size={14} /> Scale units to target
            </button>
          </div>

          {(reading.buyer.length > 0 || reading.infosys.length > 0) && (
            <section className="card">
              <div className="card-toolbar">
                <h2 className="section-title">What the policies say</h2>
                <span className="muted">Found by keyword rules, not a language model. Check against the text.</span>
              </div>
              <div className="card-body">
                {reading.buyer.length > 0 && <TopicList title="The buyer asks for" topics={reading.buyer} />}
                {reading.infosys.length > 0 && <TopicList title="Infosys policy already covers" topics={reading.infosys} />}
              </div>
            </section>
          )}

          {checks.length + aiChecks.length > 0 && (
            <ul className="notice">
              {[...checks, ...aiChecks.map((c) => `Backend: ${c}`)].map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}

          {included.map((ini, i) => (
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
              onCopied={() => toast.success('Copied')}
              onSendToBidStudio={onSendToBidStudio}
            />
          ))}

          {ideas.length > 0 && (
            <section className="card">
              <div className="card-toolbar">
                <h2 className="section-title">More ideas</h2>
                <span className="muted">Ranked by criteria fit, the buyer's policy and fit for Infosys.</span>
              </div>
              <ul className="gen-ideas">
                {ideas.map((ini) => (
                  <IdeaRow key={ini.id} initiative={ini} form={resultForm} onAdd={() => update(ini.id, (x) => ({ ...x, included: true }))} />
                ))}
              </ul>
            </section>
          )}

          <Footnote knowledge={knowledge} />
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

const Stat: React.FC<{ label: string; value: string; strong?: boolean }> = ({ label, value, strong }) => (
  <div className="stat">
    <span className="stat-label">{label}</span>
    <span className={`stat-value${strong ? ' is-strong' : ''}`}>{value}</span>
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

const Footnote: React.FC<{ knowledge: LocalKnowledge }> = ({ knowledge }) => (
  <p className="footnote">
    Read from your folder: {knowledge.sources.map((s) => `${s.file.split('/').pop()} (saved ${s.modified.slice(0, 10)})`).join(' · ')}. MAC links marked “draft
    mapping” ship with the tool until the Measure-MAC map in your pattern library is complete. Framework wording is abbreviated: check the tender's own text.
  </p>
);

interface PolicyBoxProps {
  title: string;
  hint: string;
  value: PolicyInput;
  onChange: (next: PolicyInput) => void;
  documents: LocalDocument[];
  suggest: LocalDocument['kind'][];
}

/** Paste text, add a file from this computer, or pick a document already in the reference folder. */
const PolicyBox: React.FC<PolicyBoxProps> = ({ title, hint, value, onChange, documents, suggest }) => {
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
          accept=".pdf,.docx,.txt,.md"
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
          aria-label={`${title}: pick from your folder`}
          onChange={(e) => {
            const path = e.target.value;
            if (path) add(() => fetchDocumentText(path));
          }}
        >
          <option value="">From your folder…</option>
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
