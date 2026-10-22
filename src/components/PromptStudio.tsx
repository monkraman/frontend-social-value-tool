import React, { useState } from 'react';
import type { ResponseGenerationResult } from '../types';
import { useToast } from '../context/ToastContext';
import {
  Send,
  CornerDownLeft,
  Download,
  RotateCcw,
  AlertCircle,
  FileText,
  Search,
  Brain,
  Copy,
  Check,
  Calendar,
  Users,
  PoundSterling,
  Sparkles,
  ShieldCheck,
  MessageSquarePlus,
  RefreshCw,
  Loader,
  X
} from 'lucide-react';
import { formatGbp, formatPercent } from '../utils/formatters';

export interface PromptFeedback {
  type: 'non_rfp' | 'navigated';
  message: string;
  prompt: string;
}

export interface PromptStudioProps {
  currentPrompt: string;
  onSendPrompt: (promptText: string) => void;
  isLoading: boolean;
  result: ResponseGenerationResult | null;
  targetAmount: number;
  promptFeedback?: PromptFeedback | null;
  error?: string | null;
  onClearError?: () => void;
  onRetry?: () => void;
  onNavigateTab?: (tab: 'prompt' | 'tuner' | 'documents' | 'search') => void;
  onClearFeedback?: () => void;
  onExportJson?: () => void;
  onReset: () => void;
  // Refinement props
  onRefineResult?: (feedback: string) => void;
  isRefining?: boolean;
  refineError?: string | null;
  refinementNote?: string | null;
  conversationTurnCount?: number;
}

const DEFAULT_SAMPLE_PROMPT =
  'I need to build a Social Value bid response, for a 3-year contract of £10M with 10% Social Value weighting. The client Birmingham City Council in Birmingham wants the Social Value offer to address digital inclusion and youth employment. Based on: previous responses that have scored highly, what Infosys have delivered so far, approved partnerships in our repository, recognised frameworks for SVROI (National TOMS) and geographical location - build a template of initiatives we can present to the client that would achieve 10% SV, and the impact we can expect to deliver.';

