import React from 'react';
import { Copy, Plus, RotateCcw } from 'lucide-react';
import { formatGbp } from '../../utils/formatters';
import { macLabel } from '../../local/frameworks';
import { bidParagraph, initiativeConditional, initiativeMacs, initiativeValue, isOn, lineValue, macRating, unitsOf, type MacRating } from '../../local/engine';
import type { Initiative, InitiativeLine, TenderForm } from '../../local/types';

const RATING_CLASS: Record<MacRating, string> = { Strong: 'pill-strong', Partial: 'pill-partial', 'Not scored': 'pill-none' };
const FIT_CLASS = { 'Core strength': 'pill-strong', Deliverable: 'pill-partial', 'Needs a partner': 'pill-none' } as const;

const fmtUnits = (n: number) => n.toLocaleString('en-GB', { maximumFractionDigits: n < 100 ? 1 : 0 });
const fmtProxy = (n: number) => (n < 10 ? `£${n.toFixed(4)}` : formatGbp(n, true));

export const RatingPill: React.FC<{ rating: MacRating }> = ({ rating }) => (
  <span className={`status-pill ${RATING_CLASS[rating]}`} title="How well this evidences the criteria the buyer is scoring">
    MAC fit: {rating}
  </span>
);

export const FitPill: React.FC<{ fit: Initiative['fit'] }> = ({ fit }) => (
  <span className={`status-pill ${FIT_CLASS[fit]}`} title="How well this suits Infosys as an IT services company">
    Infosys: {fit}
  </span>
);

interface CardProps {
  index: number;
  initiative: Initiative;
  form: TenderForm;
  onInclude: (included: boolean) => void;
  onFactor: (code: string, factor: number, value: number) => void;
  onToggleLine: (code: string) => void;
  onReset: () => void;
  onCopied: () => void;
}

