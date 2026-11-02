import React, { useState, useEffect, useMemo } from 'react';
import { recommendOpportunities } from '../api/client';
import { useToast } from '../context/ToastContext';
import { Pagination } from './Pagination';
import { formatGbp, formatPercent } from '../utils/formatters';
import type {
  OpportunityRecommendRequest,
  OpportunityRecommendResponse,
  OpportunityRecommendationItem
} from '../types';
import {
  Sparkles,
  Search,
  Sliders,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Users,
  Leaf,
  Coins,
  MapPin,
  Calendar,
  PoundSterling,
  Percent,
  Copy,
  Check,
  List,
  LayoutGrid,
  FileCheck,
  Building,
  RotateCcw,
  Info
} from 'lucide-react';

export interface OpportunityFinderProps {
  onSendToBidStudio?: (promptText: string) => void;
}

interface ParsedPromptParams {
  contractValue: number;
  durationYears: number;
  weightingPercent: number;
  client: string;
  location: string;
  priorities: string;
  industry: string;
}

const SAMPLE_PRESETS: Array<{ label: string; prompt: string; region: string }> = [
  {
    label: 'Birmingham City Council — £10M / 3yr (10% SV)',
    region: 'Birmingham',
    prompt:
      'I need to build a Social Value bid response, for a 3-year contract of £10M with 10% Social Value weighting. The client Birmingham City Council in Birmingham wants the Social Value offer to address digital inclusion and youth employment. Based on: previous responses that have scored highly, what Infosys have delivered so far, approved partnerships in our repository, recognised frameworks for SVROI (National TOMS) and geographical location - build a template of initiatives we can present to the client that would achieve 10% SV, and the impact we can expect to deliver.'
  },
  {
    label: 'NHS Foundation Trust — £8M / 5yr (10% SV)',
    region: 'National UK',
    prompt:
      'I need to build a Social Value bid response for a 5-year contract of £8M with 10% Social Value weighting for an NHS Foundation Trust. The client wants the Social Value offer to address community digital health inclusion, staff wellbeing, and tackling economic inequality through local healthcare apprenticeships.'
  },
  {
    label: 'Manchester City Council — £5M / 4yr (10% SV)',
    region: 'Manchester',
    prompt:
      'I need to build a Social Value bid response for a 4-year contract of £5M with 10% Social Value weighting for Manchester City Council in Manchester. Priorities include green economy skills, carbon reduction in supply chains, and supporting local GM SMEs and VCSE providers.'
  },
  {
    label: 'Leeds Teaching Hospitals — £12M / 3yr (10% SV)',
    region: 'Leeds',
    prompt:
      'I need to build a Social Value bid response for a 3-year contract of £12M with 10% Social Value weighting for Leeds Teaching Hospitals in Leeds. The client requires quantifiable commitments targeting local youth training, ethical digital supply chain, and local charity volunteering.'
  }
];