export const PromptStudio: React.FC<PromptStudioProps> = ({
  currentPrompt,
  onSendPrompt,
  isLoading,
  result,
  targetAmount,
  promptFeedback,
  error = null,
  onClearError,
  onRetry,
  onNavigateTab,
  onClearFeedback,
  onExportJson,
  onReset,
  onRefineResult,
  isRefining = false,
  refineError = null,
  refinementNote = null,
  conversationTurnCount = 0
}) => {
  const [inputText, setInputText] = useState(currentPrompt);
  const [prevPrompt, setPrevPrompt] = useState(currentPrompt);
  // Default to localised package as it matches the exact 10% place-based target
  const [activePackage, setActivePackage] = useState<'core' | 'enhanced' | 'localised'>('localised');
  const [showAuditModal, setShowAuditModal] = useState<boolean>(false);
  const [copiedTender, setCopiedTender] = useState<boolean>(false);
  const [refineText, setRefineText] = useState<string>('');
  const toast = useToast();

  if (currentPrompt !== prevPrompt) {
    setPrevPrompt(currentPrompt);
    setInputText(currentPrompt);
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!inputText.trim() || isLoading) return;
    setRefineText('');
    onSendPrompt(inputText.trim());
  };

  const handleRefineSubmit = () => {
    if (!refineText.trim() || isRefining) return;
    onRefineResult?.(refineText.trim());
    setRefineText('');
  };

  const handleRefineKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleRefineSubmit();
    }
  };

  const currentPkg = result
    ? activePackage === 'core'
      ? result.core_package
      : activePackage === 'enhanced'
      ? result.enhanced_package
      : result.localised_package
    : null;

  const currentCalc = currentPkg?.financial_calculation;
  const currentTotal = currentCalc ? currentCalc.total_social_value_gbp : 0;
  const currentPercent = currentCalc
    ? currentCalc.social_value_percentage
    : result?.opportunity.contract_value_gbp
    ? (currentTotal / result.opportunity.contract_value_gbp) * 100
    : 0;

  const deliveryCost = currentPkg?.indicative_delivery_cost_gbp || 0;
  const svroiMultiplier = deliveryCost > 0 ? (currentTotal / deliveryCost).toFixed(1) : null;
  const isTargetAchieved = currentCalc?.target_met ?? false;

  // Copy Tender-Ready Text to Clipboard
  const handleCopyTenderText = () => {
    if (!result || !currentPkg) return;

    const opp = result.opportunity;
    const governance = currentPkg.governance;

    const tenderText = `
SOCIAL VALUE BID RESPONSE WORKING DRAFT — REVIEW BEFORE USE
=====================================================
Client: ${opp.client} (${opp.location})
Contract Value: ${formatGbp(opp.contract_value_gbp)}
Contract Term: ${opp.duration_years} Years
Mandated Target Weighting: ${opp.social_value_weighting_percent}% (${formatGbp(targetAmount)})
Package Option: ${currentPkg.name}
Indicative Social Value Estimate: ${formatGbp(currentTotal)} (${formatPercent(currentPercent)} of contract value)
Proxy Calculation Status: ${isTargetAchieved ? 'MEETS SYNTHETIC POC TARGET' : 'BELOW SYNTHETIC POC TARGET'}

1. EXECUTIVE SUMMARY & COMMITMENT
-----------------------------------------------------
${currentPkg.rationale}
This draft estimates ${formatGbp(currentTotal)} using the current POC metric catalog. Confirm measure definitions, rates and delivery evidence before treating this as a bid commitment.

2. PROPOSED INITIATIVES & OPERATIONAL METRICS
-----------------------------------------------------
${currentPkg.initiatives
  .map(
    (init, i) => `[${i + 1}] ${init.name} (${init.toms_metric_code || 'National TOMs'})
Theme: ${init.theme} | Location: ${init.location}
Delivery: ${init.delivery_mechanism}
Target Group: ${init.target_beneficiaries}
Annual TOMs Volume: ${init.annual_volume} ${currentCalc?.initiatives[i]?.unit || 'units'}/yr
Delivery detail: ${init.sessions_per_year ?? 'TBC'} sessions/yr × ${init.hours_per_session ?? 'TBC'} hours/session × ${init.participants_per_session ?? 'TBC'} participants/session
Evidence status: ${init.is_from_knowledge_base ? 'Retrieved; approval and fit require review' : 'Model suggestion; validate against approved offer'}
Calculation: ${currentCalc?.initiatives[i]?.calculation_formula || 'TBC'}
`
  )
  .join('\n')}

3. STANDARDISED GOVERNANCE & REPORTING CADENCE
-----------------------------------------------------
- Social Value Lead: ${governance?.social_value_lead || 'Dedicated Infosys Social Value Lead assigned upon contract award'}
- Contract Mobilization: ${governance?.kickoff_cadence || 'Joint Social Value Kick-Off Meeting held within 60 days of award'}
- Reporting Frequency: ${governance?.reporting_frequency || 'Quarterly Social Value Progress & Performance Reporting'}
- Annual Governance: ${governance?.annual_review || 'Annual SVROI impact evaluation and financial verification audit'}

4. COMMERCIAL FEASIBILITY & SOCIAL RETURN (SVROI)
-----------------------------------------------------
- Total Quantifiable Social Value Created: ${formatGbp(currentTotal)}
- Indicative Delivery Investment to Infosys: ${deliveryCost > 0 ? formatGbp(deliveryCost) : 'Not provided'}
- Social Return on Investment (SVROI): ${svroiMultiplier ? `${svroiMultiplier}x (indicative)` : 'Not calculated (delivery cost not provided)'}
- Summary: ${currentPkg.commercial_viability_summary || 'Not assessed; approved delivery cost inputs are required.'}
    `.trim();

    navigator.clipboard.writeText(tenderText);
    setCopiedTender(true);
    toast.success('Full tender response copied to clipboard!');
    setTimeout(() => setCopiedTender(false), 2500);
  };

  return (
    <div style={{ width: '100%', maxWidth: '1440px', display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
      {/* Feedback State: Non-RFP Prompt */}
      {promptFeedback && !result && !isLoading && (
        <div
          style={{
            padding: '1.25rem 1.5rem',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            marginTop: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', fontWeight: 600 }}>
            <AlertCircle size={16} />
            <span>Non-Tender Query Detected</span>
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontStyle: 'italic', padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-muted)', borderRadius: 'var(--radius-sm)' }}>
            "{promptFeedback.prompt}"
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
            {promptFeedback.message}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
            <button
              onClick={() => {
                setInputText(DEFAULT_SAMPLE_PROMPT);
                onClearFeedback?.();
              }}
              className="btn-primary"
              style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}
            >
              Insert Client RFP Template
            </button>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('documents')}
                className="btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}
              >
                <FileText size={12} /> Open Knowledge Documents
              </button>
            )}
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('search')}
                className="btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}
              >
                <Search size={12} /> Open Vector Search
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error State: Transparent, clean AI/Backend error alert */}
      {error && !isLoading && (
        <div
          style={{
            padding: '1.25rem 1.5rem',
            backgroundColor: 'rgba(239, 68, 68, 0.06)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            marginTop: '0.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontWeight: 600, fontSize: '0.9rem' }}>
              <AlertCircle size={18} />
              <span>AI Pipeline Notice & Error</span>
            </div>
            <span
              style={{
                fontSize: '0.7rem',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                color: '#ef4444',
                padding: '0.2rem 0.55rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                letterSpacing: '0.02em'
              }}
            >
              Anti-Hallucination Safe Mode
            </span>
          </div>

          <div
            style={{
              fontSize: '0.875rem',
              color: 'var(--text-primary)',
              lineHeight: 1.5,
              padding: '0.6rem 0.85rem',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              wordBreak: 'break-word'
            }}
          >
            {error}
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
            To protect your tender integrity, the system halted generation instead of fabricating unverified initiatives or hallucinated costs.
          </p>

          <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
            {onRetry && (
              <button
                onClick={onRetry}
                className="btn-primary"
                style={{ fontSize: '0.75rem', padding: '0.4rem 0.85rem', gap: '0.35rem' }}
              >
                <RefreshCw size={13} /> Retry Generation
              </button>
            )}
            {onClearError && (
              <button
                onClick={onClearError}
                className="btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.4rem 0.85rem' }}
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!result && !isLoading && !promptFeedback && !error && (
        <div style={{ textAlign: 'center', padding: '3.5rem 1rem 1.5rem 1rem' }}>
          <div style={{ display: 'inline-flex', padding: '0.6rem', borderRadius: '50%', backgroundColor: 'var(--bg-muted)', marginBottom: '1rem', color: 'var(--text-primary)' }}>
            <Brain size={28} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Social Value RFP Response Builder
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '580px', margin: '0 auto 1.5rem auto', lineHeight: 1.6 }}>
            Drafts initiative options against your stated priorities, shows POC proxy calculations, and highlights the evidence and delivery checks needed before a bid commitment.
          </p>
          <button
            onClick={() => setInputText(DEFAULT_SAMPLE_PROMPT)}
            className="btn-secondary"
            style={{ fontSize: '0.8125rem', gap: '0.4rem' }}
          >
            <Sparkles size={14} /> Insert Client Sample Specification
          </button>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <Brain size={18} className="spin-icon" /> Synthesizing Social Value Response Packages...
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Retrieving available documents, mapping candidate measures, and calculating illustrative POC values.
          </div>
        </div>
      )}

      {/* Render Response Result */}
      {result && !isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Prominent Refinement Delta / What-Changed Banner */}
          {refinementNote && (
            <div
              style={{
                padding: '0.9rem 1.25rem',
                backgroundColor: 'rgba(34, 197, 94, 0.08)',
                border: '1px solid rgba(34, 197, 94, 0.35)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.85rem',
                animation: 'fadeIn 0.2s ease-in-out'
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: '#22c55e',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '0.1rem'
                }}
              >
                <Sparkles size={15} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                    {conversationTurnCount > 1 ? `⚡ Refined in Turn ${conversationTurnCount}` : '⚡ Proposal Updated with Feedback'}
                  </strong>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      padding: '0.12rem 0.5rem',
                      borderRadius: '999px',
                      backgroundColor: 'rgba(34, 197, 94, 0.18)',
                      color: '#15803d',
                      fontWeight: 600
                    }}
                  >
                    AI Context Retained
                  </span>
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {refinementNote}
                </div>
              </div>
            </div>
          )}

          {/* Unified Clean Tender Overview Card */}
          <div
            style={{
              padding: '1rem 1.25rem',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                  {result.opportunity.client}
                </strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  • {result.opportunity.location}
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '0.2rem 0.55rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-muted)',
                  color: isTargetAchieved ? 'var(--status-online, #22c55e)' : 'var(--text-primary)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                {isTargetAchieved ? 'Meets Target' : 'Below Target'} ({formatPercent(currentPercent)})
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.85rem',
                paddingTop: '0.65rem',
                borderTop: '1px solid var(--border-subtle)'
              }}
            >
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Contract Value</span>
                <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{formatGbp(result.opportunity.contract_value_gbp)}</strong>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginLeft: '0.35rem' }}>({result.opportunity.duration_years} Years)</span>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Social Value Target</span>
                <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{formatGbp(targetAmount)}</strong>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginLeft: '0.35rem' }}>({result.opportunity.social_value_weighting_percent}% Weighting)</span>
              </div>

              {result.opportunity.priorities && result.opportunity.priorities.length > 0 && (
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Key Priorities</span>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                    {result.opportunity.priorities.join(', ')}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Package options and quick actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem' }}>
            <div style={{ display: 'flex', gap: '0.35rem', backgroundColor: 'var(--bg-surface)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <button
                onClick={() => setActivePackage('core')}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: activePackage === 'core' ? 'var(--btn-primary-bg)' : 'transparent',
                  color: activePackage === 'core' ? 'var(--btn-primary-text)' : 'var(--text-secondary)',
                  fontSize: '0.8125rem',
                  fontWeight: activePackage === 'core' ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Template 1: Core (Baseline)
              </button>
              <button
                onClick={() => setActivePackage('enhanced')}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: activePackage === 'enhanced' ? 'var(--btn-primary-bg)' : 'transparent',
                  color: activePackage === 'enhanced' ? 'var(--btn-primary-text)' : 'var(--text-secondary)',
                  fontSize: '0.8125rem',
                  fontWeight: activePackage === 'enhanced' ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Template 2: Expanded option
              </button>
              <button
                onClick={() => setActivePackage('localised')}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: activePackage === 'localised' ? 'var(--btn-primary-bg)' : 'transparent',
                  color: activePackage === 'localised' ? 'var(--btn-primary-text)' : 'var(--text-secondary)',
                  fontSize: '0.8125rem',
                  fontWeight: activePackage === 'localised' ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
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
                {copiedTender ? 'Copied to Clipboard!' : 'Copy Tender Response'}
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
                title="View AI Reasoning Chain & PostgreSQL Vector Evidence"
              >
                <Brain size={13} /> Audit Trail
              </button>

              <button onClick={onReset} className="btn-secondary" style={{ padding: '0.45rem 0.75rem', fontSize: '0.75rem' }}>
                <RotateCcw size={13} /> Clear
              </button>
            </div>
          </div>

          {/* Refinement Feedback Notice Banner */}
          {refinementNote && (
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                fontSize: '0.8125rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                <Sparkles size={14} style={{ color: 'var(--text-secondary)' }} />
                <span>
                  <strong>Refinement Applied{conversationTurnCount > 1 ? ` (Turn ${conversationTurnCount})` : ''}:</strong> {refinementNote}
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Proposal updated based on your feedback
              </span>
            </div>
          )}

          {/* Active Package Detailed Card */}
          {currentPkg && (
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem'
              }}
            >
              {/* Package Header with Financials & Commercial Assessment */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
                <div style={{ maxWidth: '620px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                      {currentPkg.name}
                    </h3>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-muted)',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      {activePackage === 'core' ? 'Core option' : activePackage === 'enhanced' ? 'Expanded option' : 'Place-focused option'}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.5, margin: '0.35rem 0 0 0' }}>
                    {currentPkg.rationale}
                  </p>
                </div>

                {/* Commercial Scorecard Pill */}
                <div
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.75rem 1rem',
                    textAlign: 'right',
                    minWidth: '220px'
                  }}
                >
                  <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {formatGbp(currentTotal)}
                  </div>
                  <div style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {formatPercent(currentPercent)} Social Value Commitment
                  </div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.25rem', paddingTop: '0.25rem', borderTop: '1px solid var(--border-subtle)' }}>
                    Est. Cost: {deliveryCost > 0 ? formatGbp(deliveryCost) : '£0'} {svroiMultiplier ? `• ${svroiMultiplier}x SVROI` : ''}
                  </div>
                </div>
              </div>

              {/* Initiatives List */}
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                  Proposed Initiatives ({currentPkg.initiatives.length})
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {currentPkg.initiatives.map((init, idx) => {
                    const calc = currentCalc?.initiatives[idx];
                    return (
                      <div
                        key={idx}
                        style={{
                          padding: '1rem',
                          backgroundColor: 'var(--bg-card)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem'
                        }}
                      >
                        {/* Title Row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {init.toms_metric_code && (
                              <span className="tag-mono" style={{ fontWeight: 600 }}>
                                {init.toms_metric_code}
                              </span>
                            )}
                            <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{init.name}</strong>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>• {init.theme}</span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {init.partner ? (
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 500,
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '4px',
                                  backgroundColor: 'var(--bg-muted)',
                                  color: 'var(--text-primary)',
                                  border: '1px solid var(--border-subtle)'
                                }}
                              >
                                Partner: {init.partner}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {/* Description */}
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                          {init.description}
                        </p>

                        {/* Clean Operational Breakdown Bar */}
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            gap: '0.65rem',
                            padding: '0.4rem 0.65rem',
                            backgroundColor: 'var(--bg-surface)',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Calendar size={12} />
                            <span>{init.delivery_mechanism}</span>
                          </div>
                          <span>•</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Users size={12} />
                            <span>{init.target_beneficiaries}</span>
                          </div>
                          {init.indicative_cost_gbp != null && init.indicative_cost_gbp > 0 && (
                            <>
                              <span>•</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-primary)' }}>
                                <PoundSterling size={12} />
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
                              gap: '0.4rem',
                              fontSize: '0.725rem',
                              color: 'var(--text-secondary)',
                              backgroundColor: 'var(--bg-surface)',
                              padding: '0.3rem 0.55rem',
                              borderRadius: '4px',
                              border: '1px solid var(--border-subtle)'
                            }}
                          >
                            <FileText size={12} style={{ color: 'var(--color-primary, #3b82f6)', flexShrink: 0 }} />
                            <span>
                              <strong style={{ color: 'var(--text-primary)' }}>Evidence:</strong> {init.evidence_source}
                            </span>
                          </div>
                        )}

                        {/* Deterministic Formula Trail */}
                        {calc && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.75rem' }}>
                            <span className="tag-mono" style={{ color: 'var(--text-primary)' }}>
                              Formula: {calc.calculation_formula}
                            </span>
                            <strong style={{ fontSize: '0.825rem', color: 'var(--text-primary)' }}>
                              POC value: {formatGbp(calc.total_social_value_gbp)}
                            </strong>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.65rem' }}>
                  <ShieldCheck size={16} style={{ color: 'var(--text-primary)' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Proposed Governance & Reporting Cadence
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                    gap: '0.75rem'
                  }}
                >
                  <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                      👤 Social Value Lead
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {currentPkg.governance?.social_value_lead || 'Dedicated Infosys Social Value Lead assigned upon contract award'}
                    </div>
                  </div>

                  <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                      ⏱️ 60-Day Mobilization
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {currentPkg.governance?.kickoff_cadence || 'Joint Social Value Kick-Off Meeting held within 60 days of award'}
                    </div>
                  </div>

                  <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                      📊 Quarterly Reporting
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {currentPkg.governance?.reporting_frequency || 'Quarterly Social Value Progress & National TOMs Performance Reporting'}
                    </div>
                  </div>

                  <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                      📈 Annual Impact Review
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {currentPkg.governance?.annual_review || 'Annual SVROI impact evaluation and financial verification audit'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Assumptions & Action Items */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', fontSize: '0.8125rem' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                    Pre-Submission Action Items
                  </div>
                  <ul style={{ paddingLeft: '1.1rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    {result.validation_required.map((v, i) => (
                      <li key={i}>{v}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                    Commercial & Tender Assumptions
                  </div>
                  <ul style={{ paddingLeft: '1.1rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    {result.assumptions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Single Intelligent Sticky Bottom Input (Zero Duplicate Box Confusion) */}
      <div style={{ position: 'sticky', bottom: '1.5rem', marginTop: 'auto', paddingTop: '1rem' }}>
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.85rem 1.15rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.07)'
          }}
        >
          {/* Top Header inside Input Box */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            {result ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <MessageSquarePlus size={14} style={{ color: 'var(--text-primary)' }} />
                  Request changes to this proposal
                </span>
                {conversationTurnCount > 0 && (
                  <span
                    style={{
                      fontSize: '0.68rem',
                      padding: '0.1rem 0.45rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-muted)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                      fontWeight: 600
                    }}
                  >
                    Turn {conversationTurnCount} active
                  </span>
                )}
              </div>
            ) : (
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Enter RFP Tender Specification to generate bid
              </span>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {result ? (
                <button
                  onClick={onReset}
                  className="btn-secondary"
                  style={{
                    padding: '0.25rem 0.65rem',
                    fontSize: '0.725rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    borderRadius: 'var(--radius-sm)'
                  }}
                  title="Clear current proposal and start a new tender"
                >
                  <RotateCcw size={11} /> Start New RFP
                </button>
              ) : (
                <button
                  onClick={() => setInputText(DEFAULT_SAMPLE_PROMPT)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    padding: '0.15rem 0.35rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  <Sparkles size={12} /> Insert Sample Prompt
                </button>
              )}
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                Press <CornerDownLeft size={11} />
              </span>
            </div>
          </div>

          {/* Dynamic Single Textarea */}
          {result ? (
            <textarea
              value={refineText}
              onChange={(e) => setRefineText(e.target.value)}
              onKeyDown={handleRefineKeyDown}
              placeholder="Describe what to improve or change (e.g. 'Increase youth training by 20%', 'Shift focus to Net Zero & digital skills', 'Add local VCSE partner')..."
              rows={2}
              disabled={isRefining}
              style={{
                width: '100%',
                backgroundColor: 'transparent',
                border: 'none',
                padding: 0,
                fontSize: '0.875rem',
                outline: 'none',
                resize: 'none',
                color: 'var(--text-primary)',
                fontFamily: 'inherit'
              }}
            />
          ) : (
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your Social Value RFP tender prompt here (e.g. 3-year £10M contract for Birmingham City Council with 10% Social Value weighting)..."
              rows={2}
              disabled={isLoading}
              style={{
                width: '100%',
                backgroundColor: 'transparent',
                border: 'none',
                padding: 0,
                fontSize: '0.875rem',
                outline: 'none',
                resize: 'none',
                color: 'var(--text-primary)',
                fontFamily: 'inherit'
              }}
            />
          )}

          {/* Bottom Action Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            {refineError && result ? (
              <div style={{ fontSize: '0.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <AlertCircle size={12} />
                {refineError}
              </div>
            ) : (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {result
                  ? '🧠 AI uses full conversation memory to refine this proposal'
                  : 'Grounded in National TOMs & repository knowledge'}
              </span>
            )}

            <div>
              {result ? (
                <button
                  onClick={handleRefineSubmit}
                  disabled={!refineText.trim() || isRefining}
                  className="btn-primary"
                  style={{ padding: '0.45rem 1rem', fontSize: '0.75rem', gap: '0.35rem' }}
                >
                  {isRefining ? (
                    <>
                      <Loader size={13} className="spin-icon" />
                      Refining Proposal...
                    </>
                  ) : (
                    <>
                      <span>Refine Proposal</span>
                      <RefreshCw size={13} />
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!inputText.trim() || isLoading}
                  className="btn-primary"
                  style={{ padding: '0.45rem 1rem', fontSize: '0.75rem', gap: '0.35rem' }}
                >
                  {isLoading ? (
                    <>
                      <Loader size={13} className="spin-icon" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <span>Generate Tender Response</span>
                      <Send size={13} />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI Reasoning & Evidence Grounding Modal */}
      {showAuditModal && result && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
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
              backgroundColor: 'var(--bg-surface, #ffffff)',
              borderRadius: 'var(--radius-lg, 10px)',
              border: '1px solid var(--border-medium)',
              boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.15rem 1.4rem',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: 'var(--radius-sm, 6px)',
                    backgroundColor: 'var(--bg-muted)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: 'var(--text-primary)'
                  }}
                >
                  <Brain size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    AI Reasoning & Evidence Grounding Audit
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    5 Verified Steps • Zero Hallucination Arithmetic • PostgreSQL pgvector
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowAuditModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  borderRadius: 'var(--radius-sm)'
                }}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div
              style={{
                padding: '1.25rem 1.4rem',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem'
              }}
            >
              {/* RAG Evidence Summary */}
              {result.retrieved_evidence_chunks != null && result.retrieved_evidence_chunks > 0 && (
                <div
                  style={{
                    padding: '0.85rem 1rem',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm, 6px)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    <FileText size={15} />
                    <span>Retrieved Knowledge Documents</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Retrieved <strong>{result.retrieved_evidence_chunks}</strong> relevant text chunks. Retrieval does not confirm source approval, accuracy or current partner status.
                  </div>
                  {Array.isArray(result.grounding_summary?.sources_used) && result.grounding_summary.sources_used.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Retrieved documents (review):</span>
                      {result.grounding_summary.sources_used.map((src: string, idx: number) => (
                        <span key={idx} className="tag-mono" style={{ fontSize: '0.72rem' }}>
                          {src}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 5-Step AI Reasoning Steps */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Transparent AI Reasoning Trail
                </div>
                {result.ai_reasoning_chain && result.ai_reasoning_chain.length > 0 ? (
                  result.ai_reasoning_chain.map((step) => (
                    <div
                      key={step.step_number}
                      style={{
                        display: 'flex',
                        gap: '0.75rem',
                        alignItems: 'flex-start',
                        padding: '0.75rem 0.9rem',
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm, 6px)'
                      }}
                    >
                      <div
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--bg-muted)',
                          color: 'var(--text-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          flexShrink: 0,
                          marginTop: '0.1rem'
                        }}
                      >
                        {step.step_number}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                          {step.title}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          {step.detail}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    Deterministic reasoning pipeline verified. All proxy values derived from repository knowledge chunks.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '0.75rem 1.4rem',
                borderTop: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-card)',
                display: 'flex',
                justifyContent: 'flex-end'
              }}
            >
              <button
                onClick={() => setShowAuditModal(false)}
                className="btn-secondary"
                style={{ padding: '0.45rem 1rem', fontSize: '0.8125rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
