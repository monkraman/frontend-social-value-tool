import React from 'react';
import { useTomsSimulation } from '../hooks/useTomsSimulation';
import { formatGbp, formatPercent } from '../utils/formatters';
import { RefreshCw, X } from 'lucide-react';

export const Tuner: React.FC = () => {
  const {
    metrics,
    contractValue,
    setContractValue,
    durationYears,
    setDurationYears,
    weightingPercent,
    setWeightingPercent,
    activeInitiatives,
    result,
    isCalculating,
    updateVolume,
    addInitiative,
    removeInitiative,
    runCalculation
  } = useTomsSimulation();

  const targetAmount = (contractValue * weightingPercent) / 100;
  const currentTotal = result?.total_social_value_gbp || 0;

  return (
    <div style={{ width: '100%', maxWidth: '1440px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: '0.3rem' }}>Modelling</div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>Value Tuner</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            Adjust initiative volumes and see how the social value changes against National TOMs unit values.
          </p>
        </div>
        <button onClick={runCalculation} className="btn-secondary" disabled={isCalculating} style={{ fontSize: '0.75rem' }}>
          <RefreshCw size={13} className={isCalculating ? 'spin-icon' : ''} /> Recalculate
        </button>
      </div>

      {/* Contract Constraints */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          padding: '1.35rem 1.5rem',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderTop: '3px solid var(--color-primary)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
            Contract value (£)
          </label>
          <input
            type="number"
            value={contractValue}
            onChange={(e) => setContractValue(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
            Duration (years)
          </label>
          <input
            type="number"
            value={durationYears}
            onChange={(e) => setDurationYears(Number(e.target.value))}
            min={1}
            max={10}
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
            Target weighting (%)
          </label>
          <input
            type="number"
            value={weightingPercent}
            onChange={(e) => setWeightingPercent(Number(e.target.value))}
            min={1}
            max={30}
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
            Calculated social value
          </label>
          <div className="display-num" style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--color-primary-text)', lineHeight: 1.15 }}>
            {formatGbp(currentTotal)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Target: {formatGbp(targetAmount)} ({formatPercent(result?.social_value_percentage || 0)})
          </div>
        </div>
      </div>

      {/* Metric Initiatives */}
      <div
        style={{
          padding: '1.35rem 1.5rem',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Initiatives in this model</h3>
          {metrics.length > 0 && (
            <select
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
              onChange={(e) => {
                if (e.target.value) {
                  addInitiative(e.target.value);
                  e.target.value = '';
                }
              }}
              defaultValue=""
            >
              <option value="" disabled>+ Add a TOMs measure</option>
              {metrics.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.code} - {m.name} ({formatGbp(m.unit_value_gbp)}/{m.unit})
                </option>
              ))}
            </select>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {activeInitiatives.map((init, idx) => {
            const m = metrics.find((metric) => metric.code === init.toms_metric_code);
            const unitRate = m?.unit_value_gbp || 1;
            const subtotal = init.annual_volume * durationYears * unitRate;

            return (
              <div
                key={idx}
                className="card-accent"
                style={{
                  padding: '0.95rem 1.1rem',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="tag-mono">{init.toms_metric_code}</span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{init.name}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8125rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{formatGbp(unitRate)}/{m?.unit || 'units'}</span>
                    <strong className="display-num" style={{ fontSize: '1rem', color: 'var(--color-primary-text)' }}>{formatGbp(subtotal)}</strong>
                    <button
                      onClick={() => removeInitiative(idx)}
                      className="btn-link"
                      style={{ color: 'var(--text-muted)', padding: '0.2rem' }}
                      title="Remove from model"
                      aria-label={`Remove ${init.name}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input
                    type="range"
                    min={0}
                    max={init.toms_metric_code === 'NT31' ? 500000 : 100}
                    value={init.annual_volume}
                    onChange={(e) => updateVolume(idx, Number(e.target.value))}
                    style={{ flex: 1, accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)', minWidth: '80px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {init.annual_volume} / year
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
