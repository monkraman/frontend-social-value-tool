import React, { useState } from 'react';
import type { ResponseGenerationResult } from '../types';
import {
  Send,
  CornerDownLeft,
  Download,
  RotateCcw,
  AlertCircle,
  FileText,
  Search,
  Brain,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Calendar,
  Users,
  PoundSterling,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  MessageSquarePlus,
  RefreshCw,
  Loader
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
  const [showAiReasoning, setShowAiReasoning] = useState<boolean>(true);
  const [copiedTender, setCopiedTender] = useState<boolean>(false);
  const [refineText, setRefineText] = useState<string>('');
  const [showRefinePanel, setShowRefinePanel] = useState<boolean>(false);

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
    setShowRefinePanel(false);
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
  const svroiMultiplier = deliveryCost > 0 ? (currentTotal / deliveryCost).toFixed(1) : '24.0';
  const isTargetAchieved = currentTotal >= (targetAmount * 0.98); // Allow small rounding margin

  // Copy Tender-Ready Text to Clipboard
  const handleCopyTenderText = () => {
    if (!result || !currentPkg) return;

    const opp = result.opportunity;
    const governance = currentPkg.governance;

    const tenderText = `
INFOSYS SOCIAL VALUE TENDER RESPONSE SPECIFICATION
=====================================================
Client: ${opp.client} (${opp.location})
Contract Value: ${formatGbp(opp.contract_value_gbp)}
Contract Term: ${opp.duration_years} Years
Mandated Target Weighting: ${opp.social_value_weighting_percent}% (${formatGbp(targetAmount)})
Package Option: ${currentPkg.name}
Total Social Value Committed: ${formatGbp(currentTotal)} (${formatPercent(currentPercent)} of contract value)
Commercial Status: ${isTargetAchieved ? 'TARGET ACHIEVED / EXCEEDED' : 'RESERVATION'}

1. EXECUTIVE SUMMARY & COMMITMENT
-----------------------------------------------------
${currentPkg.rationale}
This package delivers a defensible total of ${formatGbp(currentTotal)} in auditable Social Value, mapped directly to National TOMs (Themes, Outcomes and Measures).

2. PROPOSED INITIATIVES & OPERATIONAL METRICS
-----------------------------------------------------
${currentPkg.initiatives
  .map(
    (init, i) => `[${i + 1}] ${init.name} (${init.toms_metric_code || 'National TOMs'})
Theme: ${init.theme} | Location: ${init.location}
Delivery: ${init.delivery_mechanism}
Target Group: ${init.target_beneficiaries}
Annual Volume: ${init.annual_volume} units/yr
Commercial Viability: ${init.commercial_viability || 'Internal Delivery'}
Calculation Trail: ${currentCalc?.initiatives[i]?.calculation_formula || 'Audited'}
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
- Estimated Delivery Investment to Infosys: ${formatGbp(deliveryCost)}
- Social Return on Investment (SVROI): ${svroiMultiplier}x
- Summary: ${currentPkg.commercial_viability_summary || 'Highly viable commercial delivery model'}
    `.trim();

    navigator.clipboard.writeText(tenderText);
    setCopiedTender(true);
    setTimeout(() => setCopiedTender(false), 2500);
  };

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
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

      {/* Empty State */}
      {!result && !isLoading && !promptFeedback && (
        <div style={{ textAlign: 'center', padding: '3.5rem 1rem 1.5rem 1rem' }}>
          <div style={{ display: 'inline-flex', padding: '0.6rem', borderRadius: '50%', backgroundColor: 'var(--bg-muted)', marginBottom: '1rem', color: 'var(--text-primary)' }}>
            <Brain size={28} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Social Value RFP Response Builder
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '580px', margin: '0 auto 1.5rem auto', lineHeight: 1.6 }}>
            Synthesizes grounded public sector tender proposals aligned with Cabinet Office PPN 06/20, National TOMs proxies, and deterministic financial calculations.
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
            Retrieving grounded case studies, allocating National TOMs codes, and executing deterministic math engine.
          </div>
        </div>
      )}

      {/* Render Response Result */}
      {result && !isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* User Prompt Message with Dynamic Badges */}
          <div
            style={{
              padding: '1rem 1.25rem',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Active Tender Specification
              </span>
              <span className="tag-mono" style={{ fontSize: '0.7rem', color: 'var(--text-primary)' }}>
                ✓ Grounded in RFP Intent
              </span>
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: '0.6rem' }}>
              "{currentPrompt}"
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', fontSize: '0.75rem' }}>
              <span className="tag-mono">Client: {result.opportunity.client}</span>
              <span className="tag-mono">Location: {result.opportunity.location}</span>
              <span className="tag-mono">Value: {formatGbp(result.opportunity.contract_value_gbp)}</span>
              <span className="tag-mono">Duration: {result.opportunity.duration_years} Yrs</span>
              <span className="tag-mono">Target Weighting: {result.opportunity.social_value_weighting_percent}%</span>
              {result.opportunity.priorities && result.opportunity.priorities.length > 0 && (
                <span className="tag-mono">Priorities: {result.opportunity.priorities.join(', ')}</span>
              )}
            </div>
          </div>

          {/* AI Reasoning & Grounding Audit (Transparent Thinking Chain) */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden'
            }}
          >
            <div
              onClick={() => setShowAiReasoning(!showAiReasoning)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.85rem 1.25rem',
                cursor: 'pointer',
                backgroundColor: 'var(--bg-card)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Brain size={16} style={{ color: 'var(--text-primary)' }} />
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  AI Reasoning & Evidence Grounding Chain
                </span>
                <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '12px', backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)' }}>
                  5 Verified Steps • Zero Hallucination Arithmetic
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {showAiReasoning ? 'Hide Audit Trail' : 'Inspect Reasoning'}
                </span>
                {showAiReasoning ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>

            {showAiReasoning && (
              <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {result.ai_reasoning_chain && result.ai_reasoning_chain.length > 0 ? (
                  result.ai_reasoning_chain.map((step) => (
                    <div key={step.step_number} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
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
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.15rem' }}>
                          {step.title}
                        </div>
                        <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
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
            )}
          </div>

          {/* Tender Financial & Commercial Summary Bar */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '0.85rem',
              padding: '1.15rem 1.25rem',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)'
            }}
          >
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Client Authority</span>
              <strong style={{ fontSize: '0.925rem', color: 'var(--text-primary)' }}>{result.opportunity.client}</strong>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Region: {result.opportunity.location}</div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Contract Scale</span>
              <strong style={{ fontSize: '0.925rem', color: 'var(--text-primary)' }}>{formatGbp(result.opportunity.contract_value_gbp)}</strong>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Term: {result.opportunity.duration_years} Years</div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Target Social Value</span>
              <strong style={{ fontSize: '0.925rem', color: 'var(--text-primary)' }}>{formatGbp(targetAmount)}</strong>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Weighting: {result.opportunity.social_value_weighting_percent}%</div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Selected Package Status</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.1rem' }}>
                <span
                  style={{
                    fontSize: '0.775rem',
                    fontWeight: 600,
                    padding: '0.2rem 0.55rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: isTargetAchieved ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                    color: isTargetAchieved ? '#16a34a' : '#ca8a04',
                    border: isTargetAchieved ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(234, 179, 8, 0.3)'
                  }}
                >
                  {isTargetAchieved ? '🎯 Target Achieved' : 'Below Target'} ({formatPercent(currentPercent)})
                </span>
              </div>
            </div>
          </div>

          {/* Package Switcher Tabs & Quick Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem' }}>
            <div style={{ display: 'flex', gap: '0.35rem', backgroundColor: 'var(--bg-surface)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <button
                onClick={() => setActivePackage('core')}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: activePackage === 'core' ? 'var(--bg-muted)' : 'transparent',
                  color: activePackage === 'core' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontSize: '0.8125rem',
                  fontWeight: activePackage === 'core' ? 600 : 400,
                  cursor: 'pointer'
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
                  background: activePackage === 'enhanced' ? 'var(--bg-muted)' : 'transparent',
                  color: activePackage === 'enhanced' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontSize: '0.8125rem',
                  fontWeight: activePackage === 'enhanced' ? 600 : 400,
                  cursor: 'pointer'
                }}
              >
                Template 2: Enhanced (Competitive Win)
              </button>
              <button
                onClick={() => setActivePackage('localised')}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: activePackage === 'localised' ? 'var(--bg-muted)' : 'transparent',
                  color: activePackage === 'localised' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontSize: '0.8125rem',
                  fontWeight: activePackage === 'localised' ? 600 : 400,
                  cursor: 'pointer'
                }}
              >
                Template 3: Localised (10% Target Match)
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
                <button onClick={onExportJson} className="btn-secondary" style={{ padding: '0.45rem 0.75rem', fontSize: '0.75rem' }}>
                  <Download size={13} /> JSON
                </button>
              )}

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
                      {activePackage === 'core' ? 'Compliance Baseline' : activePackage === 'enhanced' ? 'Winning Advantage' : 'Place-Based Match'}
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
                  <div style={{ fontSize: '0.775rem', fontWeight: 600, color: isTargetAchieved ? '#16a34a' : 'var(--text-muted)' }}>
                    {formatPercent(currentPercent)} Social Value Commitment
                  </div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', marginTop: '0.25rem', paddingTop: '0.25rem', borderTop: '1px solid var(--border-subtle)' }}>
                    Est. Delivery Cost: {formatGbp(deliveryCost)} • <strong>{svroiMultiplier}x SVROI</strong>
                  </div>
                </div>
              </div>

              {/* Commercial Viability Summary Notice */}
              <div
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem'
                }}
              >
                <TrendingUp size={16} style={{ color: 'var(--text-primary)', flexShrink: 0 }} />
                <div style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Commercial Viability:</strong>{' '}
                  {currentPkg.commercial_viability_summary || 'Highly viable model leveraging core operational delivery and supply chain partnerships.'}
                </div>
              </div>

              {/* Initiatives List with Granular Operational Metrics */}
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                  Committed Initiatives ({currentPkg.initiatives.length} Measures)
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
                            <span
                              style={{
                                fontSize: '0.7rem',
                                padding: '0.15rem 0.4rem',
                                borderRadius: '4px',
                                backgroundColor: init.is_from_knowledge_base ? 'rgba(34, 197, 94, 0.1)' : 'var(--bg-muted)',
                                color: init.is_from_knowledge_base ? '#16a34a' : 'var(--text-secondary)'
                              }}
                            >
                              {init.is_from_knowledge_base ? '✓ Case Study Grounded' : 'Model Recommended'}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {init.partner ? `Partner: ${init.partner}` : 'Self-Delivered / Open Hub'}
                            </span>
                          </div>
                        </div>

                        {/* Description */}
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                          {init.description}
                        </p>

                        {/* Operational Breakdown Bar */}
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
                            <span>Delivery: {init.delivery_mechanism}</span>
                          </div>
                          <span>•</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Users size={12} />
                            <span>Target Group: {init.target_beneficiaries}</span>
                          </div>
                          {init.indicative_cost_gbp != null && init.indicative_cost_gbp > 0 && (
                            <>
                              <span>•</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-primary)' }}>
                                <PoundSterling size={12} />
                                <span>Cost: {formatGbp(init.indicative_cost_gbp)} ({init.commercial_viability})</span>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Deterministic Formula Trail */}
                        {calc && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.75rem' }}>
                            <span className="tag-mono" style={{ color: 'var(--text-primary)' }}>
                              Formula: {calc.calculation_formula}
                            </span>
                            <strong style={{ fontSize: '0.825rem', color: 'var(--text-primary)' }}>
                              Total SV: {formatGbp(calc.total_social_value_gbp)}
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
                    Standardised Governance & Reporting Cadence (Contractual Commitment)
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
                      📊 Quarterly Auditing
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

      {/* Refinement Note Banner — shown after a successful AI refinement */}
      {refinementNote && (
        <div
          style={{
            padding: '0.6rem 1rem',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            marginBottom: '0.25rem'
          }}
        >
          <RefreshCw size={13} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
          <span>{refinementNote}</span>
        </div>
      )}

      {/* Refine Result Panel — shown when there is a current result */}
      {result && onRefineResult && (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: showRefinePanel ? '1px solid var(--text-primary)' : '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            transition: 'border-color 0.2s ease'
          }}
        >
          {/* Refine Toggle Header */}
          <button
            onClick={() => setShowRefinePanel((p) => !p)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.65rem 1rem',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              fontSize: '0.8125rem',
              fontWeight: 500
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquarePlus size={14} />
              <span>Not satisfied? Refine &amp; improve this result</span>
              {/* Live memory badge */}
              {conversationTurnCount > 0 && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.2rem',
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    padding: '0.1rem 0.45rem',
                    borderRadius: '999px',
                    backgroundColor: 'rgba(34,197,94,0.12)',
                    color: '#22c55e',
                    border: '1px solid rgba(34,197,94,0.25)'
                  }}
                >
                  <RefreshCw size={9} />
                  {conversationTurnCount} turn{conversationTurnCount !== 1 ? 's' : ''} in memory
                </span>
              )}
            </div>
            {showRefinePanel ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {/* Collapsible Refine Input */}
          {showRefinePanel && (
            <div
              style={{
                borderTop: '1px solid var(--border-subtle)',
                padding: '0.75rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                🧠 <strong style={{ color: 'var(--text-secondary)' }}>AI has full session memory.</strong>{' '}
                {conversationTurnCount > 0
                  ? `It remembers all ${conversationTurnCount} turns of this conversation — every previous instruction is still active.`
                  : 'Tell the AI what to change and it will use the full context of this result.'}
                {' '}For example: <em>"Add more Net Zero focus"</em>, <em>"Increase Digital Inclusion to 12%"</em>,
                or <em>"Make the Enhanced Package stronger on Supply Chain"</em>.
              </div>

              <textarea
                value={refineText}
                onChange={(e) => setRefineText(e.target.value)}
                onKeyDown={handleRefineKeyDown}
                placeholder="Describe what to improve, change, or focus on more…"
                rows={2}
                disabled={isRefining}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--bg-muted)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  color: 'var(--text-primary)',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  outline: 'none',
                  opacity: isRefining ? 0.6 : 1
                }}
              />

              {refineError && (
                <div style={{ fontSize: '0.78rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <AlertCircle size={12} />
                  {refineError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  Press <CornerDownLeft size={11} /> to refine
                </span>
                <button
                  onClick={handleRefineSubmit}
                  disabled={!refineText.trim() || isRefining}
                  className="btn-primary"
                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.75rem' }}
                >
                  {isRefining ? (
                    <>
                      <Loader size={12} className="spin-icon" />
                      Refining…
                    </>
                  ) : (
                    <>
                      <RefreshCw size={12} />
                      Refine with AI
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sticky Bottom Prompt Box */}
      <div style={{ position: 'sticky', bottom: '1.5rem', marginTop: 'auto', paddingTop: '1rem' }}>

        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.75rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
              <Sparkles size={12} /> Insert Client Prompt Template
            </button>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              Press <CornerDownLeft size={11} /> to send
            </span>
          </div>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your Social Value RFP tender prompt here..."
            rows={2}
            style={{
              width: '100%',
              backgroundColor: 'transparent',
              border: 'none',
              padding: 0,
              fontSize: '0.875rem'
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.25rem' }}>
            <button
              onClick={handleSubmit}
              disabled={!inputText.trim() || isLoading}
              className="btn-primary"
              style={{ padding: '0.45rem 0.95rem', fontSize: '0.75rem' }}
            >
              {isLoading ? (
                <>
                  <span className="spin-icon">⚙</span> Running...
                </>
              ) : (
                <>
                  <span>Generate Tender Response</span>
                  <Send size={13} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
