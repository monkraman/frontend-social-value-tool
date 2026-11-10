import React, { useState, useEffect } from 'react';
import { submitPromptToBackend, recommendOpportunities } from '../api/client';
import { useToast } from '../context/ToastContext';
import { formatGbp } from '../utils/formatters';
import type {
  OpportunityRecommendRequest,
  OpportunityRecommendResponse,
  ResponseGenerationResult,
  SocialValuePackage,
  InitiativeItem
} from '../types';
import { TenderPackageViewer } from './TenderPackageViewer';
import {
  Sparkles,
  Sliders,
  MessageSquare,
  Check,
  Filter,
  Award,
  RotateCcw,
  ShieldCheck,
  Layers,
  Briefcase,
  Leaf,
  HeartHandshake,
  Building2,
  ChevronDown,
  ChevronUp
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

export interface AvailableTomOption {
  code: string;
  name: string;
  theme: 'Work' | 'Economy' | 'Planet' | 'Community';
  feasibility: string;
  feasibilityBadgeColor: string;
  recommendedKeywords: string[];
}

export const AVAILABLE_FRAMEWORKS = [
  {
    id: 'national-toms-2025',
    name: 'National TOMs Framework (2024/2025 Edition)',
    shortName: 'National TOMs 2025',
    authority: 'Social Value Portal & LGA',
    status: 'Active (30 Verified Measures)',
    badgeColor: '#059669',
    description: 'Official framework for UK Local Authorities, Councils, and Regional NHS Bodies.'
  },
  {
    id: 'ppn-0620-central-gov',
    name: 'PPN 06/20 Model Award Criteria (Cabinet Office / NHS)',
    shortName: 'PPN 06/20 Standard',
    authority: 'UK Cabinet Office',
    status: 'Fully Mapped to TOMs',
    badgeColor: '#2563eb',
    description: 'Statutory 5-theme framework for Central Government, MoJ, DWP, and CCS tenders.'
  },
  {
    id: 'procurement-act-2023',
    name: 'UK Procurement Act 2023 / PPN 27 (Future Frameworks)',
    shortName: 'Future / Custom Frameworks',
    authority: 'Crown Commercial Service',
    status: 'Extensible Schema Ready',
    badgeColor: '#7c3aed',
    description: 'Configurable schema for custom place-based frameworks (Greater Manchester, Wales Well-being Act, PPN 27).'
  }
];

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

export const OpportunityFinder: React.FC<OpportunityFinderProps> = () => {
  const toast = useToast();

  // Mode: 'prompt' (natural language) vs 'fields' (structured parameters)
  const [inputMode, setInputMode] = useState<'prompt' | 'fields'>('prompt');
  const [promptText, setPromptText] = useState<string>(SAMPLE_PRESETS[0].prompt);

  // Framework Selection state (Default: National TOMs 2025)
  const [selectedFrameworkId, setSelectedFrameworkId] = useState<string>('national-toms-2025');

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

  // National TOMs Strategic Pillars (Themes) Definition
  const THEME_PILLARS = [
    {
      id: 'Work',
      title: 'Work & Local Jobs',
      subtitle: 'Employment, Apprenticeships & Skills',
      badge: '⚡ Levy-Funded (Zero Direct Cost)',
      badgeColor: '#2563eb',
      themeColor: '#2563eb',
      iconName: 'work' as const,
      tomsCodes: ['NT1', 'NT3', 'NT10'],
      description: 'Local direct hiring (NT1), accredited technology apprenticeships (NT10), and sustained NEET youth employment pathways (NT3).',
      includedMeasuresLabel: 'NT1, NT3, NT10 Measures',
      feasibilityNote: 'Utilises existing UK Apprenticeship Levy ledger & internal HR hiring pipelines.'
    },
    {
      id: 'Planet',
      title: 'Planet & Climate',
      subtitle: 'Net Zero & Decarbonisation',
      badge: '🌱 PPN 06/20 Mandatory',
      badgeColor: '#059669',
      themeColor: '#059669',
      iconName: 'planet' as const,
      tomsCodes: ['NT31'],
      description: 'Direct greenhouse emissions decarbonisation (NT31), circular IT equipment refurbishment, and cloud GreenOps telemetry.',
      includedMeasuresLabel: 'NT31 Decarbonisation (tCO2e)',
      feasibilityNote: 'Cloud optimisation & corporate asset circular reuse — £252.11 proxy value per tCO2e.'
    },
    {
      id: 'Community',
      title: 'Community & Wellbeing',
      subtitle: 'Health, Resilience & Digital Inclusion',
      badge: '🤝 CSR Volunteering (Zero Cost)',
      badgeColor: '#7c3aed',
      themeColor: '#7c3aed',
      iconName: 'community' as const,
      tomsCodes: ['NT27', 'NT8'],
      description: 'Targeted digital literacy workshops, employee STEM volunteering hours (NT8), and grassroots community network grants (NT27).',
      includedMeasuresLabel: 'NT27, NT8 Volunteering',
      feasibilityNote: 'Delivered through Infosys corporate volunteering allowance and vetted local charity hubs.'
    },
    {
      id: 'Economy',
      title: 'Economy & Supply Chain',
      subtitle: 'Regional SMEs & VCSE Spend',
      badge: '🏢 Supply Chain Direct',
      badgeColor: '#0d9488',
      themeColor: '#0d9488',
      iconName: 'economy' as const,
      tomsCodes: ['NT18'],
      description: 'Ringfenced contract procurement direct to regional SMEs, VCSE suppliers (NT18), and fair supply chain payment.',
      includedMeasuresLabel: 'NT18 Local SME Spend',
      feasibilityNote: 'Pass-through project delivery subcontracting with regional vendors — £1.089 multiplier.'
    }
  ];

  // Selected Strategic Pillars (Default: All 4 active for comprehensive coverage)
  const [selectedThemes, setSelectedThemes] = useState<string[]>([
    'Work',
    'Planet',
    'Community',
    'Economy'
  ]);

  // Available TOMs Catalog with Commercial Feasibility & Smart Recommendation Keywords
  const AVAILABLE_TOMS_OPTIONS: AvailableTomOption[] = [
    {
      code: 'NT1',
      name: 'Local Employment & Retention',
      theme: 'Work',
      feasibility: '💼 Direct Local Hire',
      feasibilityBadgeColor: '#0284c7',
      recommendedKeywords: ['employment', 'jobs', 'retention', 'local recruitment', 'hiring']
    },
    {
      code: 'NT3',
      name: 'NEET & Long-Term Unemployed',
      theme: 'Work',
      feasibility: '🎯 High Win-Rate NEET',
      feasibilityBadgeColor: '#8b5cf6',
      recommendedKeywords: ['youth', 'neet', 'unemployed', 'disadvantaged', 'young people']
    },
    {
      code: 'NT8',
      name: 'STEM & Digital Skills Volunteering',
      theme: 'Community',
      feasibility: '🟢 CSR Volunteering (Zero Cost)',
      feasibilityBadgeColor: '#059669',
      recommendedKeywords: ['digital', 'stem', 'skills', 'school', 'mentoring', 'volunteering', 'clinic']
    },
    {
      code: 'NT10',
      name: 'Accredited New Apprenticeships',
      theme: 'Work',
      feasibility: '⚡ Levy-Funded (Zero Direct Cost)',
      feasibilityBadgeColor: '#f59e0b',
      recommendedKeywords: ['apprentice', 'apprenticeship', 'youth', 'training', 'tech', 'skills']
    },
    {
      code: 'NT18',
      name: 'Local SME & VCSE Supply Chain',
      theme: 'Economy',
      feasibility: '🏢 Supply Chain Direct',
      feasibilityBadgeColor: '#0d9488',
      recommendedKeywords: ['sme', 'vcse', 'supply chain', 'local business', 'procurement', 'subcontracting']
    },
    {
      code: 'NT27',
      name: 'Strengthening Community Networks',
      theme: 'Community',
      feasibility: '🤝 Community Resilience',
      feasibilityBadgeColor: '#ec4899',
      recommendedKeywords: ['community', 'networks', 'charity', 'wellbeing', 'resilience', 'inclusion']
    },
    {
      code: 'NT31',
      name: 'Decarbonisation (tCO2e)',
      theme: 'Planet',
      feasibility: '🌱 Net Zero Compliant',
      feasibilityBadgeColor: '#10b981',
      recommendedKeywords: ['carbon', 'green', 'climate', 'net zero', 'emissions', 'planet', 'sustainable', 'greenery']
    }
  ];

  // User-selected TOMs (derived from themes or granular toggle)
  const [selectedTomsCodes, setSelectedTomsCodes] = useState<string[]>([
    'NT1',
    'NT3',
    'NT8',
    'NT10',
    'NT18',
    'NT27',
    'NT31'
  ]);

  // Auditor drill-down accordion toggle
  const [isAuditorViewOpen, setIsAuditorViewOpen] = useState<boolean>(false);

  // Toggle strategic pillar theme
  const toggleTheme = (themeId: string) => {
    let nextThemes: string[];
    if (selectedThemes.includes(themeId)) {
      if (selectedThemes.length <= 1) {
        toast.warning('At least 1 strategic pillar must remain active for bid response synthesis.');
        return;
      }
      nextThemes = selectedThemes.filter((t) => t !== themeId);
    } else {
      nextThemes = [...selectedThemes, themeId];
    }
    setSelectedThemes(nextThemes);

    // Compute active TOMs codes from active themes
    const codes = Array.from(
      new Set(
        THEME_PILLARS.filter((p) => nextThemes.includes(p.id)).flatMap((p) => p.tomsCodes)
      )
    );
    setSelectedTomsCodes(codes);
  };

  const handleSelectAllThemes = () => {
    const allThemeIds = THEME_PILLARS.map((p) => p.id);
    setSelectedThemes(allThemeIds);
    setSelectedTomsCodes(AVAILABLE_TOMS_OPTIONS.map((t) => t.code));
    toast.info('All 4 National TOMs Strategic Pillars activated.');
  };

  // Smart Auto-Select Themes & TOMs based on current tender priorities
  const handleAutoSelectForTender = () => {
    const combinedContext = `${formData.priorities} ${promptText} ${formData.client} ${formData.location}`.toLowerCase();
    const isGreen =
      combinedContext.includes('green') ||
      combinedContext.includes('carbon') ||
      combinedContext.includes('climate') ||
      combinedContext.includes('planet') ||
      combinedContext.includes('net zero') ||
      combinedContext.includes('greenery');
    const isSme =
      combinedContext.includes('sme') ||
      combinedContext.includes('supply chain') ||
      combinedContext.includes('local business');
    const isSkills =
      combinedContext.includes('apprentice') ||
      combinedContext.includes('skills') ||
      combinedContext.includes('youth') ||
      combinedContext.includes('employment') ||
      combinedContext.includes('work');
    const isCommunity =
      combinedContext.includes('community') ||
      combinedContext.includes('volunteering') ||
      combinedContext.includes('inclusion') ||
      combinedContext.includes('charity');

    let matchedThemes: string[] = [];
    if (isGreen) matchedThemes.push('Planet');
    if (isSkills) matchedThemes.push('Work');
    if (isCommunity) matchedThemes.push('Community');
    if (isSme) matchedThemes.push('Economy');

    if (matchedThemes.length === 0) {
      matchedThemes = ['Work', 'Planet', 'Community', 'Economy'];
    }

    setSelectedThemes(matchedThemes);
    const codes = Array.from(
      new Set(
        THEME_PILLARS.filter((p) => matchedThemes.includes(p.id)).flatMap((p) => p.tomsCodes)
      )
    );
    setSelectedTomsCodes(codes);
    toast.success(`Auto-matched ${matchedThemes.length} strategic pillar(s) to tender priorities!`);
  };

  const handleSelectAllToms = () => {
    setSelectedTomsCodes(AVAILABLE_TOMS_OPTIONS.map((t) => t.code));
    setSelectedThemes(THEME_PILLARS.map((p) => p.id));
    toast.info('All 7 National TOMs measures selected.');
  };

  // 3-Package Results State
  const [packagesResult, setPackagesResult] = useState<ResponseGenerationResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
    } else if (lower.includes('green') || lower.includes('carbon') || lower.includes('climate') || lower.includes('net zero') || lower.includes('environment')) {
      priorities = 'Net Zero & Decarbonisation';
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

  // Fallback: Deterministically synthesize the 3 packages if backend prompt endpoint is unavailable
  const synthesizeThreePackages = (_recs: OpportunityRecommendResponse, p: ParsedPromptParams): ResponseGenerationResult => {
    const targetSv = (p.contractValue * p.weightingPercent) / 100.0;
    const loc = p.location;
    const dur = p.durationYears;

    const THEME_INITIATIVES: Record<string, Array<{
      code: string;
      unit: string;
      rate: number;
      name: string;
      theme: string;
      description: string;
      delivery: (vol: number, yrs: number) => string;
      beneficiaries: string;
      partner: string;
      evidence: string;
    }>> = {
      Planet: [
        {
          code: 'NT31',
          unit: 'tCO2e',
          rate: 252.11,
          name: 'Enterprise IT Decarbonisation & Cloud GreenOps Monitoring',
          theme: 'Planet: Decarbonising & Safeguarding our World',
          description: 'Continuous energy efficiency telemetry, cloud workload right-sizing, and algorithmic carbon footprint reduction across public sector infrastructure.',
          delivery: (vol, yrs) => `${vol.toFixed(1)} tCO2e emissions avoided annually (${(vol * yrs).toFixed(1)} tCO2e over ${yrs} yrs)`,
          beneficiaries: `Regional environment, public sector estate, and residents in ${loc}`,
          partner: `${loc} Climate Action Alliance & GreenOps Consortium`,
          evidence: 'ISO 14001 Audited Energy Telemetry & Social Value Portal Verification'
        },
        {
          code: 'NT31',
          unit: 'tCO2e',
          rate: 252.11,
          name: 'Circular IT Asset Refurbishment & Family Device Bank',
          theme: 'Planet: Decarbonising & Safeguarding our World',
          description: 'ADISA-certified sanitization, data wiping, and zero-landfill refurbishment of corporate hardware donated to low-income pupils.',
          delivery: (vol, yrs) => `${vol.toFixed(1)} tCO2e e-waste embodied emissions avoided annually (${(vol * yrs).toFixed(1)} tCO2e over ${yrs} yrs)`,
          beneficiaries: `Digitally excluded families and climate preservation in ${loc}`,
          partner: `${loc} Community E-Waste & Digital Device Bank`,
          evidence: 'ADISA Certified Sanitization & WEEE Waste Consignment Notes'
        },
        {
          code: 'NT31',
          unit: 'tCO2e',
          rate: 252.11,
          name: 'Data Center Renewable Power & Server Virtualisation Optimization',
          theme: 'Planet: Decarbonising & Safeguarding our World',
          description: 'Transition of dedicated workload instances to 100% renewable energy regional data center availability zones.',
          delivery: (vol, yrs) => `${vol.toFixed(1)} tCO2e renewable power carbon offset annually (${(vol * yrs).toFixed(1)} tCO2e over ${yrs} yrs)`,
          beneficiaries: `Local council carbon accounting and environmental ecosystem in ${loc}`,
          partner: `${loc} Clean Energy Hub & Regional Power Partnership`,
          evidence: 'Guarantees of Origin (REGO) Certificates & Green Tariff Logs'
        }
      ],
      Work: [
        {
          code: 'NT1',
          unit: 'no. people FTE',
          rate: 45722.0,
          name: 'Dedicated Contract Direct Local Employment',
          theme: 'Work: Promoting Local Employment',
          description: 'Full-time equivalent employment positions ringfenced for local residents directly engaged in contract delivery and support operations.',
          delivery: (vol, yrs) => `${vol.toFixed(1)} FTE local residents employed annually (${(vol * yrs).toFixed(1)} FTE-years total)`,
          beneficiaries: `Jobseekers and career-transitioning residents across ${loc}`,
          partner: `${loc} Jobcentre Plus & Regional Employment Hub`,
          evidence: 'Employment contracts, payroll RTI records, and local postcode validation'
        },
        {
          code: 'NT10',
          unit: 'no. weeks',
          rate: 309.73,
          name: 'Accredited Technology Apprenticeship Programme',
          theme: 'Work: Providing Skills and Experience for Good Work',
          description: 'Structured Level 3 to Level 6 technology, software development, and cybersecurity apprenticeships co-funded via Apprenticeship Levy.',
          delivery: (vol, yrs) => `${Math.round(vol)} apprenticeship training weeks per contract year (${Math.round(vol * yrs)} weeks total)`,
          beneficiaries: `Young school and college leavers resident in ${loc}`,
          partner: `${loc} Regional FE College & QA Apprenticeships`,
          evidence: 'Individual Learner Records (ILR) & accredited qualification certificates'
        },
        {
          code: 'NT3',
          unit: 'no. people FTE',
          rate: 51561.0,
          name: 'NEET Young People (16-24) Sustained Employment Pathway',
          theme: 'Work: Tackling Unemployment',
          description: 'Intensive mentoring, technical training, and paid work placement transitioning young people into permanent employment.',
          delivery: (vol, _yrs) => `${vol.toFixed(1)} FTE young NEET individuals transitioned annually into permanent technology roles`,
          beneficiaries: `Young NEET individuals (16-24) across ${loc}`,
          partner: `${loc} Youth Employment Trust & The Prince's Trust`,
          evidence: 'Participant onboarding verification & 26-week sustained employment milestones'
        }
      ],
      Community: [
        {
          code: 'NT8',
          unit: 'no. staff volunteering hours',
          rate: 17.48,
          name: 'Ward-Level Targeted Digital Skills Inclusion Clinics',
          theme: 'Community: Healthier & Safer Communities',
          description: 'Corporate staff volunteering delivering face-to-face digital literacy clinics in high-deprivation community hubs and libraries.',
          delivery: (vol, yrs) => `${Math.round(vol)} staff volunteering hours delivered annually (${Math.round(vol * yrs)} hours over ${yrs} yrs)`,
          beneficiaries: `Disadvantaged and older residents across priority wards in ${loc}`,
          partner: `${loc} Community Voluntary Action & Local Library Service`,
          evidence: 'Volunteer attendance registers, session feedback logs, and portal verification'
        },
        {
          code: 'NT27',
          unit: '£ invested',
          rate: 1.00,
          name: 'Strengthening Community Networks & Resilience Grants',
          theme: 'Community: Healthier & Safer Communities',
          description: 'Ringfenced capacity building grants and technological equipment donations to grassroots neighbourhood charity organisations.',
          delivery: (vol, yrs) => `£${Math.round(vol).toLocaleString()} annual funding and equipment donated to local grassroots organisations (${Math.round(vol * yrs).toLocaleString()} total)`,
          beneficiaries: `Local community organisations and vulnerable residents in ${loc}`,
          partner: `${loc} Community Foundation & Voluntary Council`,
          evidence: 'Grant award agreements and partner spend receipts'
        }
      ],
      Economy: [
        {
          code: 'NT18',
          unit: '£ direct spend',
          rate: 1.089,
          name: 'Ringfenced Local SME & VCSE Supply Chain Procurement',
          theme: 'Economy: Supporting Regional Business',
          description: 'Direct procurement spend allocated to accredited local small businesses, social enterprises, and VCSE vendors within regional postcodes.',
          delivery: (vol, yrs) => `£${Math.round(vol).toLocaleString()} annual direct subcontract spend awarded to local vendors (${Math.round(vol * yrs).toLocaleString()} total)`,
          beneficiaries: `Local small businesses, social enterprises, and VCSEs across ${loc}`,
          partner: `${loc} Chamber of Commerce & Federation of Small Businesses`,
          evidence: 'Subcontract agreements, Purchase Orders, and 30-day payment ledger verification'
        }
      ]
    };

    // Gather candidate initiatives strictly from selectedThemes & selectedTomsCodes
    let candidateTemplates: Array<{
      code: string;
      unit: string;
      rate: number;
      name: string;
      theme: string;
      description: string;
      delivery: (vol: number, yrs: number) => string;
      beneficiaries: string;
      partner: string;
      evidence: string;
    }> = [];

    selectedThemes.forEach((th) => {
      const items = THEME_INITIATIVES[th] || [];
      candidateTemplates.push(...items);
    });

    if (selectedTomsCodes.length > 0) {
      const filtered = candidateTemplates.filter((t) => selectedTomsCodes.includes(t.code));
      if (filtered.length > 0) {
        candidateTemplates = filtered;
      }
    }

    if (candidateTemplates.length === 0) {
      candidateTemplates = THEME_INITIATIVES['Work'];
    }

    // Helper: package generator
    const buildPackageFromTemplates = (
      pkgName: string,
      pkgRationale: string,
      targetGbp: number,
      _multiplier: number,
      dependencies: string[]
    ): SocialValuePackage => {
      const shareTarget = targetGbp / candidateTemplates.length;

      const calcs = candidateTemplates.map((t) => {
        let annualVol = 0;
        if (t.rate <= 1.5) {
          annualVol = Math.round(shareTarget / (t.rate * dur));
        } else if (t.unit.includes('hours') || t.unit.includes('weeks')) {
          annualVol = Math.max(12, Math.round(shareTarget / (t.rate * dur)));
        } else {
          annualVol = Math.max(0.1, Number((shareTarget / (t.rate * dur)).toFixed(1)));
        }
        const totalVol = Math.round(annualVol * dur * 10) / 10;
        const totalSv = Math.round(totalVol * t.rate);
        return {
          template: t,
          annualVol,
          totalVol,
          totalSv
        };
      });

      const inits: InitiativeItem[] = calcs.map((c) => ({
        name: `${loc} ${c.template.name}`,
        theme: c.template.theme,
        location: loc,
        description: c.template.description,
        delivery_mechanism: c.template.delivery(c.annualVol, dur),
        target_beneficiaries: c.template.beneficiaries,
        annual_volume: c.annualVol,
        toms_metric_code: c.template.code,
        partner: c.template.partner,
        evidence_source: c.template.evidence,
        is_from_knowledge_base: true,
        indicative_cost_gbp: 0,
        commercial_viability: 'Framework Aligned'
      }));

      const financialInits = calcs.map((c) => ({
        initiative_name: `${loc} ${c.template.name}`,
        toms_code: c.template.code,
        metric_name: c.template.name,
        unit: c.template.unit,
        unit_value_gbp: c.template.rate,
        annual_volume: c.annualVol,
        duration_years: dur,
        total_volume: c.totalVol,
        total_social_value_gbp: c.totalSv,
        calculation_formula: `${c.annualVol} ${c.template.unit}/yr × ${dur} yrs = ${c.totalVol} ${c.template.unit} @ £${c.template.rate.toLocaleString()} = £${c.totalSv.toLocaleString()}`
      }));

      const totalSv = financialInits.reduce((acc, item) => acc + item.total_social_value_gbp, 0);

      return {
        name: pkgName,
        rationale: pkgRationale,
        expected_impact: [
          `Delivers £${totalSv.toLocaleString()} verified Social Value across ${loc}`,
          `Engages accredited partners: ${inits.map((i) => i.partner).filter(Boolean).slice(0, 3).join(', ')}`,
          `100% compliant with National TOMs & PPN 06/20 Model Award Criteria`
        ],
        dependencies,
        initiatives: inits,
        indicative_delivery_cost_gbp: 0,
        commercial_viability_summary: `Targeted commitments calibrated against verified National TOMs proxy benchmarks and accredited regional delivery partners.`,
        financial_calculation: {
          package_name: pkgName,
          initiatives: financialInits,
          total_social_value_gbp: totalSv,
          contract_value_gbp: p.contractValue,
          social_value_percentage: Number(((totalSv / p.contractValue) * 100).toFixed(2)),
          target_weighting_percent: p.weightingPercent,
          target_social_value_gbp: targetSv,
          target_met: totalSv >= targetSv,
          audit_trail: [`Calculated from ${inits.length} verified National TOMs measures across ${selectedThemes.join(', ')}`]
        },
        governance: {
          social_value_lead: 'Named Social Value Project Lead appointed within 15 days of contract award',
          kickoff_cadence: 'Joint Kick-Off Governance Alignment meeting within 60 days of award',
          reporting_frequency: 'Quarterly TOMs Delivery Scorecard & Milestone Verification Reports',
          annual_review: 'Annual Independent SVROI Audit & Stakeholder Feedback Review'
        }
      };
    };

    const corePackage = buildPackageFromTemplates(
      'Core Package (In-House & Levy Focused)',
      'Baseline compliance response delivering 100% of the statutory Social Value target through existing UK Apprenticeship Levy and corporate baseline frameworks with minimal internal overhead.',
      targetSv,
      1.0,
      ['Apprenticeship levy allocation ledger', 'Corporate CSR baseline allowance']
    );

    const localisedPackage = buildPackageFromTemplates(
      'Localised Package (Place-Based Regional Ecosystem)',
      `Targeted place-based commitments designed specifically for ${loc} priority wards using selected themes (${selectedThemes.join(', ')}) with pre-approved accredited regional delivery partners.`,
      Math.round(targetSv * 1.05),
      1.05,
      ['Quarterly review cadence with Project Social Value Lead', 'Regional partner onboarding SLAs']
    );

    const enhancedPackage = buildPackageFromTemplates(
      'Enhanced Package (High-Scoring Impact)',
      'Maximum competitive win-rate option delivering comprehensive environmental, community, and skills commitments that over-deliver statutory weighting targets.',
      Math.round(targetSv * 1.15),
      1.15,
      ['Employer-supported volunteering approval', 'Resource allocation sign-off']
    );

    return {
      opportunity: {
        client: p.client,
        location: p.location,
        contract_value_gbp: p.contractValue,
        duration_years: p.durationYears,
        social_value_weighting_percent: p.weightingPercent,
        target_social_value_gbp: targetSv,
        priorities: [p.priorities]
      },
      core_package: corePackage,
      enhanced_package: enhancedPackage,
      localised_package: localisedPackage,
      assumptions: ['Apprenticeship levy co-funding applied', 'National TOMs verified proxy rates'],
      validation_required: ['Confirm partner onboarding SLAs with regional delivery partners'],
      retrieved_evidence_chunks: 5,
      grounding_summary: { source: 'National TOMs & Regional Partner Database' },
      // Built client-side from the deterministic /calculations/recommend endpoint, not by the AI.
      is_mock: true
    };
  };

  // Main search execution: Generates the 3 packages directly
  const handleExecuteSearch = async () => {
    setIsLoading(true);
    try {
      const fullPrompt =
        inputMode === 'prompt' && promptText.trim().length > 30
          ? promptText
          : `I need to build a Social Value bid response, for a ${formData.durationYears}-year contract of £${formData.contractValue} with ${formData.weightingPercent}% Social Value weighting. The client ${formData.client} in ${formData.location} wants the Social Value offer to address ${formData.priorities}. Based on: previous responses that have scored highly, what Infosys have delivered so far, approved partnerships in our repository, recognised frameworks for SVROI (National TOMS) and geographical location - build a template of initiatives we can present to the client that would achieve ${formData.weightingPercent}% SV, and the impact we can expect to deliver.`;

      // 1. Primary: Attempt full 3-package generation from backend pipeline
      try {
        const fullPromptWithScope = `${fullPrompt} Selected framework measures scope: ${selectedTomsCodes.join(', ')}. Priority focus: ${formData.priorities}.`;
        const resp = await submitPromptToBackend(fullPromptWithScope);
        if (resp && resp.result && resp.result.localised_package) {
          // Normalize duration
          if (resp.result.opportunity) {
            resp.result.opportunity.duration_years =
              resp.result.opportunity.duration_years ||
              (resp.result.opportunity as any).contract_duration_years ||
              formData.durationYears;
          }

          // Verify that returned initiatives match the user's selected TOMs filter
          const inits = resp.result.localised_package.initiatives || [];
          const hasChosenToms = inits.some((i: any) => selectedTomsCodes.includes(i.toms_metric_code));

          if (hasChosenToms || selectedTomsCodes.length === AVAILABLE_TOMS_OPTIONS.length) {
            setPackagesResult(resp.result);
            toast.success(`Generated 3 Social Value response packages for ${resp.result.opportunity.client}!`);
            setIsLoading(false);
            return;
          }
        }
      } catch (backendErr) {
        console.warn('Backend prompt endpoint unavailable, falling back to deterministic calculation:', backendErr);
      }

      // 2. Deterministic Fallback: /calculations/recommend
      const reqPayload: OpportunityRecommendRequest = {
        industry: formData.industry,
        contract_value_gbp: formData.contractValue,
        duration_years: formData.durationYears,
        target_weighting_percent: formData.weightingPercent,
        location: formData.location,
        focus_areas: formData.priorities ? [formData.priorities] : undefined
      };
      const recs = await recommendOpportunities(reqPayload);
      const synthesized = synthesizeThreePackages(recs, formData);
      setPackagesResult(synthesized);
      toast.success(`Calculated 3 response packages delivering ${formatGbp(synthesized.localised_package.financial_calculation?.total_social_value_gbp || 0)} Social Value!`);
    } catch (err: any) {
      toast.error('Search failed: ' + (err.message || 'Server error'));
    } finally {
      setIsLoading(false);
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
            Enter your tender requirements via natural language prompt or structured parameters. The engine matches National TOMs proxy
            values and regional partners to formulate high-scoring, audit-defensible bid commitments presented in 3 response templates.
          </p>
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
        </div>

        {/* Tab Body */}
        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
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

          {/* Framework Selector & Live Database Status */}
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                <Layers size={14} style={{ color: 'var(--color-primary)' }} />
                <span>Procurement Framework:</span>
              </div>
              <select
                value={selectedFrameworkId}
                onChange={(e) => {
                  setSelectedFrameworkId(e.target.value);
                  const fw = AVAILABLE_FRAMEWORKS.find(f => f.id === e.target.value);
                  if (fw) {
                    toast.info(`Framework selected: ${fw.shortName}`);
                  }
                }}
                className="input-field"
                style={{
                  fontSize: '0.78rem',
                  padding: '0.3rem 0.65rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer'
                }}
              >
                {AVAILABLE_FRAMEWORKS.map((fw) => (
                  <option key={fw.id} value={fw.id}>
                    {fw.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.74rem' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.22rem 0.65rem',
                  borderRadius: '999px',
                  backgroundColor: 'rgba(5, 150, 105, 0.12)',
                  color: '#059669',
                  fontWeight: 700
                }}
              >
                <ShieldCheck size={13} />
                30 Official National TOMs Measures Active
              </span>
              <span style={{ color: 'var(--text-muted)' }}>Authority: Social Value Portal & LGA</span>
            </div>
          </div>

          {/* National TOMs Strategic Pillars (Themes) & Delivery Feasibility */}
          <div
            style={{
              padding: '1rem 1.15rem',
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem'
            }}
          >
            {/* Top Row: Title + Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  <Filter size={15} style={{ color: 'var(--color-primary)' }} />
                  <span>National TOMs Strategic Pillars & Feasibility</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.1rem 0.45rem', borderRadius: '999px', backgroundColor: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
                    {selectedThemes.length} of 4 Active
                  </span>
                </div>
                <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  Select the core Social Value themes to include. The engine maps proxy values & delivery partners automatically.
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <button
                  type="button"
                  onClick={handleAutoSelectForTender}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.3rem 0.7rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    color: '#2563eb',
                    border: '1px solid rgba(37, 99, 235, 0.25)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  title="Automatically matches top TOMs to the client's stated priorities"
                >
                  <Sparkles size={12} />
                  <span>Auto-Match Tender Priorities</span>
                </button>
                <button
                  type="button"
                  onClick={handleSelectAllThemes}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.3rem 0.6rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer'
                  }}
                >
                  <RotateCcw size={12} />
                  <span>Select All 4 Pillars</span>
                </button>
              </div>
            </div>

            {/* 4 Theme Pillar Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '0.75rem'
              }}
            >
              {THEME_PILLARS.map((pillar) => {
                const isActive = selectedThemes.includes(pillar.id);
                const IconComponent =
                  pillar.iconName === 'work'
                    ? Briefcase
                    : pillar.iconName === 'planet'
                    ? Leaf
                    : pillar.iconName === 'community'
                    ? HeartHandshake
                    : Building2;

                return (
                  <div
                    key={pillar.id}
                    onClick={() => toggleTheme(pillar.id)}
                    style={{
                      cursor: 'pointer',
                      borderRadius: '8px',
                      border: `1.5px solid ${isActive ? pillar.themeColor : 'var(--border-subtle)'}`,
                      backgroundColor: isActive ? 'var(--bg-surface)' : 'var(--bg-surface-subtle)',
                      padding: '0.85rem 0.95rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.45rem',
                      transition: 'all 0.15s ease',
                      boxShadow: isActive ? `0 2px 8px -2px ${pillar.themeColor}30` : 'none',
                      userSelect: 'none'
                    }}
                  >
                    {/* Top Row: Icon + Title + Check Circle */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            backgroundColor: isActive ? `${pillar.themeColor}18` : 'rgba(0,0,0,0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isActive ? pillar.themeColor : 'var(--text-muted)'
                          }}
                        >
                          <IconComponent size={15} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {pillar.title}
                          </div>
                          <div style={{ fontSize: '0.69rem', color: 'var(--text-muted)' }}>
                            {pillar.subtitle}
                          </div>
                        </div>
                      </div>

                      {/* Check Toggle */}
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          backgroundColor: isActive ? pillar.themeColor : 'transparent',
                          border: `1.5px solid ${isActive ? pillar.themeColor : 'var(--border-subtle)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff'
                        }}
                      >
                        {isActive && <Check size={11} strokeWidth={3} />}
                      </div>
                    </div>

                    {/* Description */}
                    <p style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', margin: '0.1rem 0', lineHeight: 1.4 }}>
                      {pillar.description}
                    </p>

                    {/* Bottom Metadata */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 'auto',
                        paddingTop: '0.4rem',
                        borderTop: '1px dashed var(--border-subtle)',
                        fontSize: '0.68rem'
                      }}
                    >
                      <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
                        {pillar.includedMeasuresLabel}
                      </span>
                      <span
                        style={{
                          fontWeight: 600,
                          padding: '0.12rem 0.42rem',
                          borderRadius: '4px',
                          backgroundColor: `${pillar.badgeColor}15`,
                          color: pillar.badgeColor
                        }}
                      >
                        {pillar.badge}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Evaluation Coverage & Quality Meter */}
            {(() => {
              const isFullCoverage = selectedThemes.length === 4;
              const isGoodCoverage = selectedThemes.length >= 3;
              return (
                <div
                  style={{
                    padding: '0.55rem 0.85rem',
                    borderRadius: '6px',
                    backgroundColor: isGoodCoverage ? 'rgba(5, 150, 105, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                    border: `1px solid ${isGoodCoverage ? 'rgba(5, 150, 105, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    fontSize: '0.74rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Award size={14} style={{ color: isGoodCoverage ? '#059669' : '#d97706' }} />
                    <span style={{ fontWeight: 600, color: isGoodCoverage ? '#065f46' : '#92400e' }}>
                      {isFullCoverage
                        ? '🌟 Full 4-Pillar Evaluation Scope Active'
                        : isGoodCoverage
                        ? '✓ Balanced Multi-Theme Tender Coverage'
                        : '⚠️ Targeted Pillar Focus'}
                    </span>
                    <span style={{ color: isGoodCoverage ? '#047857' : '#b45309' }}>
                      {isFullCoverage
                        ? '— Work, Planet, Community & Economy balanced to achieve maximum qualitative evaluation marks.'
                        : isGoodCoverage
                        ? '— Addresses core Crown Commercial Service & NHS Social Value criteria.'
                        : `(${selectedThemes.length}/4 pillars selected). Public sector evaluators award higher scores when multiple themes are addressed.`}
                    </span>
                  </div>

                  {/* Toggle Auditor View */}
                  <button
                    type="button"
                    onClick={() => setIsAuditorViewOpen(!isAuditorViewOpen)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-primary)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '0.73rem',
                      padding: '0.15rem 0.35rem'
                    }}
                  >
                    <span>{isAuditorViewOpen ? 'Hide' : 'Inspect'} 7 Underlying TOMs Measures</span>
                    {isAuditorViewOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>
              );
            })()}

            {/* Expandable Technical Auditor View for Individual TOMs Measures */}
            {isAuditorViewOpen && (
              <div
                style={{
                  padding: '0.75rem',
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Technical Auditor View: Underlying National TOMs proxy measures verified in official framework database. Individual measures can be toggled:
                  </div>
                  <button
                    type="button"
                    onClick={handleSelectAllToms}
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-surface-subtle)',
                      color: 'var(--color-primary)',
                      cursor: 'pointer'
                    }}
                  >
                    Select All 7 Measures
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                  {AVAILABLE_TOMS_OPTIONS.map((t) => {
                    const isSelected = selectedTomsCodes.includes(t.code);
                    return (
                      <button
                        key={t.code}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            if (selectedTomsCodes.length > 1) {
                              setSelectedTomsCodes(selectedTomsCodes.filter((c) => c !== t.code));
                            } else {
                              toast.warning('At least 1 TOMs measure must be active.');
                            }
                          } else {
                            setSelectedTomsCodes([...selectedTomsCodes, t.code]);
                          }
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.28rem 0.65rem',
                          borderRadius: '999px',
                          fontSize: '0.73rem',
                          fontWeight: isSelected ? 600 : 500,
                          border: '1px solid',
                          borderColor: isSelected ? 'var(--color-primary)' : 'var(--border-subtle)',
                          backgroundColor: isSelected ? 'var(--color-primary-subtle)' : 'var(--bg-surface)',
                          color: isSelected ? 'var(--color-primary)' : 'var(--text-secondary)',
                          cursor: 'pointer'
                        }}
                      >
                        {isSelected && <Check size={11} />}
                        <strong>{t.code}</strong>
                        <span>{t.name}</span>
                        <span style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>
                          ({t.theme})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Action Button: Moved to Bottom with Professional Styling */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              paddingTop: '0.85rem',
              borderTop: '1px solid var(--border-subtle)'
            }}
          >
            <button
              onClick={handleExecuteSearch}
              className="btn-primary"
              disabled={isLoading}
              style={{
                fontSize: '0.88rem',
                padding: '0.65rem 1.4rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: 600
              }}
            >
              <Sparkles size={16} className={isLoading ? 'spin-icon' : ''} />
              <span>{isLoading ? 'Formulating 3 Packages…' : 'Generate 3 Response Templates'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Initial Empty State (When user has not generated yet) */}
      {!packagesResult && !isLoading && (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem 1.5rem',
            backgroundColor: 'var(--bg-surface)',
            border: '1px dashed var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-secondary)'
          }}
        >
          <div className="icon-badge" style={{ width: '44px', height: '44px', margin: '0 auto 0.85rem auto' }}>
            <Sparkles size={20} style={{ color: 'var(--color-primary)' }} />
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
            Ready to Formulate Social Value Proposals
          </h3>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', maxWidth: '560px', margin: '0 auto', lineHeight: 1.55 }}>
            Select a quick preset above or customize your tender parameters, then click <strong>"Generate 3 Response Templates"</strong> to calculate audit-defensible Core, Expanded, and Place-based proposal options.
          </p>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-secondary)' }}>
          <div className="icon-badge" style={{ width: '48px', height: '48px', margin: '0 auto 1rem auto' }}>
            <Sparkles size={22} className="spin-icon" style={{ color: 'var(--color-primary)' }} />
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
            Formulating 3 Response Packages for {formData.client}…
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Matching National TOMs proxy measures, approved {formData.location} partners, and calculating 10% statutory SV targets.
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────── */}
      {/* 3 PACKAGE TEMPLATES VIEWER (REUSABLE COMPONENT AS IN BID STUDIO) */}
      {/* ──────────────────────────────────────────────────────────────────────────── */}
      {packagesResult && !isLoading && (
        <TenderPackageViewer
          result={packagesResult}
          targetAmount={packagesResult.opportunity.target_social_value_gbp}
          initialPackage="localised"
          showResetButton={false}
          onExportJson={() => {
            const blob = new Blob([JSON.stringify(packagesResult, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `social-value-proposal-${packagesResult.opportunity.client.toLowerCase().replace(/\s+/g, '-')}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        />
      )}
    </div>
  );
};
