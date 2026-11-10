import React, { useEffect, useState } from 'react';
import { Copy, FileText, LoaderCircle } from 'lucide-react';
import { PageHeader } from './PageHeader';
import { useToast } from '../context/ToastContext';
import { formatGbp } from '../utils/formatters';
import {
  fetchGeneratorOptions,
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

/** Scope §6: form → AI proposes initiatives and units → code values them. Cost stays blank. */
export const InitiativeGenerator: React.FC = () => {
  const toast = useToast();
  const [options, setOptions] = useState<GeneratorOptions | null>(null);
  const [form, setForm] = useState<GeneratorForm>(INITIAL_FORM);
  const [result, setResult] = useState<GeneratorResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchGeneratorOptions()
      .then((o) => {
        setOptions(o);
        setForm((f) => ({ ...f, region: f.region || o.default_region, themes: f.themes.length ? f.themes : o.themes }));
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const set = <K extends keyof GeneratorForm>(key: K, value: GeneratorForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  const toggleTheme = (theme: string) =>
    set('themes', form.themes.includes(theme) ? form.themes.filter((t) => t !== theme) : [...form.themes, theme]);

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
    <div className="page">
      <PageHeader title="Initiative Generator" />

      <section className="card">
        <div className="card-body">
          <div className="field-grid">
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
        </div>
        <div className="card-footer">
          <button className="btn-primary" onClick={handleGenerate} disabled={isLoading || !options || !form.region || form.themes.length === 0}>
            {isLoading ? <LoaderCircle size={16} className="spin-icon" /> : <FileText size={16} />}
            {isLoading ? 'Generating…' : 'Generate'}
          </button>
        </div>
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
    </div>
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
