import React, { useEffect, useState } from 'react';
import { Copy, FileText, LoaderCircle, MessageSquare, Sliders } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { formatGbp } from '../utils/formatters';
import {
  fetchGeneratorOptions,
  parseTenderPrompt,
  runGenerator,
  type GeneratedInitiative,
  type GeneratorForm,
  type GeneratorOptions,
  type GeneratorResult
} from '../api/generator';

const INITIAL_FORM: GeneratorForm = {
  company: 'Infosys',
  bid_amount_gbp: 10_000_000,
  sv_percent: 10,
  region: '',
  duration_years: 3,
  themes: []
};

const FIELD_LABELS: Partial<Record<keyof GeneratorForm, string>> = {
  bid_amount_gbp: 'contract value',
  sv_percent: 'Social Value %',
  duration_years: 'duration',
  region: 'region',
  themes: 'themes',
  client: 'client'
};

/** Backend generator. Scope §6: form → AI proposes initiatives and units → code values them. Cost stays blank. */
export const BackendGenerator: React.FC = () => {
  const toast = useToast();
  const [options, setOptions] = useState<GeneratorOptions | null>(null);
  const [form, setForm] = useState<GeneratorForm>(INITIAL_FORM);
  const [result, setResult] = useState<GeneratorResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'prompt' | 'form'>('prompt');
  const [promptText, setPromptText] = useState('');
  const [missing, setMissing] = useState<(keyof GeneratorForm)[]>([]);
  const [isReading, setIsReading] = useState(false);

  useEffect(() => {
    fetchGeneratorOptions()
      .then((o) => {
        setOptions(o);
        setForm((f) => ({ ...f, region: f.region || o.default_region, themes: f.themes.length ? f.themes : o.themes }));
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const set = <K extends keyof GeneratorForm>(key: K, value: GeneratorForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setMissing((m) => m.filter((k) => k !== key));
  };

  const toggleTheme = (theme: string) =>
    set('themes', form.themes.includes(theme) ? form.themes.filter((t) => t !== theme) : [...form.themes, theme]);

  /** Prompt mode: read the description into the form, then let the user confirm it. */
  const handleReadPrompt = async () => {
    setIsReading(true);
    setError(null);
    try {
      const parsed = await parseTenderPrompt(promptText);
      setForm((f) => ({ ...f, ...parsed.form, brief: promptText }));
      setMissing(parsed.missing);
      setMode('form');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsReading(false);
    }
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setResult(await runGenerator(form));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>

      <section className="card">
        <div className="card-toolbar">
          <div className="segmented" role="tablist" aria-label="Input mode">
            <button role="tab" aria-selected={mode === 'prompt'} className={mode === 'prompt' ? 'is-active' : ''} onClick={() => setMode('prompt')}>
              <MessageSquare size={14} /> Prompt
            </button>
            <button role="tab" aria-selected={mode === 'form'} className={mode === 'form' ? 'is-active' : ''} onClick={() => setMode('form')}>
              <Sliders size={14} /> Form
            </button>
          </div>
        </div>

        {mode === 'prompt' ? (
          <>
            <div className="card-body">
              <textarea
                aria-label="Tender description"
                rows={5}
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="Describe the tender: client, location, contract value, term, Social Value % and what the client cares about."
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>
            <div className="card-footer">
              <button className="btn-primary" onClick={handleReadPrompt} disabled={isReading || !promptText.trim()}>
                {isReading ? <LoaderCircle size={16} className="spin-icon" /> : <Sliders size={16} />}
                {isReading ? 'Reading…' : 'Fill form'}
              </button>
            </div>
          </>
        ) : (
          <>
        <div className="card-body">
          {missing.length > 0 && (
            <div className="notice" role="status">
              Not found in the prompt: {missing.map((k) => FIELD_LABELS[k] ?? k).join(', ')}. Check these before generating.
            </div>
          )}
          <div className="field-grid">
            <label className="field">
              <span>Client</span>
              <input value={form.client ?? ''} onChange={(e) => set('client', e.target.value)} />
            </label>
            <label className="field">
              <span>Company</span>
              <input value={form.company} onChange={(e) => set('company', e.target.value)} />
            </label>
            <label className="field">
              <span>Contract value (£)</span>
              <input type="number" min={1} step={100000} value={form.bid_amount_gbp} onChange={(e) => set('bid_amount_gbp', Number(e.target.value))} />
            </label>
            <label className="field">
              <span>Social Value (%)</span>
              <input type="number" min={1} max={100} value={form.sv_percent} onChange={(e) => set('sv_percent', Number(e.target.value))} />
            </label>
            <label className="field">
              <span>Region</span>
              <select value={form.region} onChange={(e) => set('region', e.target.value)} disabled={!options}>
                {options?.regions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Duration (years)</span>
              <input type="number" min={1} max={30} value={form.duration_years} onChange={(e) => set('duration_years', Number(e.target.value))} />
            </label>
          </div>
          <div className="chip-row" role="group" aria-label="Themes">
            {options?.themes.map((t) => (
              <button key={t} type="button" aria-pressed={form.themes.includes(t)} className={`chip${form.themes.includes(t) ? ' is-active' : ''}`} onClick={() => toggleTheme(t)}>
                {t}
              </button>
            ))}
          </div>
          {form.brief !== undefined && (
            <label className="field">
              <span>Brief</span>
              <textarea rows={3} value={form.brief} onChange={(e) => set('brief', e.target.value)} style={{ width: '100%', resize: 'vertical' }} />
            </label>
          )}
        </div>
        <div className="card-footer">
          <button className="btn-primary" onClick={handleGenerate} disabled={isLoading || !options || !form.region || form.themes.length === 0}>
            {isLoading ? <LoaderCircle size={16} className="spin-icon" /> : <FileText size={16} />}
            {isLoading ? 'Generating…' : 'Generate'}
          </button>
        </div>
          </>
        )}
      </section>

      {error && (
        <div className="notice notice-error" role="alert">
          {error}
        </div>
      )}

      {result && !isLoading && (
        <>
          <div className="stat-row">
            <Stat label="Target" value={formatGbp(result.target_gbp)} />
            <Stat label="Infosys value" value={formatGbp(result.totals.infosys_gbp)} strong />
            <Stat label="Partner value" value={formatGbp(result.totals.partner_gbp)} />
            <Stat label="Conditional" value={formatGbp(result.totals.conditional_gbp)} />
            <Stat label="Cost · Infosys to confirm" value="—" />
          </div>

          {result.checks.length > 0 && (
            <ul className="notice">
              {result.checks.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}

          {result.initiatives.map((ini, i) => (
            <InitiativeCard key={`${ini.name}-${i}`} index={i + 1} initiative={ini} onCopy={() => toast.success('Paragraph copied')} />
          ))}

          <p className="footnote">
            {result.tables.edition} · tables imported {result.tables.imported_at?.slice(0, 10)} from {result.tables.source}
          </p>
        </>
      )}
    </>
  );
};

const Stat: React.FC<{ label: string; value: string; strong?: boolean }> = ({ label, value, strong }) => (
  <div className="stat">
    <span className="stat-label">{label}</span>
    <span className={`stat-value${strong ? ' is-strong' : ''}`}>{value}</span>
  </div>
);

const InitiativeCard: React.FC<{ index: number; initiative: GeneratedInitiative; onCopy: () => void }> = ({ index, initiative: ini, onCopy }) => (
  <section className="card">
    <div className="card-toolbar">
      <h2 className="section-title">
        {index}. {ini.name}
      </h2>
      <div className="page-actions">
        {ini.attribution === 'Partner-led' && <span className="chip is-active">Partner-led{ini.partner ? ` · ${ini.partner}` : ''}</span>}
        {ini.theme && <span className="chip">{ini.theme}</span>}
        <strong className="display-num">{formatGbp(ini.value_gbp)}</strong>
      </div>
    </div>

    <div className="card-body">
      {ini.description && <p className="body-text">{ini.description}</p>}
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Measure</th>
              <th>Units</th>
              <th>Proxy</th>
              <th>Value</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {ini.lines.map((l, j) => (
              <tr key={j} title={[l.basis, l.proxy_basis].filter(Boolean).join(' · ')}>
                <td>
                  <span className="tag-mono">{l.measure}</span> {l.measure_name}
                </td>
                <td>
                  {l.units?.toLocaleString('en-GB') ?? '—'} <span className="muted">{l.unit}</span>
                </td>
                <td>{l.proxy_gbp != null ? formatGbp(l.proxy_gbp, true) : '—'}</td>
                <td>{formatGbp(l.value_gbp)}</td>
                <td>
                  <span className={`status-pill status-${l.status.replace(' ', '-').toLowerCase()}`}>{l.status}</span>
                  {l.note && <div className="muted">{l.note}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {ini.bid_paragraph && (
      <div className="card-section">
        <div className="section-row">
          <h3 className="section-title">Bid paragraph</h3>
          <button
            className="btn-link"
            onClick={() => {
              navigator.clipboard.writeText(ini.bid_paragraph);
              onCopy();
            }}
          >
            <Copy size={12} /> Copy
          </button>
        </div>
        <p className="body-text">{ini.bid_paragraph}</p>
      </div>
    )}

    <div className="card-section">
      <h3 className="section-title">Before committing</h3>
      <ul className="list-brand body-text" style={{ paddingLeft: '1.1rem' }}>
        {ini.questions.map((q) => (
          <li key={q}>{q}</li>
        ))}
      </ul>
    </div>
  </section>
);
