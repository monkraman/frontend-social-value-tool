import React, { useState } from 'react';
import type { ResponseGenerationResult, SocialValuePackage } from '../types';
import { useToast } from '../context/ToastContext';
import {
  Download,
  RotateCcw,
  Copy,
  Check,
  Calendar,
  Users,
  PoundSterling,
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
  FileText
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
  const currentTotal = currentCalc ? currentCalc.total_social_value_gbp : 0;
  const currentPercent = currentCalc ? currentCalc.social_value_percentage : 0;
  const isTargetAchieved = currentCalc ? currentCalc.target_met : false;

  const deliveryCost = currentPkg?.indicative_delivery_cost_gbp ?? 0;
  const svroiMultiplier = deliveryCost > 0 ? (currentTotal / deliveryCost).toFixed(1) : null;

  const handleCopyTenderText = () => {
    if (!currentPkg) return;

    const initiativesSummary = currentPkg.initiatives
      .map(
        (init, i) =>
          `${i + 1}. ${init.name} (${init.toms_metric_code || 'TOMs'})\n` +
          `   Theme: ${init.theme}\n` +
          `   Partner: ${init.partner || 'Infosys Core Ecosystem'}\n` +
          `   Mechanism: ${init.delivery_mechanism}\n` +
          `   Target Beneficiaries: ${init.target_beneficiaries}\n` +
          (init.indicative_cost_gbp ? `   Estimated Cost: ${formatGbp(init.indicative_cost_gbp)}\n` : '') +
          `   Evidence: ${init.evidence_source || 'Verified Method Statement'}`
      )
      .join('\n\n');

    const textToCopy =
      `# Social Value Proposal: ${currentPkg.name}\n` +
      `Client: ${result.opportunity.client}\n` +
      `Location: ${result.opportunity.location}\n` +
      `Contract Value: ${formatGbp(result.opportunity.contract_value_gbp)} over ${result.opportunity.duration_years} years\n` +
      `Target Social Value: ${formatGbp(targetAmount)} (${result.opportunity.social_value_weighting_percent}%)\n` +
      `Offered Social Value: ${formatGbp(currentTotal)} (${formatPercent(currentPercent)})\n` +
      (deliveryCost > 0 ? `Indicative Internal Delivery Cost: ${formatGbp(deliveryCost)} (${svroiMultiplier}x SVROI)\n` : '') +
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
            <div className="eyebrow" style={{ marginBottom: '0.2rem' }}>Tender opportunity</div>
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
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.4rem' }}>over {result.opportunity.duration_years} years</span>
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
            Template 1: Core (Baseline)
          </button>
          <button
            onClick={() => setActivePackage('enhanced')}
            className={activePackage === 'enhanced' ? 'is-active' : ''}
            style={{ padding: '0.5rem 0.9rem', fontSize: '0.84rem' }}
          >
            Template 2: Expanded option
          </button>
          <button
            onClick={() => setActivePackage('localised')}
            className={activePackage === 'localised' ? 'is-active' : ''}
            style={{ padding: '0.5rem 0.9rem', fontSize: '0.84rem' }}
          >
            Template 3: Localised (Place Based)
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
                <span className="badge-mono" style={{ fontSize: '0.72rem' }}>
                  {activePackage === 'core' ? 'Core option' : activePackage === 'enhanced' ? 'Expanded option' : 'Place-focused option'}
                </span>
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
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem', paddingTop: '0.4rem', borderTop: '1px solid var(--color-primary-border)' }}>
                Est. Cost: {deliveryCost > 0 ? formatGbp(deliveryCost) : '£0'} {svroiMultiplier ? `• ${svroiMultiplier}x SVROI` : ''}
              </div>
            </div>
          </div>

          {/* Initiatives List */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 600 }}>Proposed initiatives</h3>
              <span className="badge-mono" style={{ fontSize: '0.72rem', padding: '0.1rem 0.5rem' }}>
                {currentPkg.initiatives.length}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {currentPkg.initiatives.map((init, idx) => {
                const calc = currentCalc?.initiatives[idx];
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
                        <strong style={{ fontSize: '0.98rem', color: 'var(--text-primary)' }}>{init.name}</strong>
                        {init.toms_metric_code && (
                          <span className="tag-mono">
                            {init.toms_metric_code}
                          </span>
                        )}
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{init.theme}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {init.partner ? (
                          <span className="badge-mono" style={{ fontSize: '0.74rem', fontWeight: 600 }}>
                            <Handshake size={12} />
                            {init.partner}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Description */}
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                      {init.description}
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
                        <span>{init.delivery_mechanism}</span>
                      </div>
                      <span style={{ color: 'var(--border-medium)' }}>|</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Users size={13} style={{ color: 'var(--color-primary)' }} />
                        <span>{init.target_beneficiaries}</span>
                      </div>
                      {init.indicative_cost_gbp != null && init.indicative_cost_gbp > 0 && (
                        <>
                          <span style={{ color: 'var(--border-medium)' }}>|</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-primary)' }}>
                            <PoundSterling size={13} style={{ color: 'var(--color-primary)' }} />
                            <span>Est. Cost: {formatGbp(init.indicative_cost_gbp)}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* RAG Evidence Grounding Source */}
                    {init.evidence_source && (
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
                          <strong style={{ color: 'var(--text-primary)' }}>Evidence:</strong> {init.evidence_source}
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
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>POC value</span>
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
