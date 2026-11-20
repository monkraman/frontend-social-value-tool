// The RFP editor: the bid response for a whole package, edited section by section and saved for
// the team. It opens in its own window from the Initiative Generator ("Edit in RFP editor"), which
// hands it initiatives through this browser's storage, or from the Repository for a saved bid.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Download, FilePlus2, LoaderCircle, Plus, Save, Trash2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { downloadBidWord, getBid, saveBid } from '../../api/generator';
import { formatGbp } from '../../utils/formatters';
import type { DraftSection } from '../../local/bidDraft';
import {
  EDITOR_DRAFT,
  emptyDocument,
  isEditorStorageKey,
  numbered,
  readCandidates,
  takeIncoming,
  type BidBlock,
  type BidDocument,
  type EditorCandidates,
  type Kpi
} from '../../local/rfpDoc';

interface EditorState {
  doc: BidDocument;
  /** The saved bid this is, once saved. */
  bidId: string | null;
  status: string;
}

const STATUSES = ['Draft', 'In review', 'Submitted', 'Won', 'Lost'];

const loadDraft = (): EditorState | null => {
  try {
    const raw = localStorage.getItem(EDITOR_DRAFT);
    return raw ? (JSON.parse(raw) as EditorState) : null;
  } catch {
    return null;
  }
};

/** Add blocks, skipping initiatives that are already in the document. */
const withBlocks = (doc: BidDocument, add: BidBlock[]): BidDocument => {
  const have = new Set(doc.blocks.map((b) => b.initiative_id).filter(Boolean));
  const fresh = add.filter((b) => !b.initiative_id || !have.has(b.initiative_id));
  return fresh.length ? { ...doc, blocks: [...doc.blocks, ...fresh] } : doc;
};

