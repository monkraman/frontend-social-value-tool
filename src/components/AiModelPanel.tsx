import React, { useEffect, useState } from 'react';
import { Cpu, LoaderCircle } from 'lucide-react';
import { getAiSettings, setAiProvider, type AiSettings, type ProviderId } from '../api/adminAi';
import { useToast } from '../context/ToastContext';

const NAMES: Record<string, string> = { azure: 'Azure OpenAI', gemini: 'Google Gemini', openai: 'OpenAI' };

/**
 * Which AI model answers first. A super-admin can change it; everyone else sees what is in use.
 * Keys are never shown or entered here: they stay in the backend's configuration.
 */
export const AiModelPanel: React.FC<{ isSuperAdmin: boolean; fallbackProvider?: string }> = ({ isSuperAdmin, fallbackProvider }) => {
  const toast = useToast();
  const [data, setData] = useState<AiSettings | null>(null);
  const [choice, setChoice] = useState<ProviderId | 'default'>('default');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin) return;
    let live = true;
    getAiSettings()
      .then((d) => {
        if (!live) return;
        setData(d);
        setChoice(d.selected);
      })
      .catch((e) => live && setError((e as Error).message));
    return () => {
      live = false;
    };
  }, [isSuperAdmin]);

  const save = async () => {
    setSaving(true);
    try {
      const d = await setAiProvider(choice);
      setData(d);
      setChoice(d.selected);
      toast.success(choice === 'default' ? 'Using the server’s default AI order' : `${NAMES[choice]} now answers first`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const label = (id: string) => data?.providers.find((p) => p.id === id)?.label ?? NAMES[id] ?? id;

  return (
    <div className="ai-panel">
      <div className="ai-panel-head">
        <Cpu size={15} />
        <strong>AI model</strong>
      </div>

      {!isSuperAdmin && (
        <p className="muted">
          In use: <strong>{NAMES[fallbackProvider ?? ''] ?? fallbackProvider ?? 'not reported'}</strong>. A super-admin can change it.
        </p>
      )}

      {isSuperAdmin && !data && !error && (
        <p className="muted">
          <LoaderCircle size={13} className="spin-icon" /> Loading…
        </p>
      )}
      {isSuperAdmin && error && <p className="muted">{error}</p>}

      {isSuperAdmin && data && (
        <>
          <p className="muted">
            Tried in order: <strong>{data.order.map(label).join(' → ') || 'none configured'}</strong>. When one is out of quota or
            down, the next answers automatically.
          </p>
          <div className="ai-panel-row">
            <select
              className="select-compact"
              value={choice}
              onChange={(e) => setChoice(e.target.value as ProviderId | 'default')}
              aria-label="AI model that answers first"
              disabled={saving}
            >
              <option value="default">Server default ({data.default_order.map((p) => NAMES[p]).join(' → ') || 'none'})</option>
              {data.providers.map((p) => (
                <option key={p.id} value={p.id} disabled={!p.configured}>
                  {p.label}
                  {p.configured ? '' : ' (not set up on the server)'}
                </option>
              ))}
            </select>
            <button className="btn-primary" onClick={save} disabled={saving || choice === data.selected}>
              {saving ? 'Saving…' : 'Use this'}
            </button>
          </div>
          <p className="muted">
            Document search uses {NAMES[data.embeddings] ?? data.embeddings} embeddings, whatever the chat model. Changes are recorded in
            the audit log. Keys are held on the server and never shown here.
          </p>
        </>
      )}
    </div>
  );
};
