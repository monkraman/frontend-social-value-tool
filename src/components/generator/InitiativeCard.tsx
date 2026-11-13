import React, { useEffect, useState } from 'react';
import { Check, Copy, FileText, Pencil, Plus, RotateCcw, Send, X } from 'lucide-react';
import { formatGbp } from '../../utils/formatters';
import { macLabel } from '../../local/frameworks';
import { bidDraft, draftText, type BidDraft } from '../../local/bidDraft';
import { plainMeasure } from '../../local/plainLanguage';
import { bidParagraph, initiativeConditional, initiativeMacs, initiativeValue, isOn, lineValue, macRating, unitsOf, type MacRating } from '../../local/engine';
import type { Initiative, InitiativeLine, TenderForm } from '../../local/types';

const RATING_CLASS: Record<MacRating, string> = { Strong: 'pill-strong', Partial: 'pill-partial', 'Not scored': 'pill-none' };
const FIT_CLASS = { 'Core strength': 'pill-strong', Deliverable: 'pill-partial', 'Needs a partner': 'pill-none' } as const;

const fmtUnits = (n: number) => n.toLocaleString('en-GB', { maximumFractionDigits: n < 100 ? 1 : 0 });
const fmtProxy = (n: number) => (n < 10 ? `£${n.toFixed(2)}` : formatGbp(n, true));

export const RatingPill: React.FC<{ rating: MacRating }> = ({ rating }) => (
  <span className={`status-pill ${RATING_CLASS[rating]}`} title="How well this answers the criteria the buyer is scoring">
    Criteria fit: {rating}
  </span>
);

export const FitPill: React.FC<{ fit: Initiative['fit'] }> = ({ fit }) => (
  <span className={`status-pill ${FIT_CLASS[fit]}`} title="How well this suits Infosys as an IT services company">
    Infosys: {fit}
  </span>
);

export interface InitiativeEdit {
  name: string;
  what: string;
  who_benefits: string;
  delivered_by: string;
  wording: string;
}

interface CardProps {
  index: number;
  initiative: Initiative;
  form: TenderForm;
  onInclude: (included: boolean) => void;
  onFactor: (code: string, factor: number, value: number) => void;
  onToggleLine: (code: string) => void;
  onReset: () => void;
  onEdit: (edit: InitiativeEdit) => void;
  onCopied: () => void;
  onSendToBidStudio?: (text: string) => void;
}

