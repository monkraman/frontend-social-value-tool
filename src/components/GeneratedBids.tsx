// Repository: bids written in the RFP editor. Shared with the whole team so wording that went into
// one bid can be found and reused; only the author can change or delete one.
import React, { useCallback, useEffect, useState } from 'react';
import { Download, FilePenLine, LoaderCircle, Trash2 } from 'lucide-react';
import { deleteBid, downloadBidWord, getBid, listBids, type BidSummary } from '../api/generator';
import { useToast } from '../context/ToastContext';
import { formatDate, formatGbp } from '../utils/formatters';

export const GeneratedBids: React.FC = () => {
  const toast = useToast();
  const [bids, setBids] = useState<BidSummary[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    listBids()
      .then((b) => {
        setBids(b);
        setError('');
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
    // A bid saved in the editor window shows up here when you come back to this one.
    window.addEventListener('focus', load);
    return () => window.removeEventListener('focus', load);
  }, [load]);

  const word = async (b: BidSummary) => {
    setBusy(b.id);
    try {
      const full = await getBid(b.id);
      await downloadBidWord(full.document, b.title);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const remove = async (b: BidSummary) => {
    if (!window.confirm(`Delete “${b.title}” from the Repository? This cannot be undone.`)) return;
    try {
      await deleteBid(b.id);
      toast.success('Bid deleted');
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <section className="card">
      <div className="card-toolbar">
        <h2 className="section-title">Bids generated from the tool</h2>
        <span className="muted">Written in the RFP editor and saved for the team to reuse.</span>
      </div>
      <div className="card-body">
        {error && <p className="notice">{error}</p>}
        {!bids && !error && (
          <p className="muted">
            <LoaderCircle size={14} className="spin-icon" /> Loading…
          </p>
        )}
        {bids && bids.length === 0 && <p className="muted">No bids saved yet. Use “Edit in RFP editor” on an initiative, then Save bid.</p>}
        {bids && bids.length > 0 && (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Bid</th>
                  <th>Buyer</th>
                  <th>Status</th>
                  <th>Initiatives</th>
                  <th>Social value</th>
                  <th>By</th>
                  <th>Updated</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {bids.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <strong>{b.title}</strong>
                    </td>
                    <td>{b.client || '-'}</td>
                    <td>{b.status}</td>
                    <td>{b.initiative_count}</td>
                    <td>{b.value_gbp ? formatGbp(b.value_gbp) : '-'}</td>
                    <td>{b.mine ? 'You' : b.author || '-'}</td>
                    <td>{formatDate(b.updated_at)}</td>
                    <td>
                      <div className="page-actions">
                        <button
                          className="btn-link"
                          onClick={() => window.open(`${window.location.pathname}?editor=${encodeURIComponent(b.id)}`, 'sv-rfp-editor')}
                          title={b.mine ? 'Open in the RFP editor' : 'Open a copy in the RFP editor'}
                        >
                          <FilePenLine size={13} /> Open
                        </button>
                        <button className="btn-link" onClick={() => word(b)} disabled={busy === b.id}>
                          {busy === b.id ? <LoaderCircle size={13} className="spin-icon" /> : <Download size={13} />} Word
                        </button>
                        {b.mine && (
                          <button className="icon-button" aria-label={`Delete ${b.title}`} onClick={() => remove(b)}>
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};
