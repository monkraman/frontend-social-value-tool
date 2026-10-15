import React, { useState } from 'react';
import type { ResponseGenerationResult } from '../types';
import { Send, CornerDownLeft, Download, RotateCcw, AlertCircle, FileText, Search } from 'lucide-react';
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
  onReset
}) => {
  const [inputText, setInputText] = useState(currentPrompt);
  const [prevPrompt, setPrevPrompt] = useState(currentPrompt);
  const [activePackage, setActivePackage] = useState<'core' | 'enhanced' | 'localised'>('core');

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
    onSendPrompt(inputText.trim());
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

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
      {/* Feedback State: Non-RFP Prompt or Guidance */}
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

      {/* If No Result Generated Yet and No Feedback: Empty State */}
      {!result && !isLoading && !promptFeedback && (
        <div style={{ textAlign: 'center', padding: '4rem 1rem 2rem 1rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Social Value RFP Prompt Studio
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '580px', margin: '0 auto 1.5rem auto' }}>
            Enter your tender requirements below in natural language or click the template button to auto-fill the client specification.
          </p>
          <button
            onClick={() => setInputText(DEFAULT_SAMPLE_PROMPT)}
            className="btn-secondary"
            style={{ fontSize: '0.8125rem' }}
          >
            Insert Client Sample Prompt
          </button>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
            Synthesizing Social Value Response Packages...
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Retrieving grounded past wins and calculating National TOMs proxies.
          </div>
        </div>
      )}

      {/* Render Response Result */}
      {result && !isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* User Prompt Message with Dynamic Extracted Badges */}
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
                Submitted Prompt
              </span>
              <span className="tag-mono" style={{ fontSize: '0.7rem' }}>
                Grounded in RFP Intent
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
              <span className="tag-mono">Weighting: {result.opportunity.social_value_weighting_percent}%</span>
              {result.opportunity.priorities && result.opportunity.priorities.length > 0 && (
                <span className="tag-mono">Themes: {result.opportunity.priorities.join(', ')}</span>
              )}
            </div>
          </div>

          {/* Tender Summary Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              padding: '1rem 1.25rem',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem'
            }}
          >
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Client:</span>{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{result.opportunity.client}</strong> ({result.opportunity.location})
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Contract Value:</span>{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{formatGbp(result.opportunity.contract_value_gbp)}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Duration:</span>{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{result.opportunity.duration_years} Years</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Target:</span>{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{formatGbp(targetAmount)} ({result.opportunity.social_value_weighting_percent}%)</strong>
            </div>
          </div>

          {/* Package Switcher Tabs */}
          <div style={{ display: 'flex', border: 'none', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.35rem', backgroundColor: 'var(--bg-surface)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <button
                onClick={() => setActivePackage('core')}
                style={{
                  padding: '0.4rem 0.85rem',
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
                  padding: '0.4rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: activePackage === 'enhanced' ? 'var(--bg-muted)' : 'transparent',
                  color: activePackage === 'enhanced' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontSize: '0.8125rem',
                  fontWeight: activePackage === 'enhanced' ? 600 : 400,
                  cursor: 'pointer'
                }}
              >
                Template 2: Enhanced (Competitive)
              </button>
              <button
                onClick={() => setActivePackage('localised')}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: activePackage === 'localised' ? 'var(--bg-muted)' : 'transparent',
                  color: activePackage === 'localised' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontSize: '0.8125rem',
                  fontWeight: activePackage === 'localised' ? 600 : 400,
                  cursor: 'pointer'
                }}
              >
                Template 3: Localised (Regional)
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {onExportJson && (
                <button onClick={onExportJson} className="btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}>
                  <Download size={13} /> Export JSON
                </button>
              )}
              <button onClick={onReset} className="btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}>
                <RotateCcw size={13} /> Clear
              </button>
            </div>
          </div>

          {/* Active Package Card */}
          {currentPkg && (
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>{currentPkg.name}</h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{currentPkg.rationale}</p>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{formatGbp(currentTotal)}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {formatPercent(currentPercent)} of contract {currentTotal >= targetAmount ? '• Target Achieved' : '• Below Target'}
                  </div>
                </div>
              </div>

              {/* Initiatives List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                {currentPkg.initiatives.map((init, idx) => {
                  const calc = currentCalc?.initiatives[idx];
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {init.toms_metric_code && <span className="tag-mono">{init.toms_metric_code}</span>}
                          <strong style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{init.name}</strong>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {init.partner ? `Partner: ${init.partner}` : 'Partner Unassigned'}
                        </span>
                      </div>

                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                        {init.description}
                      </p>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <div>Delivery: {init.delivery_mechanism} • Target: {init.target_beneficiaries}</div>
                        {calc && <div className="tag-mono">{calc.calculation_formula}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Assumptions & Action Items */}
              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', fontSize: '0.8125rem' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Pre-Submission Action Items</div>
                  <ul style={{ paddingLeft: '1.1rem', color: 'var(--text-secondary)' }}>
                    {result.validation_required.map((v, i) => (
                      <li key={i}>{v}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Underlying Assumptions</div>
                  <ul style={{ paddingLeft: '1.1rem', color: 'var(--text-secondary)' }}>
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
                padding: '0.15rem 0.35rem'
              }}
            >
              + Insert Client Prompt Template
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
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.75rem' }}
            >
              {isLoading ? (
                <>
                  <span className="spin-icon">⚙</span> Running...
                </>
              ) : (
                <>
                  <span>Submit Prompt</span>
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