export const RfpEditor: React.FC<{ openBid: string }> = ({ openBid }) => {
  const toast = useToast();
  // The toast context changes on every toast; effects below must not re-run because of it.
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const [state, setState] = useState<EditorState>(() => {
    const saved = openBid === 'current' ? loadDraft() : null;
    return saved ?? { doc: emptyDocument(), bidId: null, status: 'Draft' };
  });
  const [candidates, setCandidates] = useState<EditorCandidates | null>(() => readCandidates());
  const [loading, setLoading] = useState(openBid !== 'current' && openBid !== 'new');
  const [busy, setBusy] = useState<'save' | 'word' | null>(null);
  const [dirty, setDirty] = useState(false);
  const { doc } = state;

  const setDoc = useCallback((change: (d: BidDocument) => BidDocument) => {
    setState((s) => ({ ...s, doc: change(s.doc) }));
    setDirty(true);
  }, []);

  // Initiatives sent from the generator: on opening, and whenever another is sent while this is open.
  const takeFromGenerator = useCallback(() => {
    const incoming = takeIncoming();
    setCandidates(readCandidates());
    if (!incoming.length) return;
    setState((s) => {
      const c = readCandidates();
      const doc = withBlocks(
        { ...s.doc, client: s.doc.client || c?.client || '', framework: s.doc.framework || c?.framework || '', title: s.doc.blocks.length ? s.doc.title : c?.tender || s.doc.title },
        incoming
      );
      return { ...s, doc };
    });
    setDirty(true);
    toastRef.current.success(incoming.length === 1 ? `Added ${incoming[0].heading}` : `Added ${incoming.length} initiatives`);
  }, []);

  useEffect(() => {
    if (openBid === 'current' || openBid === 'new') takeFromGenerator();
    const onStorage = (e: StorageEvent) => isEditorStorageKey(e.key) && takeFromGenerator();
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [openBid, takeFromGenerator]);

  // A saved bid from the Repository. One that is not yours opens as a copy to save as your own.
  useEffect(() => {
    if (openBid === 'current' || openBid === 'new') return;
    getBid(openBid)
      .then((b) => {
        setState({ doc: { ...emptyDocument(), ...(b.document as unknown as BidDocument) }, bidId: b.mine ? b.id : null, status: b.status });
        if (!b.mine) toastRef.current.info(`Opened ${b.author ? `${b.author}’s` : 'a'} bid as a copy. Saving makes it yours.`);
      })
      .catch((e: Error) => toastRef.current.error(e.message))
      .finally(() => setLoading(false));
  }, [openBid]);

  // Kept in this browser as you type, so closing the window loses nothing.
  useEffect(() => {
    try {
      localStorage.setItem(EDITOR_DRAFT, JSON.stringify(state));
    } catch {
      /* storage blocked: the bid can still be saved */
    }
  }, [state]);

  useEffect(() => {
    document.title = `${doc.title || 'Bid'} · RFP editor`;
  }, [doc.title]);

  const shown = useMemo(() => numbered(doc), [doc]);
  const value = doc.blocks.reduce((t, b) => t + (b.value_gbp ?? 0), 0);
  const notIn = (candidates?.blocks ?? []).filter((b) => !doc.blocks.some((x) => x.initiative_id === b.initiative_id));

  const save = async () => {
    setBusy('save');
    try {
      const saved = await saveBid(
        {
          title: doc.title.trim() || 'Social value response',
          client: doc.client.trim() || null,
          framework: doc.framework || null,
          status: state.status,
          initiative_count: doc.blocks.length,
          value_gbp: value || null,
          cost_gbp: null,
          document: numbered(doc) as unknown as Record<string, unknown>
        },
        state.bidId ?? undefined
      );
      setState((s) => ({ ...s, bidId: saved.id }));
      setDirty(false);
      toast.success('Saved to the Repository under Bids generated from the tool');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const word = async () => {
    setBusy('word');
    try {
      await downloadBidWord(numbered(doc) as unknown as Record<string, unknown>, doc.title || 'Social value response');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const block = (id: string, change: (b: BidBlock) => BidBlock) => setDoc((d) => ({ ...d, blocks: d.blocks.map((b) => (b.id === id ? change(b) : b)) }));
  const move = (i: number, by: number) =>
    setDoc((d) => {
      const blocks = [...d.blocks];
      const [b] = blocks.splice(i, 1);
      blocks.splice(Math.max(0, Math.min(blocks.length, i + by)), 0, b);
      return { ...d, blocks };
    });

  if (loading) {
    return (
      <div className="rfp-page">
        <p className="muted">
          <LoaderCircle size={14} className="spin-icon" /> Opening the bid…
        </p>
      </div>
    );
  }

  return (
    <div className="rfp-page">
      <header className="rfp-head card">
        <div className="card-body">
          <div className="rfp-title-row">
            <input className="rfp-title" value={doc.title} aria-label="Bid title" onChange={(e) => setDoc((d) => ({ ...d, title: e.target.value }))} />
            <div className="page-actions">
              <select className="select-compact" value={state.status} aria-label="Status" onChange={(e) => (setState((s) => ({ ...s, status: e.target.value })), setDirty(true))}>
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <button className="btn-secondary" onClick={word} disabled={busy !== null || doc.blocks.length === 0}>
                {busy === 'word' ? <LoaderCircle size={14} className="spin-icon" /> : <Download size={14} />} Download Word
              </button>
              <button className="btn-primary" onClick={save} disabled={busy !== null}>
                {busy === 'save' ? <LoaderCircle size={14} className="spin-icon" /> : <Save size={14} />} {state.bidId ? (dirty ? 'Save changes' : 'Saved') : 'Save bid'}
              </button>
            </div>
          </div>
          <div className="field-grid">
            <label className="field">
              <span>Buyer</span>
              <input value={doc.client} onChange={(e) => setDoc((d) => ({ ...d, client: e.target.value }))} placeholder="The Authority" />
            </label>
            <div className="field">
              <span>Package</span>
              <p className="body-text">
                {doc.blocks.length} initiative{doc.blocks.length === 1 ? '' : 's'} · {formatGbp(value)} social value
              </p>
            </div>
          </div>
          <div className="chip-row">
            {notIn.length > 0 && (
              <button className="btn-secondary" onClick={() => setDoc((d) => withBlocks(d, notIn))}>
                <FilePlus2 size={14} /> Import all suggested initiatives ({notIn.length})
              </button>
            )}
            {notIn.length > 0 && (
              <select
                className="select-compact"
                value=""
                aria-label="Add one initiative"
                onChange={(e) => {
                  const b = notIn.find((x) => x.initiative_id === e.target.value);
                  if (b) setDoc((d) => withBlocks(d, [b]));
                }}
              >
                <option value="">Add one initiative…</option>
                {notIn.map((b) => (
                  <option key={b.initiative_id} value={b.initiative_id}>
                    {b.heading}
                  </option>
                ))}
              </select>
            )}
            {!candidates && <span className="gen-meta">Open this from the Initiative Generator to add initiatives.</span>}
            <span className="gen-meta">Laid out like Schedule 8 Annex 6, with the Schedule 3b indicators at the end. Check every number before it goes in a bid.</span>
          </div>
        </div>
      </header>

      <section className="card">
        <div className="card-toolbar">
          <h2 className="section-title">Section A – Deliverables</h2>
        </div>
        <div className="card-body">
          <TextList label="Introduction" items={doc.introduction} onChange={(introduction) => setDoc((d) => ({ ...d, introduction }))} />
        </div>
      </section>

      {shown.blocks.length === 0 && <p className="muted">No initiatives yet. Import the suggested ones, or use “Edit in RFP editor” on an initiative.</p>}

      {shown.blocks.map((b, i) => (
        <section className="card rfp-block" key={b.id}>
          <div className="card-toolbar">
            <div className="rfp-block-head">
              <span className="rfp-num">{i + 1}</span>
              <input className="input-compact rfp-ref" value={doc.blocks[i].ref} placeholder={b.ref} aria-label="Reference" onChange={(e) => block(b.id, (x) => ({ ...x, ref: e.target.value }))} />
              <input className="input-compact rfp-ref" value={b.mac} aria-label="Criterion" onChange={(e) => block(b.id, (x) => ({ ...x, mac: e.target.value }))} />
              <input className="rfp-heading" value={b.heading} aria-label="Heading" onChange={(e) => block(b.id, (x) => ({ ...x, heading: e.target.value }))} />
            </div>
            <div className="page-actions">
              <button className="icon-button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                <ArrowUp size={14} />
              </button>
              <button className="icon-button" aria-label="Move down" disabled={i === shown.blocks.length - 1} onClick={() => move(i, 1)}>
                <ArrowDown size={14} />
              </button>
              <button className="icon-button" aria-label={`Remove ${b.heading}`} onClick={() => setDoc((d) => ({ ...d, blocks: d.blocks.filter((x) => x.id !== b.id) }))}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          <div className="card-body">
            {b.sections.map((s, k) => (
              <SectionEditor
                key={k}
                number={`${i + 1}.${k + 1}`}
                section={s}
                onChange={(next) => block(b.id, (x) => ({ ...x, sections: x.sections.map((y, j) => (j === k ? next : y)) }))}
                onRemove={() => block(b.id, (x) => ({ ...x, sections: x.sections.filter((_, j) => j !== k) }))}
              />
            ))}
            <button className="btn-link" onClick={() => block(b.id, (x) => ({ ...x, sections: [...x.sections, { heading: 'New section', paragraphs: [''] }] }))}>
              <Plus size={12} /> Add a section
            </button>
            <KpiEditor kpis={b.kpis} shown={shown.blocks[i].kpis} onChange={(kpis) => block(b.id, (x) => ({ ...x, kpis }))} />
          </div>
        </section>
      ))}
    </div>
  );
};

/** Paragraphs, one text box each. */
const TextList: React.FC<{ label: string; items: string[]; onChange: (items: string[]) => void }> = ({ label, items, onChange }) => (
  <div className="rfp-texts">
    <span className="gen-label">{label}</span>
    {items.map((t, i) => (
      <div className="rfp-text-row" key={i}>
        <AutoText value={t} onChange={(v) => onChange(items.map((x, j) => (j === i ? v : x)))} />
        <button className="icon-button" aria-label="Remove paragraph" onClick={() => onChange(items.filter((_, j) => j !== i))}>
          <Trash2 size={13} />
        </button>
      </div>
    ))}
    <button className="btn-link" onClick={() => onChange([...items, ''])}>
      <Plus size={12} /> Paragraph
    </button>
  </div>
);

const AutoText: React.FC<{ value: string; onChange: (v: string) => void; label?: string }> = ({ value, onChange, label }) => (
  <textarea className="rfp-textarea" aria-label={label ?? 'Paragraph'} rows={Math.min(12, Math.max(2, Math.ceil(value.length / 110)))} value={value} onChange={(e) => onChange(e.target.value)} />
);

const SectionEditor: React.FC<{ number: string; section: DraftSection; onChange: (s: DraftSection) => void; onRemove: () => void }> = ({ number, section: s, onChange, onRemove }) => (
  <div className="rfp-section">
    <div className="rfp-section-head">
      <span className="rfp-num">{number}</span>
      <input className="rfp-section-title" value={s.heading} aria-label="Section heading" onChange={(e) => onChange({ ...s, heading: e.target.value })} />
      <button className="icon-button" aria-label={`Remove ${s.heading}`} onClick={onRemove}>
        <Trash2 size={13} />
      </button>
    </div>
    <TextList label="Paragraphs" items={s.paragraphs ?? []} onChange={(paragraphs) => onChange({ ...s, paragraphs })} />
    <label className="rfp-texts">
      <span className="gen-label">List items, one per line, shown as (a), (b)</span>
      <textarea
        className="rfp-textarea"
        rows={Math.max(2, (s.bullets ?? []).length + 1)}
        value={(s.bullets ?? []).join('\n')}
        onChange={(e) => onChange({ ...s, bullets: e.target.value ? e.target.value.split('\n') : undefined })}
      />
    </label>
    {s.table ? (
      <TableEditor table={s.table} onChange={(table) => onChange({ ...s, table })} />
    ) : (
      <button className="btn-link" onClick={() => onChange({ ...s, table: { head: ['When', 'What', 'How much'], rows: [['', '', '']] } })}>
        <Plus size={12} /> Table
      </button>
    )}
  </div>
);

const TableEditor: React.FC<{ table: NonNullable<DraftSection['table']>; onChange: (t: DraftSection['table']) => void }> = ({ table, onChange }) => {
  const cell = (r: number, c: number, v: string) => onChange({ ...table, rows: table.rows.map((row, i) => (i === r ? row.map((x, j) => (j === c ? v : x)) : row)) });
  return (
    <div className="table-scroll">
      <table className="data-table rfp-table">
        <thead>
          <tr>
            {table.head.map((h, c) => (
              <th key={c}>
                <input className="input-compact" value={h} aria-label="Column heading" onChange={(e) => onChange({ ...table, head: table.head.map((x, j) => (j === c ? e.target.value : x)) })} />
              </th>
            ))}
            <th aria-label="Remove row" />
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, r) => (
            <tr key={r}>
              {table.head.map((_, c) => (
                <td key={c}>
                  <input className="input-compact" value={row[c] ?? ''} aria-label={`${table.head[c]} row ${r + 1}`} onChange={(e) => cell(r, c, e.target.value)} />
                </td>
              ))}
              <td>
                <button className="icon-button" aria-label={`Remove row ${r + 1}`} onClick={() => onChange({ ...table, rows: table.rows.filter((_, i) => i !== r) })}>
                  <Trash2 size={13} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="chip-row">
        <button className="btn-link" onClick={() => onChange({ ...table, rows: [...table.rows, table.head.map(() => '')] })}>
          <Plus size={12} /> Row
        </button>
        <button className="btn-link" onClick={() => onChange(undefined)}>
          <Trash2 size={12} /> Remove table
        </button>
      </div>
    </div>
  );
};

const KPI_FIELDS: [keyof Kpi, string][] = [
  ['ref', 'KPI'],
  ['indicator', 'Indicator'],
  ['target', 'Target performance level'],
  ['measure', 'Measure'],
  ['cycle', 'Reporting']
];

/** The Schedule 3b indicators this block is reported against. */
const KpiEditor: React.FC<{ kpis: Kpi[]; shown: Kpi[]; onChange: (k: Kpi[]) => void }> = ({ kpis, shown, onChange }) => (
  <div className="rfp-section">
    <div className="rfp-section-head">
      <span className="gen-label">Performance indicators (Schedule 3b)</span>
    </div>
    <div className="table-scroll">
      <table className="data-table rfp-table">
        <thead>
          <tr>
            {KPI_FIELDS.map(([, label]) => (
              <th key={label}>{label}</th>
            ))}
            <th aria-label="Remove" />
          </tr>
        </thead>
        <tbody>
          {kpis.map((k, i) => (
            <tr key={i}>
              {KPI_FIELDS.map(([field, label]) => (
                <td key={field}>
                  <input
                    className="input-compact"
                    value={k[field]}
                    placeholder={field === 'ref' ? shown[i]?.ref : ''}
                    aria-label={`${label} ${i + 1}`}
                    onChange={(e) => onChange(kpis.map((x, j) => (j === i ? { ...x, [field]: e.target.value } : x)))}
                  />
                </td>
              ))}
              <td>
                <button className="icon-button" aria-label={`Remove indicator ${i + 1}`} onClick={() => onChange(kpis.filter((_, j) => j !== i))}>
                  <Trash2 size={13} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <button className="btn-link" onClick={() => onChange([...kpis, { ref: '', indicator: '', target: '', measure: '', cycle: 'Quarterly' }])}>
      <Plus size={12} /> Indicator
    </button>
  </div>
);