export const InitiativeCard: React.FC<CardProps> = ({ index, initiative: ini, form, onInclude, onFactor, onToggleLine, onReset, onEdit, onCopied, onSendToBidStudio }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<BidDraft | null>(null);
  const p = ini.pattern;
  const macs = initiativeMacs(ini);
  const value = initiativeValue(ini);
  const conditional = initiativeConditional(ini);
  const paragraph = ini.wording || bidParagraph(ini, form);
  const scored = (mac: string) => form.criteria.length === 0 || form.criteria.includes(mac);
  const source = p.origin === 'library' ? 'From your pattern library' : p.origin === 'ai' ? 'Proposed by the backend AI' : 'Built-in suggestion';

  return (
    <section className="card gen-card">
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
          <strong className="gen-value">{ini.untraced_reason ? 'No £ value' : formatGbp(value)}</strong>
        </div>
      </div>

      {editing ? (
        <EditForm
          initiative={ini}
          wording={paragraph}
          onCancel={() => setEditing(false)}
          onSave={(e) => {
            onEdit(e);
            setEditing(false);
          }}
        />
      ) : (
        <div className="card-body">
          <p className="body-text">{p.what}</p>
          <p className="gen-meta">
            {p.who_benefits ? `For ${p.who_benefits.toLowerCase()} · ` : ''}Delivered by {p.delivered_by} · {ini.edited ? 'Edited by you' : source}
          </p>

          <div className="chip-row" aria-label="Award criteria">
            {macs.length === 0 && <span className="gen-meta">No criterion under this framework.</span>}
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

          <div className="gen-block">
            <h3 className="gen-label">Done before</h3>
            {ini.done_before?.length ? (
              <ul className="gen-list">
                {ini.done_before.map((d) => (
                  <li key={d.id}>
                    <strong>{d.name}</strong> on the {d.contract}
                    {d.volume && d.volume !== '—' ? ` · ${d.volume}` : ''} · MAC {d.mac}
                    {d.measures.length ? ` · ${d.measures.join(', ')}` : ''}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="body-text">Infosys has not committed anything like this before. It would be new.</p>
            )}
          </div>

          {ini.untraced_reason && (
            <div className="notice" role="note">
              {ini.untraced_reason}
            </div>
          )}

          {ini.lines.length > 0 && (
            <div className="gen-block">
              <h3 className="gen-label">How it is valued</h3>
              <div className="table-scroll">
                <table className="data-table gen-table">
                  <thead>
                    <tr>
                      <th>What we count</th>
                      <th>How much</th>
                      <th>Worth per unit</th>
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
              <div className="section-row">
                <span className="gen-meta">
                  {conditional > 0 ? `${formatGbp(conditional)} is conditional and not in the total. ` : ''}Change any number and the value updates.
                </span>
                <button className="btn-link" onClick={onReset}>
                  <RotateCcw size={12} /> Suggested numbers
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!editing && (
        <>
          <details className="gen-more">
            <summary>Draft wording</summary>
            <div className="gen-more-body">
              <p className="body-text">{paragraph}</p>
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
          </details>

          <details className="gen-more">
            <summary>Why it fits</summary>
            <div className="gen-more-body body-text">
              <p>{ini.fit_reason}</p>
              {ini.policy_topics.length > 0 && <p>It matches what the buyer’s policy asks for: {ini.policy_topics.join(', ').toLowerCase()}.</p>}
              {ini.in_infosys_policy.length > 0 && (
                <p>Infosys policy already covers {ini.in_infosys_policy.join(', ').toLowerCase()}, so only what is new for this contract counts.</p>
              )}
            </div>
          </details>

          {ini.questions.length > 0 && (
            <details className="gen-more">
              <summary>Before committing ({ini.questions.length})</summary>
              <ul className="gen-more-body gen-list body-text">
                {ini.questions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </details>
          )}

          <div className="card-footer gen-actions">
            <button className="btn-secondary" onClick={() => setEditing(true)}>
              <Pencil size={14} /> Edit initiative
            </button>
            <button className="btn-primary" onClick={() => setDraft(bidDraft(ini, form, form.client))}>
              <FileText size={14} /> Draft bid response
            </button>
          </div>
        </>
      )}

      {draft && (
        <DraftDialog
          draft={draft}
          onClose={() => setDraft(null)}
          onCopied={onCopied}
          // The client name is left out of anything sent to the backend AI.
          onSend={onSendToBidStudio && (() => onSendToBidStudio(withoutClient(bidStudioPrompt(bidDraft(ini, form)), form.client)))}
        />
      )}
    </section>
  );
};

const bidStudioPrompt = (d: BidDraft) =>
  `Refine this social value commitment into final bid wording for a public sector tender. Keep the numbers, the structure and the Open Access TOM measure codes; tighten the language.\n\n${draftText(d)}`;

const withoutClient = (text: string, client: string) => (client.trim() ? text.split(client.trim()).join('the Authority') : text);

const EditForm: React.FC<{ initiative: Initiative; wording: string; onSave: (e: InitiativeEdit) => void; onCancel: () => void }> = ({ initiative, wording, onSave, onCancel }) => {
  const [e, setE] = useState<InitiativeEdit>({
    name: initiative.pattern.name,
    what: initiative.pattern.what,
    who_benefits: initiative.pattern.who_benefits,
    delivered_by: initiative.pattern.delivered_by,
    wording
  });
  const field = (key: keyof InitiativeEdit) => ({ value: e[key], onChange: (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setE({ ...e, [key]: ev.target.value }) });
  return (
    <div className="card-body">
      <div className="field-grid">
        <label className="field">
          <span>Name</span>
          <input {...field('name')} />
        </label>
        <label className="field">
          <span>Delivered by</span>
          <input {...field('delivered_by')} />
        </label>
      </div>
      <label className="field">
        <span>What it is</span>
        <textarea rows={2} {...field('what')} />
      </label>
      <label className="field">
        <span>Who it is for (separate groups with commas)</span>
        <input {...field('who_benefits')} />
      </label>
      <label className="field">
        <span>Draft wording</span>
        <textarea rows={5} {...field('wording')} />
      </label>
      <div className="gen-actions section-row">
        <span className="gen-meta">Numbers are edited in the table once you save.</span>
        <button className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn-primary" onClick={() => onSave(e)} disabled={!e.name.trim()}>
          <Check size={14} /> Save
        </button>
      </div>
    </div>
  );
};

const DraftDialog: React.FC<{ draft: BidDraft; onClose: () => void; onCopied: () => void; onSend?: () => void }> = ({ draft, onClose, onCopied, onSend }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="gen-overlay" onClick={onClose}>
      <div className="gen-dialog" role="dialog" aria-modal="true" aria-label="Draft bid response" onClick={(e) => e.stopPropagation()}>
        <div className="card-toolbar">
          <h2 className="section-title">Draft bid response</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <article className="gen-draft">
          <h3>{draft.title}</h3>
          {draft.sections.map((s) => (
            <section key={s.heading}>
              <h4>{s.heading}</h4>
              {s.paragraphs?.map((p) => <p key={p}>{p}</p>)}
              {s.bullets && (
                <ul>
                  {s.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              )}
              {s.table && (
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        {s.table.head.map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {s.table.rows.map((r) => (
                        <tr key={r[0]}>
                          {r.map((c, i) => (
                            <td key={i}>{c}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </article>
        <div className="card-footer gen-actions">
          <span className="gen-meta">Laid out like Infosys’s past social value responses. Check every number before it goes in a bid.</span>
          <button
            className="btn-secondary"
            onClick={() => {
              navigator.clipboard.writeText(draftText(draft));
              onCopied();
            }}
          >
            <Copy size={14} /> Copy
          </button>
          {onSend && (
            <button className="btn-primary" onClick={onSend} title="Opens Bid Studio with this draft. The client name is not included.">
              <Send size={14} /> Open in Bid Studio
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const LineRow: React.FC<{ line: InitiativeLine; onFactor: (index: number, value: number) => void; onToggle: () => void }> = ({ line: l, onFactor, onToggle }) => {
  const on = isOn(l);
  const valued = l.proxy_gbp != null;
  const plain = plainMeasure(l.code, l.name, l.unit);
  return (
    <tr className={on || !valued ? '' : 'is-off'}>
      <td>
        <strong>{plain.name}</strong> <span className="tag-mono" title={l.name}>{l.code}</span>
        {plain.explain && <div className="gen-meta">{plain.explain}</div>}
        {l.note && <div className="gen-meta">{l.note}</div>}
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
                  aria-label={`${plain.name}: ${f.label}`}
                />
                <span>{f.label}</span>
              </label>
            )
          )}
        </div>
        <div className="gen-meta">
          = {fmtUnits(unitsOf(l))} {plain.unit}
        </div>
      </td>
      <td title={l.proxy_basis}>{valued ? fmtProxy(l.proxy_gbp as number) : '—'}</td>
      <td>{valued ? formatGbp(lineValue(l)) : '—'}</td>
      <td>
        {valued ? (
          <label className="gen-switch" title={l.exclusive_group ? 'Only one of these can be counted: counting this one switches the other off.' : undefined}>
            <input type="checkbox" checked={on} onChange={onToggle} aria-label={`Count ${plain.name}`} />
            <span className={`status-pill status-${l.status.replace(' ', '-').toLowerCase()}`}>{l.status}</span>
          </label>
        ) : (
          <span className="status-pill">No TOM found</span>
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
      <div className="gen-meta">{ini.pattern.what}</div>
    </div>
    <div className="page-actions">
      <RatingPill rating={macRating(ini, form.criteria)} />
      <FitPill fit={ini.fit} />
      <span className="gen-meta">{ini.untraced_reason ? 'No £ value' : formatGbp(initiativeValue(ini))}</span>
      <button className="btn-secondary" onClick={onAdd}>
        <Plus size={14} /> Add
      </button>
    </div>
  </li>
);