export const InitiativeCard: React.FC<CardProps> = ({ index, initiative: ini, form, onInclude, onFactor, onToggleLine, onReset, onCopied }) => {
  const p = ini.pattern;
  const macs = initiativeMacs(ini);
  const value = initiativeValue(ini);
  const conditional = initiativeConditional(ini);
  const paragraph = bidParagraph(ini, form);
  const scored = (mac: string) => form.criteria.length === 0 || form.criteria.includes(mac);

  return (
    <section className="card">
      <div className="card-toolbar">
        <label className="gen-include">
          <input type="checkbox" checked={ini.included} onChange={(e) => onInclude(e.target.checked)} aria-label={`Include ${p.name}`} />
          <h2 className="section-title">
            {index}. {p.name}
          </h2>
        </label>
        <div className="page-actions">
          <RatingPill rating={macRating(ini, form.criteria)} />
          <FitPill fit={ini.fit} />
          <strong className="display-num">{ini.untraced_reason ? 'No £ value' : formatGbp(value)}</strong>
        </div>
      </div>

      <div className="card-body">
        <p className="body-text">{p.what}</p>
        <p className="muted">
          For {p.who_benefits.toLowerCase()} · Delivered by {p.delivered_by} · {p.origin === 'library' ? `${p.id} in your pattern library` : 'Built-in suggestion, not from your library'}
        </p>

        <div className="chip-row" aria-label="Model Award Criteria">
          {macs.length === 0 && <span className="muted">No criterion under this framework.</span>}
          {macs.map((l) => (
            <span
              key={l.mac}
              className={`tag-mono${scored(l.mac) ? '' : ' is-dim'}${l.strength === 'supporting' ? ' is-supporting' : ''}`}
              title={`${l.reason} · ${l.source === 'library' ? 'from your Measure-MAC map' : 'draft mapping'}`}
            >
              {macLabel(l.mac)} · {l.strength === 'direct' ? 'direct' : 'supporting'}
            </span>
          ))}
        </div>

        <dl className="gen-facts">
          <dt>Infosys lens</dt>
          <dd>{ini.fit_reason}</dd>
          {ini.policy_topics.length > 0 && (
            <>
              <dt>Buyer's policy</dt>
              <dd>Matches what the policy asks for: {ini.policy_topics.join(', ').toLowerCase()}.</dd>
            </>
          )}
          {ini.in_infosys_policy.length > 0 && (
            <>
              <dt>Infosys policy</dt>
              <dd>Already covered by your policy ({ini.in_infosys_policy.join(', ').toLowerCase()}). Only what is new for this contract counts.</dd>
            </>
          )}
          <dt>Done before</dt>
          <dd>
            {ini.evidence.length === 0 ? (
              'Not found in your past responses or contract schedules. This would be new for Infosys.'
            ) : (
              <details>
                <summary>
                  Found in {ini.evidence.length} document{ini.evidence.length > 1 ? 's' : ''}: {ini.evidence.map((e) => e.name.replace(/\.[a-z]+$/i, '')).join('; ')}
                </summary>
                <ul className="gen-snippets">
                  {ini.evidence.map((e) => (
                    <li key={e.file}>
                      <strong>{e.name}</strong> ({e.hits} mention{e.hits > 1 ? 's' : ''}): “…{e.snippet}…”
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </dd>
        </dl>

        {ini.untraced_reason && (
          <div className="notice" role="note">
            {ini.untraced_reason}
          </div>
        )}

        {ini.lines.length > 0 && (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>TOM measure</th>
                  <th>Units</th>
                  <th>Proxy</th>
                  <th>Value</th>
                  <th>Counted</th>
                </tr>
              </thead>
              <tbody>
                {ini.lines.map((l) => (
                  <LineRow key={l.code} line={l} onFactor={(i, v) => onFactor(l.code, i, v)} onToggle={() => onToggleLine(l.code)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {ini.lines.length > 0 && (
          <div className="section-row">
            <span className="muted">
              {conditional > 0 ? `Conditional ${formatGbp(conditional)} is not in the total. ` : ''}Change any number and the value updates.
            </span>
            <button className="btn-link" onClick={onReset}>
              <RotateCcw size={12} /> Suggested units
            </button>
          </div>
        )}
      </div>

      <div className="card-section">
        <div className="section-row">
          <h3 className="section-title">Draft wording</h3>
          <button
            className="btn-link"
            onClick={() => {
              navigator.clipboard.writeText(paragraph);
              onCopied();
            }}
          >
            <Copy size={12} /> Copy
          </button>
        </div>
        <p className="body-text">{paragraph}</p>
      </div>

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
};

const LineRow: React.FC<{ line: InitiativeLine; onFactor: (index: number, value: number) => void; onToggle: () => void }> = ({ line: l, onFactor, onToggle }) => {
  const on = isOn(l);
  const valued = l.proxy_gbp != null;
  return (
    <tr className={on || !valued ? '' : 'is-off'}>
      <td>
        <span className="tag-mono">{l.code}</span> {l.name}
        {l.note && <div className="muted">{l.note}</div>}
      </td>
      <td>
        <div className="gen-factors">
          {l.factors.map((f, i) =>
            f.fixed ? null : (
              <label key={f.label} className="gen-factor">
                <input
                  type="number"
                  value={f.value}
                  min={f.min}
                  max={f.max}
                  step={f.step ?? 1}
                  disabled={!valued}
                  onChange={(e) => onFactor(i, Number(e.target.value))}
                  aria-label={`${l.code} ${f.label}`}
                />
                <span>{f.label}</span>
              </label>
            )
          )}
        </div>
        <div className="muted">
          = {fmtUnits(unitsOf(l))} {l.unit}
        </div>
      </td>
      <td title={l.proxy_basis}>
        {valued ? fmtProxy(l.proxy_gbp as number) : '—'}
        {valued && <div className="muted">{l.proxy_basis}</div>}
      </td>
      <td>{valued ? formatGbp(lineValue(l)) : '—'}</td>
      <td>
        {valued ? (
          <label className="gen-switch" title={l.exclusive_group ? 'Not additive with the other measures in this group: counting this one switches the other off.' : undefined}>
            <input type="checkbox" checked={on} onChange={onToggle} aria-label={`Count ${l.code}`} />
            <span className={`status-pill status-${l.status.replace(' ', '-').toLowerCase()}`}>{l.status}</span>
          </label>
        ) : (
          <span className="status-pill">TOM not traced</span>
        )}
      </td>
    </tr>
  );
};

/** One line for an idea that is not in the package yet. */
export const IdeaRow: React.FC<{ initiative: Initiative; form: TenderForm; onAdd: () => void }> = ({ initiative: ini, form, onAdd }) => (
  <li className="gen-idea">
    <div>
      <strong>{ini.pattern.name}</strong>
      <div className="muted">{ini.pattern.what}</div>
    </div>
    <div className="page-actions">
      <RatingPill rating={macRating(ini, form.criteria)} />
      <FitPill fit={ini.fit} />
      <span className="muted">{ini.untraced_reason ? 'No £ value' : formatGbp(initiativeValue(ini))}</span>
      <button className="btn-secondary" onClick={onAdd}>
        <Plus size={14} /> Add
      </button>
    </div>
  </li>
);
