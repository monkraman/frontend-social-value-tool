import React from 'react';
import { useTomsSimulation } from '../hooks/useTomsSimulation';
import { formatGbp, formatPercent } from '../utils/formatters';
import { RefreshCw } from 'lucide-react';

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
    <div style={{ maxWidth: '960px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>Interactive Bid Tuner</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Simulate initiative volume adjustments against National TOMs unit proxies.
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
          padding: '1.25rem',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)'
        }}
      >
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            Contract Value (£)
          </label>
          <input
            type="number"
            value={contractValue}
            onChange={(e) => setContractValue(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            Duration (Years)
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
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            Target Weighting (%)
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
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            Calculated Social Value
          </label>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', paddingTop: '0.2rem' }}>
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
          padding: '1.25rem',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>Active Simulation Initiatives</h3>
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
              <option value="" disabled>+ Add TOMs Metric</option>
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
                style={{
                  padding: '0.85rem 1rem',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="tag-mono">{init.toms_metric_code}</span>
                    <strong style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{init.name}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8125rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{formatGbp(unitRate)}/{m?.unit || 'units'}</span>
                    <strong style={{ color: 'var(--text-primary)' }}>= {formatGbp(subtotal)}</strong>
                    <button
                      onClick={() => removeInitiative(idx)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      ✕
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
                    style={{ flex: 1, accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', minWidth: '70px', textAlign: 'right' }}>
                    {init.annual_volume} /yr
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
