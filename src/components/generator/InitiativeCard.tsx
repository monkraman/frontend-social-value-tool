import React, { useEffect, useState } from 'react';
import { Check, FilePenLine, FileText, Handshake, Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { formatGbp } from '../../utils/formatters';
import { macLabel } from '../../local/frameworks';
import { bidDraft, type BidDraft } from '../../local/bidDraft';
import { plainMeasure } from '../../local/plainLanguage';
import { amountIn, commitmentOf, deliveryOf, initiativeConditional, initiativeMacs, initiativeValue, isOn, lineValue, macRating, lineEdited, lineTrimmed, unitsOf, withoutQuantities, wordingFor, type MacRating } from '../../local/engine';
import type { Initiative, UnitFactor, InitiativeLine, KnownPartner, PastInitiative, TenderForm } from '../../local/types';

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
  /** Each measure's target as the numbers that multiply into it, e.g. 12 sessions × 5 hours × 40 attendees. */
  targets: { code: string; factors: UnitFactor[] }[];
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
  onChoosePartner: (choice: string | undefined) => void;
  partners: KnownPartner[];
  onReplace: (past: PastInitiative) => void;
  onUndoReplace: () => void;
  onOpenEditor: () => void;
}

export const InitiativeCard: React.FC<CardProps> = ({
  index, initiative: ini, form, onInclude, onFactor, onToggleLine, onReset, onEdit, onChoosePartner, partners, onReplace, onUndoReplace, onOpenEditor
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<BidDraft | null>(null);
  const p = ini.pattern;
  const delivery = deliveryOf(ini);
  const commitment = commitmentOf(ini);
  const macs = initiativeMacs(ini);
  const value = initiativeValue(ini);
  const conditional = initiativeConditional(ini);
  const paragraph = wordingFor(ini, form);
  const scored = (mac: string) => form.criteria.length === 0 || form.criteria.includes(mac);
  const source =
    p.origin === 'library'
      ? 'From your pattern library'
      : p.origin === 'ai'
        ? `Proposed by the backend AI${p.ai_model ? ` (${modelName(p.ai_model)})` : ''}`
        : 'Built-in suggestion';

  return (
    <section className={`card gen-card${ini.included ? '' : ' is-excluded'}`}>
      <div className="card-toolbar">
        <label className="gen-include">
          <input
            type="checkbox"
            checked={ini.included}
            onChange={(e) => onInclude(e.target.checked)}
            aria-label={`Include ${p.name} in the package`}
            title={ini.included ? 'Untick to leave this out of the package' : 'Tick to add this back to the package'}
          />
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

      {/* Left out of the package: kept on screen, folded, so it can be ticked back in. */}
      {!ini.included ? (
        <div className="card-body gen-excluded">
          <p className="gen-meta">Not in the package. Its value is not counted in the totals. Tick the box to add it back.</p>
        </div>
      ) : editing ? (
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
          {/* The quantity comes from the counted lines, so it always matches the table below and
              follows any edit. The AI's description keeps the who, where and how, without figures. */}
          <p className="body-text">
            <span className="gen-tag">Commitment</span> {commitment || withoutQuantities(p.what)}
          </p>
          {commitment && p.what && <p className="body-text gen-about">{ini.edited ? p.what : withoutQuantities(p.what)}</p>}
          <p className="gen-meta">
            {p.who_benefits ? `For ${p.who_benefits.toLowerCase()} · ` : ''}Delivered by {delivery.by} · {ini.edited ? 'Edited by you' : source}
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

          {ini.evidence.length > 0 && (
            <div className="gen-block">
              <h3 className="gen-label">Past bid documents</h3>
              <ul className="gen-list gen-evidence">
                {ini.evidence.map((e) => (
                  <li key={`${e.file}-${e.snippet.slice(0, 24)}`}>
                    <strong>{e.name}</strong>
                    <span className="gen-meta gen-why">“{e.snippet}”</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {ini.untraced_reason && (
            <div className="notice" role="note">
              {ini.untraced_reason}
            </div>
          )}

          {ini.lines.length > 0 && (
            <div className="gen-block">
              <h3 className="gen-label">Valuation</h3>
              <div className="table-scroll">
                <table className="data-table gen-table">
                  <thead>
                    <tr>
                      <th>Measure</th>
                      <th>Target</th>
                      <th>Value per unit</th>
                      <th>Value</th>
                      <th>Included</th>
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
                  {conditional > 0 ? `${formatGbp(conditional)} is conditional and not in the total. ` : ''}Values update as targets change.
                </span>
                <button className="btn-link" onClick={onReset}>
                  <RotateCcw size={12} /> Reset targets
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {ini.included && !editing && (
        <>

          <details className="gen-more">
            <summary>
              Track record <span className="gen-summary-note">· {ini.done_before?.length ? `${ini.done_before.length} similar commitment${ini.done_before.length === 1 ? '' : 's'}` : 'new for Infosys'}</span>
            </summary>
            <div className="gen-more-body">
              {ini.done_before?.length ? (
                <p className="gen-meta">Replacing keeps the measures and targets; only the name and wording change.</p>
              ) : null}
            {ini.done_before?.length ? (
              <ul className="gen-list">
                {ini.done_before.map((d) => (
                  <li key={d.id}>
                    <strong>{d.name}</strong>
                    {d.contract ? ` on the ${d.contract}` : ''}
                    {d.volume && d.volume.trim() !== '-' ? ` · ${d.volume}` : ''} · MAC {d.mac}
                    {d.measures.length ? ` · ${d.measures.join(', ')}` : ''}
                    {d.why && <span className="gen-meta gen-why">{d.why}</span>}
                    {ini.replaced_with === d.id ? (
                      <span className="gen-replaced">
                        <Check size={12} /> In use for this initiative ·{' '}
                        <button className="btn-link" onClick={onUndoReplace}>
                          Restore the suggested initiative
                        </button>
                      </span>
                    ) : (
                      <button
                        className="btn-link gen-use-past"
                        onClick={() => onReplace(d)}
                        title="Use this past initiative's name and description. Measures and targets stay as they are."
                      >
                        <RotateCcw size={12} /> Replace with this initiative
                      </button>
                    )}
                    {d.delivery && d.delivery.length > 0 && (
                      <details className="gen-steps">
                        <summary>Delivery steps ({d.delivery.length})</summary>
                        <ol>
                          {d.delivery.map((s) => (
                            <li key={s.step}>
                              {s.step}
                              {s.due ? <span className="gen-meta"> · {s.due}</span> : null}
                              {s.cycle ? <span className="gen-meta"> · {s.cycle}</span> : null}
                            </li>
                          ))}
                        </ol>
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="body-text">No similar commitment on past contracts. This would be new for Infosys.</p>
            )}
          </div>
          </details>

          <PartnerSection initiative={ini} partners={partners} onChoose={onChoosePartner} />

          <details className="gen-more">
            <summary>Draft wording</summary>
            <div className="gen-more-body">
              <p className="body-text">{paragraph}</p>
              <button className="btn-link" onClick={onOpenEditor}>
                <FilePenLine size={12} /> Edit in RFP editor
              </button>
            </div>
          </details>

          <details className="gen-more">
            <summary>Fit with Infosys</summary>
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
              <summary>Open questions ({ini.questions.length})</summary>
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
          onOpenEditor={() => {
            setDraft(null);
            onOpenEditor();
          }}
        />
      )}
    </section>
  );
};

/** Who delivers it. A partner the AI suggested is an option only: nothing is named in the bid until chosen. */
const PartnerSection: React.FC<{ initiative: Initiative; partners: KnownPartner[]; onChoose: (c: string | undefined) => void }> = ({
  initiative: ini,
  partners,
  onChoose
}) => {
  const suggested = (ini.partner_suggested ?? '').trim();
  const chosen = ini.partner_choice;
  const [typing, setTyping] = useState(false);
  const [own, setOwn] = useState('');
  const known = partners.filter((p) => p.name && p.name.toLowerCase() !== suggested.toLowerCase());
  const before = known.filter((p) => p.worked_with_before && !p.contract_specific);
  const others = known.filter((p) => !p.worked_with_before || p.contract_specific);
  const named = (name: string) => partners.find((p) => p.name.toLowerCase() === name.toLowerCase());
  const status =
    chosen === undefined ? (suggested ? `suggested: ${suggested}` : 'not selected') : chosen.trim() ? chosen : 'Infosys alone';
  const value = chosen === undefined ? '__none' : chosen.trim() === '' ? '__alone' : chosen;
  const listed = value === '__none' || value === '__alone' || value === suggested || partners.some((p) => p.name === value);
  const useOwn = () => {
    if (!own.trim()) return;
    onChoose(own.trim());
    setTyping(false);
  };
  const select = (v: string) => {
    if (v === '__own') {
      setTyping(true);
      return;
    }
    setTyping(false);
    onChoose(v === '__none' ? undefined : v === '__alone' ? '' : v);
  };

  return (
    <details className="gen-more" open={chosen === undefined && !!suggested}>
      <summary>
        Delivery partner{' '}
        {chosen === undefined ? <span className="gen-todo">· To complete: {status}</span> : <span className="gen-summary-note">· {status}</span>}
      </summary>
      <div className="gen-more-body">
        {suggested && chosen === undefined && (
          <p className="body-text">
            <Handshake size={13} /> Suggested partner: <strong>{suggested}</strong>
            {named(suggested)?.worked_with_before
              ? '. Infosys has worked with them before.'
              : named(suggested)
                ? '. Not used on a contract before.'
                : '. Not in the capability profile.'}{' '}
            The bid names a partner only once one is selected.
          </p>
        )}
        <div className="chip-row">
          <select className="select-compact" value={typing ? '__own' : value} aria-label="Delivery partner" onChange={(e) => select(e.target.value)}>
            <option value="__none">Not selected</option>
            <option value="__alone">Infosys alone</option>
            {suggested && <option value={suggested}>{suggested} (suggested)</option>}
            {!listed && <option value={value}>{value}</option>}
            {before.length > 0 && (
              <optgroup label="Worked with before">
                {before.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            )}
            {others.length > 0 && (
              <optgroup label="Not delivered with yet">
                {others.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                    {p.contract_specific ? ' (one past contract only)' : ''}
                  </option>
                ))}
              </optgroup>
            )}
            <option value="__own">Other partner…</option>
          </select>
          {typing && (
            <>
              <input
                className="input-compact"
                autoFocus
                value={own}
                placeholder="Partner name"
                aria-label="Partner name"
                onChange={(e) => setOwn(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && useOwn()}
              />
              <button className="btn-secondary" disabled={!own.trim()} onClick={useOwn}>
                <Check size={13} /> Use
              </button>
            </>
          )}
        </div>
        {chosen && named(chosen)?.capability && <p className="gen-meta">{named(chosen)!.capability}</p>}
      </div>
    </details>
  );
};

const EditForm: React.FC<{ initiative: Initiative; wording: string; onSave: (e: InitiativeEdit) => void; onCancel: () => void }> = ({ initiative, wording, onSave, onCancel }) => {
  const [e, setE] = useState<InitiativeEdit>({
    name: initiative.pattern.name,
    what: initiative.pattern.what,
    who_benefits: initiative.pattern.who_benefits,
    delivered_by: initiative.pattern.delivered_by,
    wording,
    targets: initiative.lines.filter((l) => l.proxy_gbp != null).map((l) => ({ code: l.code, factors: l.factors.map((f) => ({ ...f })) }))
  });
  const setFactors = (code: string, change: (f: UnitFactor[]) => UnitFactor[]) =>
    setE((x) => ({ ...x, targets: x.targets.map((t) => (t.code === code ? { ...t, factors: change(t.factors) } : t)) }));
  const field = (key: 'name' | 'what' | 'who_benefits' | 'delivered_by' | 'wording') => ({ value: e[key], onChange: (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setE({ ...e, [key]: ev.target.value }) });
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
      {e.targets.length > 0 && (
        <div className="field">
          <span>Targets</span>
          {e.targets.map((t) => {
            const line = initiative.lines.find((l) => l.code === t.code)!;
            const plain = plainMeasure(line.code, line.name, line.unit);
            const total = t.factors.reduce((p, f) => p * (f.percent ? f.value / 100 : f.value), 1);
            return (
              <div key={t.code} className="gen-target-edit">
                <div className="gen-target-head">
                  <strong>{plain.name}</strong> <span className="tag-mono">{t.code}</span>
                  <span className="gen-meta"> = {fmtUnits(total)} {plain.unit}</span>
                </div>
                <div className="gen-factors">
                  {t.factors.map((f, i) => (
                    <span key={i} className="gen-factor-edit">
                      {i > 0 && <span className="gen-times">×</span>}
                      <input
                        type="number"
                        className="input-compact gen-num"
                        value={f.value}
                        min={0}
                        step="any"
                        disabled={f.fixed}
                        aria-label={`${plain.name}: ${f.label} value`}
                        onChange={(ev) => setFactors(t.code, (fs) => fs.map((x, j) => (j === i ? { ...x, value: Number(ev.target.value) || 0 } : x)))}
                      />
                      <input
                        className="input-compact gen-each"
                        value={f.label}
                        disabled={f.fixed}
                        aria-label={`${plain.name}: factor ${i + 1} name`}
                        onChange={(ev) => setFactors(t.code, (fs) => fs.map((x, j) => (j === i ? { ...x, label: ev.target.value } : x)))}
                      />
                      {t.factors.length > 1 && !f.fixed && (
                        <button type="button" className="icon-button" aria-label={`Remove ${f.label}`} onClick={() => setFactors(t.code, (fs) => fs.filter((_, j) => j !== i))}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </span>
                  ))}
                  <button
                    type="button"
                    className="btn-link"
                    onClick={() => setFactors(t.code, (fs) => [...fs, { label: 'Multiplier', value: 1, min: 0, max: 1_000_000_000, step: 1 }])}
                  >
                    <Plus size={12} /> Factor
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="gen-actions section-row">
        <span className="gen-meta">Each target is the product of its factors.</span>
        <button className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn-primary" onClick={() => onSave({ ...e, wording: e.wording.trim() === wording.trim() ? '' : e.wording })} disabled={!e.name.trim()}>
          <Check size={14} /> Save
        </button>
      </div>
    </div>
  );
};

const DraftDialog: React.FC<{ draft: BidDraft; onClose: () => void; onOpenEditor: () => void }> = ({ draft, onClose, onOpenEditor }) => {
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
          <span className="gen-meta">Follows the structure of past Infosys social value responses. Check all figures before submission.</span>
          <button className="btn-primary" onClick={onOpenEditor} title="Opens the RFP editor in its own window with this initiative added">
            <FilePenLine size={14} /> Edit in RFP editor
          </button>
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
        {/* The AI's arithmetic only describes the AI's number. Once the package is cut back or the
            figure is changed, it would explain a quantity that is no longer there. */}
        {l.basis && !lineEdited(l) && !lineTrimmed(l) && <div className="gen-meta">{l.basis}</div>}
        {l.units_proposed != null && (lineTrimmed(l) || lineEdited(l)) && (
          <div className="gen-meta">
            Originally proposed: {amountIn(l.units_proposed, plain.unit)}
            {lineTrimmed(l) && !lineEdited(l) ? ', reduced to keep the package within the target.' : '.'}
          </div>
        )}
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
          = {amountIn(unitsOf(l), plain.unit)}
        </div>
      </td>
      <td title={l.proxy_basis}>{valued ? fmtProxy(l.proxy_gbp as number) : '-'}</td>
      <td>{valued ? formatGbp(lineValue(l)) : '-'}</td>
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


const PROVIDER_NAMES: Record<string, string> = { azure: 'Azure OpenAI', gemini: 'Google Gemini', openai: 'OpenAI' };

/** "azure/gpt-4.1-mini" -> "Azure OpenAI · gpt-4.1-mini". */
function modelName(source: string): string {
  const [provider, ...rest] = source.split('/');
  const model = rest.join('/');
  const name = PROVIDER_NAMES[provider] ?? provider;
  return model ? `${name} · ${model}` : name;
}
