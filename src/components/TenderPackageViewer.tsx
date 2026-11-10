import React, { useState } from 'react';
import type { ResponseGenerationResult, SocialValuePackage } from '../types';
import { useToast } from '../context/ToastContext';
import { FallbackNotice } from './FallbackNotice';
import {
  Download,
  RotateCcw,
  Copy,
  Check,
  Calendar,
  Users,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  Handshake,
  UserCheck,
  CalendarClock,
  BarChart3,
  TrendingUp,
  ClipboardCheck,
  Info,
  ListChecks,
  X,
  FileText,
  Sliders,
  Minus,
  Plus
} from 'lucide-react';
import { formatGbp, formatPercent } from '../utils/formatters';

export interface TenderPackageViewerProps {
  result: ResponseGenerationResult;
  targetAmount?: number;
  onExportJson?: () => void;
  onReset?: () => void;
  initialPackage?: 'core' | 'enhanced' | 'localised';
  showResetButton?: boolean;
}

export const TenderPackageViewer: React.FC<TenderPackageViewerProps> = ({
  result,
  targetAmount: propTargetAmount,
  onExportJson,
  onReset,
  initialPackage = 'localised',
  showResetButton = true
}) => {
  const [activePackage, setActivePackage] = useState<'core' | 'enhanced' | 'localised'>(initialPackage);
  const [showAuditModal, setShowAuditModal] = useState<boolean>(false);
  const [copiedTender, setCopiedTender] = useState<boolean>(false);
  const [isTunerMode, setIsTunerMode] = useState<boolean>(false);
  const [customVolumes, setCustomVolumes] = useState<Record<string, number>>({});
  const toast = useToast();

  const targetAmount = propTargetAmount || result.opportunity.target_social_value_gbp || 
    (result.opportunity.contract_value_gbp * (result.opportunity.social_value_weighting_percent / 100));

  const currentPkg: SocialValuePackage =
    activePackage === 'core'
      ? result.core_package
      : activePackage === 'enhanced'
      ? result.enhanced_package
      : result.localised_package;

  const currentCalc = currentPkg?.financial_calculation;
  const duration = result.opportunity.duration_years || (result.opportunity as any).contract_duration_years || 3;
  const contractVal = result.opportunity.contract_value_gbp || 1;

  // National TOMs proxy rate lookup safeguard
  const TOMS_DEFAULT_RATES: Record<string, { unit: string; rate: number }> = {
    NT1: { unit: 'no. people FTE', rate: 45722.0 },
    NT3: { unit: 'no. people FTE', rate: 51561.0 },
    NT4: { unit: 'no. people FTE', rate: 53013.0 },
    NT8: { unit: 'no. staff volunteering hours', rate: 17.48 },
    NT10: { unit: 'no. weeks', rate: 309.73 },
    NT18: { unit: '£', rate: 1.089 },
    NT27: { unit: '£', rate: 1.00 },
    NT31: { unit: 'tCO2e', rate: 252.11 },
    'NT31a': { unit: 'tCO2e', rate: 252.11 }
  };

  // Dynamically compute initiatives with custom tuned volume if modified
  const effectiveInits = (currentPkg?.initiatives || []).map((init, idx) => {
    const key = `${activePackage}_${idx}`;
    const vol = customVolumes[key] !== undefined ? customVolumes[key] : init.annual_volume;
    const code = init.toms_metric_code || '';
    const defaultMeta = TOMS_DEFAULT_RATES[code];
    const matchedCalc = currentCalc?.initiatives?.find(c => c.toms_code === code) || currentCalc?.initiatives?.[idx];
    const unitVal = matchedCalc?.unit_value_gbp || defaultMeta?.rate || 1.0;
    const unitName = matchedCalc?.unit || defaultMeta?.unit || 'units';
    const totalVol = Math.round(vol * duration * 10) / 10;
    const totalSv = Math.round(totalVol * unitVal);
    return {
      ...init,
      effectiveVol: vol,
      calc: {
        ...(matchedCalc || {}),
        initiative_name: init.name,
        toms_code: code,
        metric_name: init.name,
        annual_volume: vol,
        duration_years: duration,
        total_volume: totalVol,
        unit_value_gbp: unitVal,
        total_social_value_gbp: totalSv,
        unit: unitName,
        calculation_formula: `${vol} ${unitName}/yr × ${duration} yrs = ${totalVol} ${unitName} @ £${unitVal.toLocaleString()} = £${totalSv.toLocaleString()}`
      }
    };
  });

  const currentTotal = effectiveInits.reduce((acc, item) => acc + (item.calc.total_social_value_gbp || 0), 0) || (currentCalc?.total_social_value_gbp ?? 0);
  const currentPercent = (currentTotal / contractVal) * 100;
  const isTargetAchieved = currentTotal >= targetAmount;

  const handleVolumeChange = (idx: number, newVol: number) => {
    const key = `${activePackage}_${idx}`;
    setCustomVolumes(prev => ({
      ...prev,
      [key]: Math.max(0, newVol)
    }));
  };

  const handleCopyTenderText = () => {
    if (!currentPkg) return;

    const initiativesSummary = effectiveInits
      .map(
        (item, i) =>
          `${i + 1}. ${item.name} (${item.toms_metric_code || 'TOMs'})\n` +
          `   Theme: ${item.theme}\n` +
          `   Partner: ${item.partner || 'Infosys Core Ecosystem'}\n` +
          `   Mechanism: ${item.delivery_mechanism}\n` +
          `   Annual Commitment: ${item.effectiveVol} ${item.calc.unit}/yr (${item.calc.total_volume} total over ${duration} yrs)\n` +
          `   Committed Social Value: ${formatGbp(item.calc.total_social_value_gbp)}\n` +
          `   Target Beneficiaries: ${item.target_beneficiaries}\n` +
          `   Evidence: ${item.evidence_source || 'Verified Method Statement'}`
      )
      .join('\n\n');

    const textToCopy =
      `# Social Value Proposal: ${currentPkg.name}\n` +
      `Client: ${result.opportunity.client}\n` +
      `Location: ${result.opportunity.location}\n` +
      `Contract Value: ${formatGbp(result.opportunity.contract_value_gbp)} over ${duration} years\n` +
      `Target Social Value: ${formatGbp(targetAmount)} (${result.opportunity.social_value_weighting_percent}%)\n` +
      `Offered Social Value: ${formatGbp(currentTotal)} (${formatPercent(currentPercent)})\n` +
      `\n## Strategic Rationale\n${currentPkg.rationale}\n\n` +
      `## Proposed Initiatives\n${initiativesSummary}\n\n` +
      `## Governance & Accountability\n` +
      `- Social Value Lead: ${currentPkg.governance?.social_value_lead}\n` +
      `- Kick-off: ${currentPkg.governance?.kickoff_cadence}\n` +
      `- Reporting: ${currentPkg.governance?.reporting_frequency}\n` +
      `- Annual Audit: ${currentPkg.governance?.annual_review}`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedTender(true);
    setTimeout(() => setCopiedTender(false), 2500);
    toast.success(`${currentPkg.name} method statement copied!`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
      {result.is_mock && <FallbackNotice />}

      {/* Unified Clean Tender Overview Card */}
      <div
        style={{
          padding: '1.15rem 1.4rem',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderTop: '3px solid var(--color-primary)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.9rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.35rem', color: 'var(--text-primary)', lineHeight: 1.25, fontWeight: 600 }}>
                {result.opportunity.client}
              </h2>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <MapPin size={13} style={{ color: 'var(--color-primary)' }} /> {result.opportunity.location}
              </span>
            </div>
          </div>
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 600,
              padding: '0.3rem 0.7rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: isTargetAchieved ? 'rgba(30, 158, 90, 0.10)' : 'rgba(202, 138, 4, 0.10)',
              color: isTargetAchieved ? 'var(--status-online)' : '#B7791F',
              border: `1px solid ${isTargetAchieved ? 'rgba(30, 158, 90, 0.30)' : 'rgba(202, 138, 4, 0.30)'}`
            }}
          >
            {isTargetAchieved ? 'Meets target' : 'Below target'} · {formatPercent(currentPercent)}
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            paddingTop: '0.85rem',
            borderTop: '1px solid var(--border-subtle)'
          }}
        >
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Contract value</span>
            <strong className="display-num" style={{ fontSize: '1.15rem', color: 'var(--text-primary)' }}>{formatGbp(result.opportunity.contract_value_gbp)}</strong>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.4rem' }}>over {duration} years</span>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Social value target</span>
            <strong className="display-num" style={{ fontSize: '1.15rem', color: 'var(--color-primary-text)' }}>{formatGbp(targetAmount)}</strong>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.4rem' }}>{result.opportunity.social_value_weighting_percent}% weighting</span>
          </div>

          {result.opportunity.priorities && result.opportunity.priorities.length > 0 && (
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Client priorities</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {result.opportunity.priorities.map((pr, i) => (
                  <span key={i} className="badge-mono" style={{ fontSize: '0.74rem' }}>
                    {pr}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Package options and quick actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem' }}>
        <div className="segmented" role="tablist" aria-label="Response templates" style={{ flexWrap: 'wrap' }}>
          <button
            onClick={() => setActivePackage('core')}
            className={activePackage === 'core' ? 'is-active' : ''}
            style={{ padding: '0.5rem 0.9rem', fontSize: '0.84rem' }}
          >
            Core
          </button>
          <button
            onClick={() => setActivePackage('enhanced')}
            className={activePackage === 'enhanced' ? 'is-active' : ''}
            style={{ padding: '0.5rem 0.9rem', fontSize: '0.84rem' }}
          >
            Expanded
          </button>
          <button
            onClick={() => setActivePackage('localised')}
            className={activePackage === 'localised' ? 'is-active' : ''}
            style={{ padding: '0.5rem 0.9rem', fontSize: '0.84rem' }}
          >
            Localised
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleCopyTenderText}
            className="btn-primary"
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.75rem', gap: '0.35rem' }}
          >
            {copiedTender ? <Check size={13} /> : <Copy size={13} />}
            {copiedTender ? 'Copied' : 'Copy tender response'}
          </button>

          {onExportJson && (
            <button
              onClick={() => {
                onExportJson();
                toast.info('Tender response JSON downloaded.');
              }}
              className="btn-secondary"
              style={{ padding: '0.45rem 0.75rem', fontSize: '0.75rem' }}
            >
              <Download size={13} /> JSON
            </button>
          )}

          <button
            onClick={() => setShowAuditModal(true)}
            className="btn-secondary"
            style={{ padding: '0.45rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            title="See the sources and steps behind this proposal"
          >
            <ListChecks size={13} /> How it was built
          </button>

          {showResetButton && onReset && (
            <button onClick={onReset} className="btn-secondary" style={{ padding: '0.45rem 0.75rem', fontSize: '0.75rem' }}>
              <RotateCcw size={13} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Active Package Detailed Card */}
      {currentPkg && (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-sm)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}
        >
          {/* Package Header with Financials & Commercial Assessment */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1.25rem' }}>
            <div style={{ maxWidth: '640px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, lineHeight: 1.25 }}>
                  {currentPkg.name}
                </h3>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0.5rem 0 0 0' }}>
                {currentPkg.rationale}
              </p>
            </div>

            {/* Commercial Scorecard Pill */}
            <div
              style={{
                backgroundColor: 'var(--color-primary-subtle)',
                border: '1px solid var(--color-primary-border)',
                borderRadius: 'var(--radius-md)',
                padding: '0.9rem 1.15rem',
                textAlign: 'right',
                minWidth: '240px'
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.1rem' }}>
                Estimated social value
              </div>
              <div className="display-num" style={{ fontSize: '1.9rem', fontWeight: 600, color: 'var(--color-primary-text)', lineHeight: 1.15 }}>
                {formatGbp(currentTotal)}
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {formatPercent(currentPercent)} of contract value
              </div>
              <div style={{ fontSize: '0.75rem', color: isTargetAchieved ? '#059669' : 'var(--text-muted)', marginTop: '0.4rem', paddingTop: '0.4rem', borderTop: '1px solid var(--color-primary-border)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem', fontWeight: 600 }}>
                <CheckCircle2 size={13} />
                <span>{isTargetAchieved ? 'Meets target' : `Target: ${formatGbp(targetAmount)}`}</span>
              </div>
            </div>
          </div>

          {/* Initiatives List Header with Optional Tweak Numbers Tool */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 600 }}>Proposed initiatives</h3>
                <span className="badge-mono" style={{ fontSize: '0.72rem', padding: '0.1rem 0.5rem' }}>
                  {effectiveInits.length}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <button
                  type="button"
                  onClick={() => setIsTunerMode(!isTunerMode)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    padding: '0.22rem 0.65rem',
                    borderRadius: '999px',
                    border: isTunerMode ? '1px solid var(--color-primary)' : '1px solid var(--border-medium)',
                    backgroundColor: isTunerMode ? 'var(--color-primary-subtle)' : 'var(--bg-surface)',
                    color: isTunerMode ? 'var(--color-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  title="Tune initiative target numbers to match specific RFP requirements"
                >
                  <Sliders size={12} />
                  <span>{isTunerMode ? 'Tuner Active' : 'Tweak Numbers'}</span>
                </button>

                {Object.keys(customVolumes).length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCustomVolumes({})}
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {effectiveInits.map((item, idx) => {
                const calc = item.calc;
                return (
                  <div
                    key={idx}
                    className="card-accent"
                    style={{
                      padding: '1.1rem 1.2rem',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.6rem'
                    }}
                  >
                    {/* Title Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--btn-primary-bg)',
                            color: '#FFFFFF',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          {idx + 1}
                        </span>
                        <strong style={{ fontSize: '0.98rem', color: 'var(--text-primary)' }}>{item.name}</strong>
                        {item.toms_metric_code && (
                          <span className="tag-mono">
                            {item.toms_metric_code}
                          </span>
                        )}
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.theme}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {item.partner ? (
                          <span className="badge-mono" style={{ fontSize: '0.74rem', fontWeight: 600 }}>
                            <Handshake size={12} />
                            {item.partner}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Description */}
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                      {item.description}
                    </p>

                    {/* Clean Operational Breakdown Bar */}
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.5rem 0.75rem',
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8rem',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Calendar size={13} style={{ color: 'var(--color-primary)' }} />
                        <span>{item.delivery_mechanism}</span>
                      </div>
                      <span style={{ color: 'var(--border-medium)' }}>|</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Users size={13} style={{ color: 'var(--color-primary)' }} />
                        <span>{item.target_beneficiaries}</span>
                      </div>

                      {/* Interactive Volume Tuner Stepper when Tuner Mode is Active */}
                      {isTunerMode && (
                        <>
                          <span style={{ color: 'var(--border-medium)' }}>|</span>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              backgroundColor: 'var(--bg-card)',
                              border: '1px solid var(--border-medium)',
                              borderRadius: '4px',
                              padding: '0.12rem 0.4rem'
                            }}
                          >
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Tweak:</span>
                            <button
                              type="button"
                              onClick={() => handleVolumeChange(idx, Math.max(0, item.effectiveVol - (item.effectiveVol > 100 ? 50 : (item.effectiveVol > 10 ? 5 : 1))))}
                              style={{
                                border: '1px solid var(--border-subtle)',
                                backgroundColor: 'var(--bg-hover)',
                                borderRadius: '3px',
                                width: '20px',
                                height: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: 'var(--text-primary)'
                              }}
                            >
                              <Minus size={11} />
                            </button>
                            <input
                              type="number"
                              value={item.effectiveVol}
                              onChange={(e) => handleVolumeChange(idx, Math.max(0, parseFloat(e.target.value) || 0))}
                              style={{
                                width: '55px',
                                textAlign: 'center',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '3px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                padding: '0.1rem',
                                color: 'var(--text-primary)',
                                backgroundColor: 'var(--bg-surface)'
                              }}
                            />
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{calc.unit}/yr</span>
                            <button
                              type="button"
                              onClick={() => handleVolumeChange(idx, item.effectiveVol + (item.effectiveVol >= 100 ? 50 : (item.effectiveVol >= 10 ? 5 : 1)))}
                              style={{
                                border: '1px solid var(--border-subtle)',
                                backgroundColor: 'var(--bg-hover)',
                                borderRadius: '3px',
                                width: '20px',
                                height: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: 'var(--text-primary)'
                              }}
                            >
                              <Plus size={11} />
                            </button>
                          </div>
                        </>
                      )}

                      {calc && calc.total_social_value_gbp > 0 && (
                        <>
                          <span style={{ color: 'var(--border-medium)' }}>|</span>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '999px',
                              backgroundColor: 'rgba(5, 150, 105, 0.1)',
                              color: '#059669',
                              fontWeight: 600,
                              fontSize: '0.76rem'
                            }}
                            title="National TOMs Social Value Contribution"
                          >
                            <TrendingUp size={12} />
                            <span>Social Value: {formatGbp(calc.total_social_value_gbp)}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* RAG Evidence Grounding Source */}
                    {item.evidence_source && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          fontSize: '0.78rem',
                          color: 'var(--text-secondary)',
                          backgroundColor: 'var(--color-primary-subtle)',
                          padding: '0.4rem 0.65rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-primary-border)'
                        }}
                      >
                        <FileText size={12} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                        <span>
                          <strong style={{ color: 'var(--text-primary)' }}>Evidence:</strong> {item.evidence_source}
                        </span>
                      </div>
                    )}

                    {/* Deterministic Formula Trail */}
                    {calc && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.75rem' }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.74rem',
                            color: 'var(--text-secondary)',
                            backgroundColor: 'var(--bg-muted)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.2rem 0.5rem'
                          }}
                        >
                          {calc.calculation_formula}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.4rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Social value</span>
                          <strong className="display-num" style={{ fontSize: '1.05rem', color: 'var(--color-primary-text)' }}>
                            {formatGbp(calc.total_social_value_gbp)}
                          </strong>
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Standardised Governance Cadence Framework */}
          <div
            style={{
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
              <ShieldCheck size={18} style={{ color: 'var(--color-primary)' }} />
              <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                Governance and reporting
              </h3>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: '0.75rem'
              }}
            >
              <div style={{ padding: '0.9rem 1rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  <span className="icon-badge" style={{ width: '26px', height: '26px' }}>
                    <UserCheck size={14} />
                  </span>
                  Social value lead
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {currentPkg.governance?.social_value_lead || 'Dedicated Infosys Social Value Lead assigned upon contract award'}
                </div>
              </div>

              <div style={{ padding: '0.9rem 1rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  <span className="icon-badge" style={{ width: '26px', height: '26px' }}>
                    <CalendarClock size={14} />
                  </span>
                  60-day mobilisation
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {currentPkg.governance?.kickoff_cadence || 'Joint Social Value Kick-Off Meeting held within 60 days of award'}
                </div>
              </div>

              <div style={{ padding: '0.9rem 1rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  <span className="icon-badge" style={{ width: '26px', height: '26px' }}>
                    <BarChart3 size={14} />
                  </span>
                  Quarterly reporting
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {currentPkg.governance?.reporting_frequency || 'Quarterly Social Value Progress & National TOMs Performance Reporting'}
                </div>
              </div>

              <div style={{ padding: '0.9rem 1rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  <span className="icon-badge" style={{ width: '26px', height: '26px' }}>
                    <TrendingUp size={14} />
                  </span>
                  Annual impact review
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {currentPkg.governance?.annual_review || 'Annual SVROI impact evaluation and financial verification audit'}
                </div>
              </div>
            </div>
          </div>

          {/* Assumptions & Action Items */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', fontSize: '0.85rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                <ClipboardCheck size={16} style={{ color: 'var(--color-primary)' }} />
                Before you submit
              </div>
              <ul className="list-brand" style={{ paddingLeft: '1.15rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                {result.validation_required.map((v, i) => (
                  <li key={i}>{v}</li>
                ))}
              </ul>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                <Info size={16} style={{ color: 'var(--color-primary)' }} />
                Commercial and tender assumptions
              </div>
              <ul className="list-brand" style={{ paddingLeft: '1.15rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                {result.assumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* AI Reasoning & Evidence Grounding Modal */}
      {showAuditModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'var(--overlay)',
            backdropFilter: 'blur(3px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
            animation: 'fadeIn 0.15s ease-out'
          }}
          onClick={() => setShowAuditModal(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '680px',
              maxHeight: '85vh',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg, 10px)',
              border: '1px solid var(--border-medium)',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span className="icon-badge" style={{ width: '32px', height: '32px' }}>
                  <ListChecks size={16} />
                </span>
                <div>
                  <h3 style={{ fontSize: '1.1rem', margin: 0 }}>How this response was built</h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Authoritative proxy calculation and grounding summary
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowAuditModal(false)}
                className="btn-secondary"
                style={{ padding: '0.35rem 0.55rem', border: 'none', background: 'transparent' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <strong style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.4rem' }}>
                  Authoritative TOMs calculation formula
                </strong>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Total Social Value (£) = Annual Volume × Contract Term (Years) × National TOMs Unit Rate (£).
                </p>
                <div
                  style={{
                    backgroundColor: 'var(--bg-muted)',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.78rem',
                    fontFamily: 'var(--font-mono)'
                  }}
                >
                  {currentCalc?.audit_trail?.map((trail, idx) => (
                    <div key={idx} style={{ marginBottom: '0.2rem' }}>
                      • {trail}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <strong style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.4rem' }}>
                  Grounding & partner ecosystem
                </strong>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Initiatives are mapped directly against National TOMs 2024 proxy valuations and pre-approved regional delivery partners in {result.opportunity.location}.
                </p>
              </div>
            </div>

            <div
              style={{
                padding: '0.9rem 1.5rem',
                borderTop: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-card)',
                display: 'flex',
                justifyContent: 'flex-end'
              }}
            >
              <button onClick={() => setShowAuditModal(false)} className="btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

