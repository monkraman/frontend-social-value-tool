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
  Copy,
  Check,
  Calendar,
  Users,
  PoundSterling,
  ShieldCheck,
  MessageSquarePlus,
  RefreshCw,
  Loader,
  X,
  ListChecks,
  ScrollText,
  PencilLine,
  MapPin,
  Handshake,
  UserCheck,
  CalendarClock,
  BarChart3,
  TrendingUp,
  ClipboardCheck,
  Info
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
  // Thread holds (brief, reply) pairs: the first pair is the original draft, each later pair a revision
  const revisionCount = Math.max(0, Math.floor(conversationTurnCount / 2) - 1);

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
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            marginTop: '1rem'
          }}
          className="card-accent"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', fontWeight: 600 }}>
            <Info size={17} style={{ color: 'var(--color-primary)' }} />
            <span>This doesn't look like a tender brief yet</span>
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontStyle: 'italic', padding: '0.55rem 0.85rem', backgroundColor: 'var(--color-primary-subtle)', borderLeft: '3px solid var(--color-primary-border)', borderRadius: 'var(--radius-sm)' }}>
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
              Use a sample tender brief
            </button>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('documents')}
                className="btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}
              >
                <FileText size={12} /> Open Repository
              </button>
            )}
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('search')}
                className="btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}
              >
                <Search size={12} /> Open Evidence Search
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
              <span>We couldn't generate this response</span>
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
              Stopped safely
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
            To keep your bid accurate, the tool stopped rather than fill the gaps with unverified initiatives or costs.
          </p>

          <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
            {onRetry && (
              <button
                onClick={onRetry}
                className="btn-primary"
                style={{ fontSize: '0.75rem', padding: '0.4rem 0.85rem', gap: '0.35rem' }}
              >
                <RefreshCw size={13} /> Try again
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
        <div style={{ textAlign: 'center', padding: '3.5rem 1rem 1.5rem 1rem', animation: 'fadeIn 0.25s ease' }}>
          <div className="icon-badge" style={{ width: '56px', height: '56px', marginBottom: '1.1rem' }}>
            <ScrollText size={26} />
          </div>
          <div className="eyebrow" style={{ marginBottom: '0.5rem' }}>Bid Studio</div>
          <h1 style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.6rem', lineHeight: 1.2 }}>
            Social Value RFP Response Builder
          </h1>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 1.75rem auto', lineHeight: 1.65 }}>
            Drafts initiative options against your stated priorities, shows POC proxy calculations, and highlights the evidence and delivery checks needed before a bid commitment.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
              gap: '0.75rem',
              maxWidth: '760px',
              margin: '0 auto 1.75rem auto',
              textAlign: 'left'
            }}
          >
            {[
              { n: 1, title: 'Describe the tender', body: 'Client, contract value, term, weighting and the outcomes they care about.' },
              { n: 2, title: 'Compare three options', body: 'Core, expanded and place-based packages, each with its own figures.' },
              { n: 3, title: 'Refine and reuse', body: 'Ask for changes, check the evidence, then copy the draft into your bid.' }
            ].map((step) => (
              <div
                key={step.n}
                style={{
                  padding: '0.9rem 1rem',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderTop: '3px solid var(--color-primary)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                  <span
                    className="icon-badge"
                    style={{ width: '22px', height: '22px', fontSize: '0.72rem', fontWeight: 700 }}
                  >
                    {step.n}
                  </span>
                  <strong style={{ fontSize: '0.875rem' }}>{step.title}</strong>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{step.body}</div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setInputText(DEFAULT_SAMPLE_PROMPT)}
            className="btn-secondary"
            style={{ fontSize: '0.8125rem', gap: '0.4rem' }}
          >
            <FileText size={14} /> Use a sample tender brief
          </button>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
          <div className="icon-badge" style={{ width: '48px', height: '48px', marginBottom: '1rem' }}>
            <Loader size={22} className="spin-icon" />
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
            Preparing your response options…
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Reading the repository, matching National TOMs measures and working out illustrative values.
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
                backgroundColor: 'var(--color-primary-subtle)',
                border: '1px solid var(--color-primary-border)',
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
                  backgroundColor: 'var(--btn-primary-bg)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '0.1rem'
                }}
              >
                <PencilLine size={14} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                    {revisionCount > 1 ? `Revision ${revisionCount} applied` : 'Proposal updated with your feedback'}
                  </strong>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      padding: '0.12rem 0.5rem',
                      borderRadius: '999px',
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--color-primary-border)',
                      color: 'var(--color-primary-text)',
                      fontWeight: 600
                    }}
                  >
                    Earlier changes kept
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
                  <h2 style={{ fontSize: '1.35rem', color: 'var(--text-primary)', lineHeight: 1.25 }}>
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

              <button onClick={onReset} className="btn-secondary" style={{ padding: '0.45rem 0.75rem', fontSize: '0.75rem' }}>
                <RotateCcw size={13} /> Clear
              </button>
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
                  <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>Proposed initiatives</h3>
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
                  <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>
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
        </div>
      )}

      {/* Single Intelligent Sticky Bottom Input (Zero Duplicate Box Confusion) */}
      <div style={{ position: 'sticky', bottom: '1.5rem', marginTop: 'auto', paddingTop: '1rem' }}>
        <div
          className="composer"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.9rem 1.15rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem',
            boxShadow: 'var(--shadow-md)'
          }}
        >
          {/* Top Header inside Input Box */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            {result ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <MessageSquarePlus size={15} style={{ color: 'var(--color-primary)' }} />
                  Ask for changes to this proposal
                </span>
                {conversationTurnCount > 0 && (
                  <span
                    style={{
                      fontSize: '0.68rem',
                      padding: '0.1rem 0.45rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--color-primary-subtle)',
                      color: 'var(--color-primary-text)',
                      border: '1px solid var(--color-primary-border)',
                      fontWeight: 600
                    }}
                  >
                    {revisionCount > 0 ? `Revision ${revisionCount}` : 'First draft'}
                  </span>
                )}
              </div>
            ) : (
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Describe the tender you're responding to
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
                  <RotateCcw size={11} /> Start a new bid
                </button>
              ) : (
                <button
                  onClick={() => setInputText(DEFAULT_SAMPLE_PROMPT)}
                  className="btn-link"
                >
                  <FileText size={12} /> Use sample brief
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
              placeholder="What should change? For example: increase youth training by 20%, shift the focus to net zero and digital skills, or add a local VCSE partner."
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
              placeholder="For example: a 3-year £10M contract for Birmingham City Council with a 10% social value weighting, focused on digital inclusion and youth employment."
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
                  ? 'Your earlier requests are remembered as you refine'
                  : 'Based on National TOMs and your repository'}
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
                      Updating proposal…
                    </>
                  ) : (
                    <>
                      <span>Update proposal</span>
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
                      Preparing…
                    </>
                  ) : (
                    <>
                      <span>Generate response</span>
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
                <div className="icon-badge" style={{ width: '36px', height: '36px' }}>
                  <ListChecks size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    How this proposal was built
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    The documents consulted and the steps behind each figure
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
                    <FileText size={15} style={{ color: 'var(--color-primary)' }} />
                    <span>Documents consulted</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    <strong>{result.retrieved_evidence_chunks}</strong> relevant passages were found. Finding a passage doesn't confirm the source is approved, accurate or that a partner is still current.
                  </div>
                  {Array.isArray(result.grounding_summary?.sources_used) && result.grounding_summary.sources_used.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Documents to review:</span>
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
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Step by step
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
                          backgroundColor: 'var(--btn-primary-bg)',
                          color: '#FFFFFF',
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
                    Figures are calculated with fixed rules from repository content.
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