export const OpportunityFinder: React.FC<OpportunityFinderProps> = ({ onSendToBidStudio }) => {
  const toast = useToast();

  // Mode: 'prompt' (natural language) vs 'fields' (structured parameters)
  const [inputMode, setInputMode] = useState<'prompt' | 'fields'>('prompt');
  const [promptText, setPromptText] = useState<string>(SAMPLE_PRESETS[0].prompt);

  // Structured fields state
  const [formData, setFormData] = useState<ParsedPromptParams>({
    contractValue: 10000000,
    durationYears: 3,
    weightingPercent: 10,
    client: 'Birmingham City Council',
    location: 'Birmingham',
    priorities: 'digital inclusion and youth employment',
    industry: 'IT & Digital Services'
  });

  // Results & UI State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [results, setResults] = useState<OpportunityRecommendResponse | null>(null);
  const [selectedInitiative, setSelectedInitiative] = useState<OpportunityRecommendationItem | null>(null);
  const [copiedBid, setCopiedBid] = useState<boolean>(false);

  // Table view & pagination
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);
  const [themeFilter, setThemeFilter] = useState<string>('All');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Helper: Extract parameters deterministically from natural language prompt
  const parsePrompt = (text: string): ParsedPromptParams => {
    let contractValue = 10000000;
    let durationYears = 3;
    let weightingPercent = 10;
    let client = 'Public Sector Client';
    let location = 'UK National';
    let priorities = 'local employment and skills';
    let industry = 'IT & Digital Services';

    // 1. Contract Value: e.g. £10M, £ 10m, £500k, 10 million
    const valMatch = text.match(/£\s*(\d+(?:\.\d+)?)\s*(m|million|k|thousand)?/i);
    if (valMatch) {
      const num = parseFloat(valMatch[1]);
      const unit = (valMatch[2] || '').toLowerCase();
      if (unit.startsWith('m')) contractValue = num * 1000000;
      else if (unit.startsWith('k')) contractValue = num * 1000;
      else if (num < 100) contractValue = num * 1000000;
      else contractValue = num;
    }

    // 2. Duration: e.g. 3-year, 5 years, 4 yrs
    const durMatch = text.match(/(\d+)\s*[- ]*(?:year|yr)/i);
    if (durMatch) {
      durationYears = parseInt(durMatch[1], 10);
    }

    // 3. Weighting: e.g. 10%, 15 %
    const weightMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);
    if (weightMatch) {
      weightingPercent = parseFloat(weightMatch[1]);
    }

    // 4. Location & Client extraction
    const lower = text.toLowerCase();
    if (lower.includes('birmingham')) {
      location = 'Birmingham';
      client = 'Birmingham City Council';
    } else if (lower.includes('manchester')) {
      location = 'Manchester';
      client = 'Manchester City Council';
    } else if (lower.includes('leeds')) {
      location = 'Leeds';
      client = 'Leeds City Council';
    } else if (lower.includes('london')) {
      location = 'London';
      client = 'Greater London Authority';
    } else if (lower.includes('bristol')) {
      location = 'Bristol';
      client = 'Bristol City Council';
    } else if (lower.includes('nhs')) {
      location = 'National UK';
      client = 'NHS Foundation Trust';
    }

    // 5. Priorities
    const priorityMatch = text.match(/address\s+([^.\n]+)/i) || text.match(/priorities\s+(?:include\s+)?([^.\n]+)/i);
    if (priorityMatch) {
      priorities = priorityMatch[1].trim();
    } else if (lower.includes('digital') || lower.includes('youth') || lower.includes('employment')) {
      priorities = 'digital inclusion, youth employment & skills';
    }

    return {
      contractValue,
      durationYears,
      weightingPercent,
      client,
      location,
      priorities,
      industry
    };
  };

  // Sync prompt changes with parsed parameters
  useEffect(() => {
    if (inputMode === 'prompt') {
      const parsed = parsePrompt(promptText);
      setFormData(parsed);
    }
  }, [promptText, inputMode]);

  // Execute recommendation search against TOMs catalog & partners
  const handleExecuteSearch = async () => {
    setIsLoading(true);
    try {
      const requestPayload: OpportunityRecommendRequest = {
        industry: formData.industry,
        contract_value_gbp: formData.contractValue,
        duration_years: formData.durationYears,
        target_weighting_percent: formData.weightingPercent,
        location: formData.location,
        focus_areas: formData.priorities ? [formData.priorities] : undefined
      };

      const resp = await recommendOpportunities(requestPayload);
      setResults(resp);
      setCurrentPage(1);
      toast.success(
        `Optimized ${resp.recommendations.length} TOMs commitments delivering ${formatGbp(
          resp.total_recommended_social_value_gbp
        )}!`
      );
    } catch (err: any) {
      toast.error('Search failed: ' + (err.message || 'Server error'));
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-run search on first mount
  useEffect(() => {
    handleExecuteSearch();
  }, []);

  // Filter recommendations
  const filteredRecs = useMemo(() => {
    if (!results) return [];
    return results.recommendations.filter((r) => {
      const matchesTheme =
        themeFilter === 'All' || r.theme.toLowerCase().includes(themeFilter.toLowerCase());
      const q = searchFilter.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.toms_code.toLowerCase().includes(q) ||
        r.initiative_name.toLowerCase().includes(q) ||
        r.ppn_mac.toLowerCase().includes(q) ||
        r.delivery_approach.toLowerCase().includes(q);
      return matchesTheme && matchesSearch;
    });
  }, [results, themeFilter, searchFilter]);

  // Paginated slice
  const paginatedRecs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecs.slice(start, start + pageSize);
  }, [filteredRecs, currentPage, pageSize]);

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [themeFilter, searchFilter]);

  // Theme badges
  const getThemeBadge = (theme: string) => {
    const t = theme.toLowerCase();
    if (t.includes('work') || t.includes('jobs') || t.includes('skills')) {
      return {
        icon: <Briefcase size={12} />,
        bg: 'rgba(59, 130, 246, 0.12)',
        color: '#2563eb',
        border: 'rgba(59, 130, 246, 0.25)',
        label: 'Work & Skills'
      };
    }
    if (t.includes('planet') || t.includes('environment') || t.includes('climate')) {
      return {
        icon: <Leaf size={12} />,
        bg: 'rgba(16, 185, 129, 0.12)',
        color: '#059669',
        border: 'rgba(16, 185, 129, 0.25)',
        label: 'Planet & Net Zero'
      };
    }
    if (t.includes('community') || t.includes('wellbeing') || t.includes('inclusion')) {
      return {
        icon: <Users size={12} />,
        bg: 'rgba(245, 158, 11, 0.12)',
        color: '#d97706',
        border: 'rgba(245, 158, 11, 0.25)',
        label: 'Community'
      };
    }
    return {
      icon: <Coins size={12} />,
      bg: 'rgba(139, 92, 246, 0.12)',
      color: '#7c3aed',
      border: 'rgba(139, 92, 246, 0.25)',
      label: 'Economy & SMEs'
    };
  };

  // Compile into 3-template prompt for Bid Studio
  const handleTransferToBidStudio = () => {
    const constructedPrompt =
      inputMode === 'prompt' && promptText.trim().length > 30
        ? promptText
        : `I need to build a Social Value bid response, for a ${formData.durationYears}-year contract of ${formatGbp(
          formData.contractValue
        )} with ${formData.weightingPercent}% Social Value weighting. The client ${formData.client} in ${formData.location
        } wants the Social Value offer to address ${formData.priorities
        }. Based on: previous responses that have scored highly, what Infosys have delivered so far, approved partnerships in our repository, recognised frameworks for SVROI (National TOMS) and geographical location - build a template of initiatives we can present to the client that would achieve ${formData.weightingPercent
        }% SV, and the impact we can expect to deliver.`;

    if (onSendToBidStudio) {
      onSendToBidStudio(constructedPrompt);
      toast.success('Opportunity strategy transferred to Bid Studio!');
    } else {
      navigator.clipboard.writeText(constructedPrompt);
      setCopiedBid(true);
      setTimeout(() => setCopiedBid(false), 3000);
      toast.info('Bid prompt copied to clipboard!');
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '1440px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sparkles size={14} style={{ color: 'var(--color-primary)' }} />
            <span>Tender Intelligence & TOMs Search</span>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            Tender Opportunity Finder
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.35rem', maxWidth: '820px' }}>
            Enter your tender requirements via natural language prompt or structured parameters. The engine matches
            National TOMs proxy values and regional partners to formulate high-scoring, audit-defensible bid commitments.
          </p>
        </div>

        {/* Transfer Button */}
        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
          <button
            onClick={handleTransferToBidStudio}
            className="btn-primary"
            style={{
              fontSize: '0.84rem',
              padding: '0.6rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}
          >
            {copiedBid ? <Check size={15} /> : <ArrowRight size={15} />}
            <span>{onSendToBidStudio ? 'Build 3 Templates in Bid Studio' : 'Copy Bid Prompt'}</span>
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────── */}
      {/* INPUT PANEL: PROMPT VS STRUCTURED FIELDS */}
      {/* ──────────────────────────────────────────────────────────────────────────── */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden'
        }}
      >
        {/* Mode Switcher Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface-subtle)',
            padding: '0.5rem 1rem',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}
        >
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              onClick={() => setInputMode('prompt')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.85rem',
                fontSize: '0.8rem',
                fontWeight: inputMode === 'prompt' ? 700 : 500,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                borderColor: inputMode === 'prompt' ? 'var(--color-primary)' : 'transparent',
                backgroundColor: inputMode === 'prompt' ? 'var(--bg-surface)' : 'transparent',
                color: inputMode === 'prompt' ? 'var(--color-primary)' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              <MessageSquare size={14} />
              <span>Prompt Search Mode</span>
            </button>

            <button
              onClick={() => setInputMode('fields')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.85rem',
                fontSize: '0.8rem',
                fontWeight: inputMode === 'fields' ? 700 : 500,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                borderColor: inputMode === 'fields' ? 'var(--color-primary)' : 'transparent',
                backgroundColor: inputMode === 'fields' ? 'var(--bg-surface)' : 'transparent',
                color: inputMode === 'fields' ? 'var(--color-primary)' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              <Sliders size={14} />
              <span>Structured Tender Fields</span>
            </button>
          </div>

          <button
            onClick={handleExecuteSearch}
            className="btn-primary"
            disabled={isLoading}
            style={{ fontSize: '0.82rem', padding: '0.45rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Sparkles size={14} className={isLoading ? 'spin-icon' : ''} />
            <span>{isLoading ? 'Analyzing Catalog…' : 'Find & Rank Opportunities'}</span>
          </button>
        </div>

        {/* Tab Body */}
        <div style={{ padding: '1.25rem' }}>
          {inputMode === 'prompt' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* Presets */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Quick Presets:
                </span>
                {SAMPLE_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setPromptText(p.prompt);
                    }}
                    style={{
                      padding: '0.25rem 0.6rem',
                      fontSize: '0.74rem',
                      borderRadius: '14px',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: promptText === p.prompt ? 'var(--color-primary-subtle)' : 'var(--bg-surface)',
                      color: promptText === p.prompt ? 'var(--color-primary)' : 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Textarea */}
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="Enter prompt e.g.: I need to build a Social Value bid response for a 3-year contract of £10M with 10% Social Value weighting for Birmingham City Council..."
                className="input-field"
                rows={4}
                style={{
                  width: '100%',
                  fontSize: '0.86rem',
                  lineHeight: 1.5,
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)'
                }}
              />

              {/* Live Parameters Preview */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.25rem',
                  flexWrap: 'wrap',
                  padding: '0.65rem 0.85rem',
                  backgroundColor: 'var(--bg-surface-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.78rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-secondary)' }}>
                  <Building size={13} style={{ color: 'var(--color-primary)' }} />
                  <span>Authority:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{formData.client}</strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-secondary)' }}>
                  <MapPin size={13} style={{ color: 'var(--color-primary)' }} />
                  <span>Region:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{formData.location}</strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-secondary)' }}>
                  <PoundSterling size={13} style={{ color: 'var(--color-primary)' }} />
                  <span>Value:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{formatGbp(formData.contractValue)}</strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-secondary)' }}>
                  <Calendar size={13} style={{ color: 'var(--color-primary)' }} />
                  <span>Duration:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{formData.durationYears} Years</strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-secondary)' }}>
                  <Percent size={13} style={{ color: 'var(--color-primary)' }} />
                  <span>Target SV:</span>
                  <strong style={{ color: '#059669' }}>
                    {formData.weightingPercent}% ({formatGbp(formData.contractValue * (formData.weightingPercent / 100))})
                  </strong>
                </div>
              </div>
            </div>
          ) : (
            /* Structured Fields Mode */
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem'
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                  Target Public Authority
                </label>
                <input
                  type="text"
                  value={formData.client}
                  onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.84rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                  Delivery Region / Location
                </label>
                <select
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.84rem' }}
                >
                  <option value="Birmingham">Birmingham</option>
                  <option value="Manchester">Manchester</option>
                  <option value="London">London</option>
                  <option value="Leeds">Leeds</option>
                  <option value="Bristol">Bristol</option>
                  <option value="National UK">National UK</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                  Total Contract Value (£)
                </label>
                <input
                  type="number"
                  value={formData.contractValue}
                  onChange={(e) => setFormData({ ...formData, contractValue: Number(e.target.value) })}
                  step="500000"
                  min="100000"
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.84rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                  Duration (Years)
                </label>
                <input
                  type="number"
                  value={formData.durationYears}
                  onChange={(e) => setFormData({ ...formData, durationYears: Number(e.target.value) })}
                  min="1"
                  max="10"
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.84rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                  Target Weighting (%)
                </label>
                <input
                  type="number"
                  value={formData.weightingPercent}
                  onChange={(e) => setFormData({ ...formData, weightingPercent: Number(e.target.value) })}
                  min="5"
                  max="30"
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.84rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                  Service Industry
                </label>
                <input
                  type="text"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.84rem' }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────── */}
      {/* RESULTS METRICS RIBBON */}
      {/* ──────────────────────────────────────────────────────────────────────────── */}
      {results && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            padding: '1.25rem',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Statutory SV Target</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              {formatGbp(results.target_social_value_gbp)}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {results.target_weighting_percent}% of {formatGbp(results.contract_value_gbp)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Delivered Social Value</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#059669', marginTop: '0.2rem' }}>
              {formatGbp(results.total_recommended_social_value_gbp)}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>
              {results.achieved_weighting_percent}% Achieved ({results.target_met ? 'Target Met ✓' : 'Shortfall'})
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Matched TOMs Measures</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              {results.recommendations.length} Initiatives
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Work, Planet, Community, Economy
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Delivery Location</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              {formData.location}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-primary)', fontWeight: 500 }}>
              Mapped with approved regional partners
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────── */}
      {/* INITIATIVES LIST & TABLE (USER REQUESTED LIST WITH PAGINATION) */}
      {/* ──────────────────────────────────────────────────────────────────────────── */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          padding: '1.25rem'
        }}
      >
        {/* Table Filters & View Switcher */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          {/* Theme Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginRight: '0.2rem' }}>
              Filter Theme:
            </span>
            {['All', 'Work', 'Planet', 'Community', 'Economy'].map((themeName) => {
              const isSelected = themeFilter === themeName;
              return (
                <button
                  key={themeName}
                  onClick={() => setThemeFilter(themeName)}
                  style={{
                    padding: '0.25rem 0.6rem',
                    borderRadius: '14px',
                    fontSize: '0.74rem',
                    fontWeight: isSelected ? 600 : 500,
                    border: '1px solid',
                    borderColor: isSelected ? 'var(--color-primary)' : 'var(--border-subtle)',
                    backgroundColor: isSelected ? 'var(--color-primary-subtle)' : 'transparent',
                    color: isSelected ? 'var(--color-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  {themeName}
                </button>
              );
            })}
          </div>

          {/* Right Toolbar: Search & View Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ position: 'relative', width: '220px' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '0.65rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-tertiary)'
                }}
              />
              <input
                type="text"
                placeholder="Search initiative, code…"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '2rem', width: '100%', fontSize: '0.8rem', padding: '0.3rem 0.5rem 0.3rem 2rem' }}
              />
            </div>

            {/* View Switcher: List vs Cards */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'var(--bg-surface-subtle)',
                padding: '2px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode('list')}
                title="List / Table View"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.25rem 0.55rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: viewMode === 'list' ? 'var(--bg-surface)' : 'transparent',
                  color: viewMode === 'list' ? 'var(--color-primary)' : 'var(--text-muted)',
                  boxShadow: viewMode === 'list' ? 'var(--shadow-sm)' : 'none',
                  cursor: 'pointer'
                }}
              >
                <List size={14} />
                <span>List</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                title="Cards View"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.25rem 0.55rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: viewMode === 'cards' ? 'var(--bg-surface)' : 'transparent',
                  color: viewMode === 'cards' ? 'var(--color-primary)' : 'var(--text-muted)',
                  boxShadow: viewMode === 'cards' ? 'var(--shadow-sm)' : 'none',
                  cursor: 'pointer'
                }}
              >
                <LayoutGrid size={14} />
                <span>Cards</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Sparkles size={24} className="spin-icon" style={{ margin: '0 auto 0.75rem' }} />
            <div>Optimizing TOMs initiatives for {formData.client}…</div>
          </div>
        ) : filteredRecs.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No initiatives match the filter.
          </div>
        ) : viewMode === 'list' ? (
          /* ── Clean List / Table Format ── */
          <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    borderBottom: '1px solid var(--border-subtle)',
                    fontSize: '0.74rem',
                    textTransform: 'uppercase',
                    color: 'var(--text-secondary)',
                    letterSpacing: '0.04em'
                  }}
                >
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>TOMS Code & Theme</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, minWidth: '220px' }}>Initiative Name</th>
                  <th style={{ padding: '0.75rem 0.85rem', fontWeight: 600 }}>Volume / Unit</th>
                  <th style={{ padding: '0.75rem 0.85rem', fontWeight: 600 }}>Unit Proxy (£)</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Total Social Value</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, minWidth: '200px' }}>Delivery Approach & Partner</th>
                  <th style={{ padding: '0.75rem 0.85rem', fontWeight: 600, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecs.map((rec, i) => {
                  const badge = getThemeBadge(rec.theme);
                  return (
                    <tr
                      key={i}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      {/* TOMs Code & Theme */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              fontFamily: 'monospace',
                              padding: '0.15rem 0.45rem',
                              backgroundColor: 'var(--bg-surface-subtle)',
                              borderRadius: '4px',
                              border: '1px solid var(--border-subtle)'
                            }}
                          >
                            {rec.toms_code}
                          </span>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              padding: '0.12rem 0.45rem',
                              backgroundColor: badge.bg,
                              color: badge.color,
                              border: `1px solid ${badge.border}`,
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            {badge.icon}
                            <span>{badge.label}</span>
                          </span>
                        </div>
                      </td>

                      {/* Initiative Title & PPN MAC */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                          {rec.initiative_name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          {rec.ppn_mac}
                        </div>
                      </td>

                      {/* Target Volume */}
                      <td style={{ padding: '0.85rem 0.85rem', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {rec.annual_volume} {rec.unit}/yr
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {rec.total_volume} {rec.unit} total ({rec.duration_years} yrs)
                        </div>
                      </td>

                      {/* Unit Proxy */}
                      <td style={{ padding: '0.85rem 0.85rem', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                          £{rec.unit_value_gbp.toLocaleString()} / {rec.unit}
                        </span>
                      </td>

                      {/* Total Social Value Return */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#059669' }}>
                          {formatGbp(rec.total_social_value_gbp)}
                        </div>
                      </td>

                      {/* Delivery Approach & Partner */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                          {rec.delivery_approach}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.85rem 0.85rem', verticalAlign: 'top', textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedInitiative(rec)}
                          className="btn-secondary"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.74rem' }}
                          title="View Evidence & Governance"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* ── Cards View Format ── */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '0.85rem' }}>
            {paginatedRecs.map((rec, i) => {
              const badge = getThemeBadge(rec.theme);
              return (
                <div
                  key={i}
                  style={{
                    padding: '1rem',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          fontFamily: 'monospace',
                          padding: '0.15rem 0.45rem',
                          backgroundColor: 'var(--bg-surface-subtle)',
                          borderRadius: '4px',
                          border: '1px solid var(--border-subtle)'
                        }}
                      >
                        {rec.toms_code}
                      </span>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          padding: '0.12rem 0.45rem',
                          backgroundColor: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                          borderRadius: '4px'
                        }}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#059669' }}>
                      {formatGbp(rec.total_social_value_gbp)}
                    </span>
                  </div>

                  <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                    {rec.initiative_name}
                  </div>

                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                    {rec.delivery_approach}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      {rec.annual_volume} {rec.unit}/yr ({rec.duration_years} yrs)
                    </span>
                    <button
                      onClick={() => setSelectedInitiative(rec)}
                      className="btn-secondary"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}
                    >
                      Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Reusable Pagination */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredRecs.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          pageSizeOptions={[5, 10, 20]}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          itemLabel="commitments"
        />
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────── */}
      {/* INITIATIVE DETAILS MODAL */}
      {/* ──────────────────────────────────────────────────────────────────────────── */}
      {selectedInitiative && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(3px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={() => setSelectedInitiative(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              width: '100%',
              maxWidth: '620px',
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
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'var(--bg-surface-subtle)'
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    padding: '0.15rem 0.45rem',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '4px'
                  }}
                >
                  {selectedInitiative.toms_code}
                </span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                  {selectedInitiative.initiative_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedInitiative(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.84rem' }}>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>PPN 06/20 Criteria: </strong>
                <span style={{ color: 'var(--text-secondary)' }}>{selectedInitiative.ppn_mac}</span>
              </div>

              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Audited Formula: </strong>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {selectedInitiative.annual_volume} {selectedInitiative.unit}/yr × {selectedInitiative.duration_years} yrs @ £{selectedInitiative.unit_value_gbp.toLocaleString()} ={' '}
                  <strong style={{ color: '#059669' }}>{formatGbp(selectedInitiative.total_social_value_gbp)}</strong>
                </span>
              </div>

              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Delivery Approach & Ecosystem:</strong>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.5 }}>
                  {selectedInitiative.delivery_approach}
                </p>
              </div>

              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Defensible Audit Evidence Required:</strong>
                <div
                  style={{
                    marginTop: '0.35rem',
                    padding: '0.75rem',
                    backgroundColor: 'var(--bg-surface-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '0.78rem'
                  }}
                >
                  {selectedInitiative.evidence_needed}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.5rem',
                backgroundColor: 'var(--bg-surface-subtle)'
              }}
            >
              <button onClick={() => setSelectedInitiative(null)} className="btn-primary" style={{ fontSize: '0.82rem' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
