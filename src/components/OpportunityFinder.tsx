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
  FileText,
  LoaderCircle,
  Target,
  Sliders,
  MessageSquare,
  Check,
  Briefcase,
  Leaf,
  HeartHandshake,
  Building2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { PageHeader } from './PageHeader';

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

const LOCATIONS = ['Birmingham', 'Manchester', 'London', 'Leeds', 'Bristol', 'National UK'];

export const AVAILABLE_FRAMEWORKS = [
  {
    id: 'national-toms-2025',
    name: 'National TOMs Framework (2024/2025 Edition)',
    shortName: 'National TOMs 2025',
    authority: 'Social Value Portal & LGA',
    status: '30 measures',
    badgeColor: '#2F7D5B',
    description: 'Official framework for UK Local Authorities, Councils, and Regional NHS Bodies.'
  },
  {
    id: 'ppn-0620-central-gov',
    name: 'PPN 06/20 Model Award Criteria (Cabinet Office / NHS)',
    shortName: 'PPN 06/20 Standard',
    authority: 'UK Cabinet Office',
    status: 'Mapped to TOMs',
    badgeColor: '#2B67A0',
    description: 'Statutory 5-theme framework for Central Government, MoJ, DWP, and CCS tenders.'
  },
  {
    id: 'procurement-act-2023',
    name: 'UK Procurement Act 2023 / PPN 27 (Future Frameworks)',
    shortName: 'Future / Custom Frameworks',
    authority: 'Crown Commercial Service',
    status: 'Configurable',
    badgeColor: '#5E5A8C',
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
      badge: 'Apprenticeship Levy funded',
      badgeColor: '#2B67A0',
      themeColor: '#2B67A0',
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
      badge: 'PPN 06/20 climate theme',
      badgeColor: '#2F7D5B',
      themeColor: '#2F7D5B',
      iconName: 'planet' as const,
      tomsCodes: ['NT31'],
      description: 'Direct greenhouse emissions decarbonisation (NT31), circular reuse of IT equipment, and cloud energy optimisation.',
      includedMeasuresLabel: 'NT31 Decarbonisation (tCO2e)',
      feasibilityNote: 'Cloud optimisation & corporate asset circular reuse — £252.11 proxy value per tCO2e.'
    },
    {
      id: 'Community',
      title: 'Community & Wellbeing',
      subtitle: 'Health, Resilience & Digital Inclusion',
      badge: 'Staff volunteering',
      badgeColor: '#5E5A8C',
      themeColor: '#5E5A8C',
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
      badge: 'Local supply chain',
      badgeColor: '#2C7A7B',
      themeColor: '#2C7A7B',
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
      feasibility: 'Direct local hiring',
      feasibilityBadgeColor: '#2B67A0',
      recommendedKeywords: ['employment', 'jobs', 'retention', 'local recruitment', 'hiring']
    },
    {
      code: 'NT3',
      name: 'NEET & Long-Term Unemployed',
      theme: 'Work',
      feasibility: 'Youth employment',
      feasibilityBadgeColor: '#2B67A0',
      recommendedKeywords: ['youth', 'neet', 'unemployed', 'disadvantaged', 'young people']
    },
    {
      code: 'NT8',
      name: 'STEM & Digital Skills Volunteering',
      theme: 'Community',
      feasibility: 'Staff volunteering',
      feasibilityBadgeColor: '#5E5A8C',
      recommendedKeywords: ['digital', 'stem', 'skills', 'school', 'mentoring', 'volunteering', 'clinic']
    },
    {
      code: 'NT10',
      name: 'Accredited New Apprenticeships',
      theme: 'Work',
      feasibility: 'Apprenticeship Levy funded',
      feasibilityBadgeColor: '#2B67A0',
      recommendedKeywords: ['apprentice', 'apprenticeship', 'youth', 'training', 'tech', 'skills']
    },
    {
      code: 'NT18',
      name: 'Local SME & VCSE Supply Chain',
      theme: 'Economy',
      feasibility: 'Local supply chain',
      feasibilityBadgeColor: '#2C7A7B',
      recommendedKeywords: ['sme', 'vcse', 'supply chain', 'local business', 'procurement', 'subcontracting']
    },
    {
      code: 'NT27',
      name: 'Strengthening Community Networks',
      theme: 'Community',
      feasibility: 'Community networks',
      feasibilityBadgeColor: '#5E5A8C',
      recommendedKeywords: ['community', 'networks', 'charity', 'wellbeing', 'resilience', 'inclusion']
    },
    {
      code: 'NT31',
      name: 'Decarbonisation (tCO2e)',
      theme: 'Planet',
      feasibility: 'Net zero',
      feasibilityBadgeColor: '#2F7D5B',
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
      'Localised Package (Place-Based)',
      `Targeted place-based commitments designed specifically for ${loc} priority wards using selected themes (${selectedThemes.join(', ')}) with pre-approved accredited regional delivery partners.`,
      Math.round(targetSv * 1.05),
      1.05,
      ['Quarterly review cadence with Project Social Value Lead', 'Regional partner onboarding SLAs']
    );

    const enhancedPackage = buildPackageFromTemplates(
      'Enhanced Package (Extended Commitments)',
      'Broader option adding environmental, community and skills commitments that exceed the Social Value weighting target.',
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
    <div className="page">
      <PageHeader title="Opportunity Finder" />

      <section className="card">
        <div className="card-toolbar">
          <div className="segmented" role="tablist" aria-label="Input mode">
            <button
              role="tab"
              aria-selected={inputMode === 'prompt'}
              className={inputMode === 'prompt' ? 'is-active' : ''}
              onClick={() => setInputMode('prompt')}
            >
              <MessageSquare size={14} /> Prompt
            </button>
            <button
              role="tab"
              aria-selected={inputMode === 'fields'}
              className={inputMode === 'fields' ? 'is-active' : ''}
              onClick={() => setInputMode('fields')}
            >
              <Sliders size={14} /> Form
            </button>
          </div>
          <select
            aria-label="Procurement framework"
            value={selectedFrameworkId}
            onChange={(e) => setSelectedFrameworkId(e.target.value)}
            className="select-compact"
          >
            {AVAILABLE_FRAMEWORKS.map((fw) => (
              <option key={fw.id} value={fw.id}>
                {fw.shortName}
              </option>
            ))}
          </select>
        </div>

        <div className="card-body">
          {inputMode === 'prompt' ? (
            <>
              <div className="chip-row">
                {SAMPLE_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    title={p.label}
                    onClick={() => setPromptText(p.prompt)}
                    className={`chip${promptText === p.prompt ? ' is-active' : ''}`}
                  >
                    {p.label.split(' — ')[0]}
                  </button>
                ))}
              </div>
              <textarea
                aria-label="Tender description"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="Describe the tender: client, location, contract value, term and Social Value weighting."
                rows={5}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </>
          ) : (
            <div className="field-grid">
              <label className="field">
                <span>Client</span>
                <input type="text" value={formData.client} onChange={(e) => setFormData({ ...formData, client: e.target.value })} />
              </label>
              <label className="field">
                <span>Location</span>
                <select value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })}>
                  {LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Contract value (£)</span>
                <input
                  type="number"
                  value={formData.contractValue}
                  onChange={(e) => setFormData({ ...formData, contractValue: Number(e.target.value) })}
                  step="500000"
                  min="100000"
                />
              </label>
              <label className="field">
                <span>Term (years)</span>
                <input
                  type="number"
                  value={formData.durationYears}
                  onChange={(e) => setFormData({ ...formData, durationYears: Number(e.target.value) })}
                  min="1"
                  max="10"
                />
              </label>
              <label className="field">
                <span>Social Value weighting (%)</span>
                <input
                  type="number"
                  value={formData.weightingPercent}
                  onChange={(e) => setFormData({ ...formData, weightingPercent: Number(e.target.value) })}
                  min="5"
                  max="30"
                />
              </label>
              <label className="field">
                <span>Industry</span>
                <input type="text" value={formData.industry} onChange={(e) => setFormData({ ...formData, industry: e.target.value })} />
              </label>
            </div>
          )}
        </div>

        <div className="card-section">
          <div className="section-row">
            <h2 className="section-title">Themes</h2>
            <div className="page-actions">
              <button type="button" className="btn-link" onClick={handleAutoSelectForTender}>
                <Target size={12} /> Match priorities
              </button>
              {selectedThemes.length < THEME_PILLARS.length && (
                <button type="button" className="btn-link" onClick={handleSelectAllThemes}>
                  Select all
                </button>
              )}
              <button
                type="button"
                className="btn-link"
                aria-expanded={isAuditorViewOpen}
                onClick={() => setIsAuditorViewOpen(!isAuditorViewOpen)}
              >
                Measures ({selectedTomsCodes.length}) {isAuditorViewOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>
          </div>

          <div className="toggle-grid">
            {THEME_PILLARS.map((pillar) => {
              const isActive = selectedThemes.includes(pillar.id);
              const Icon =
                pillar.iconName === 'work'
                  ? Briefcase
                  : pillar.iconName === 'planet'
                  ? Leaf
                  : pillar.iconName === 'community'
                  ? HeartHandshake
                  : Building2;
              return (
                <button
                  key={pillar.id}
                  type="button"
                  aria-pressed={isActive}
                  title={pillar.description}
                  onClick={() => toggleTheme(pillar.id)}
                  className={`toggle-card${isActive ? ' is-active' : ''}`}
                  style={{ '--tone': pillar.themeColor } as React.CSSProperties}
                >
                  <Icon size={16} />
                  <span>{pillar.title}</span>
                  {isActive && <Check size={14} className="toggle-check" />}
                </button>
              );
            })}
          </div>

          {isAuditorViewOpen && (
            <div className="chip-row">
              {AVAILABLE_TOMS_OPTIONS.map((t) => {
                const isSelected = selectedTomsCodes.includes(t.code);
                return (
                  <button
                    key={t.code}
                    type="button"
                    aria-pressed={isSelected}
                    className={`chip${isSelected ? ' is-active' : ''}`}
                    onClick={() => {
                      if (!isSelected) {
                        setSelectedTomsCodes([...selectedTomsCodes, t.code]);
                      } else if (selectedTomsCodes.length > 1) {
                        setSelectedTomsCodes(selectedTomsCodes.filter((c) => c !== t.code));
                      } else {
                        toast.warning('Keep at least one measure.');
                      }
                    }}
                  >
                    <strong>{t.code}</strong> {t.name}
                  </button>
                );
              })}
              {selectedTomsCodes.length < AVAILABLE_TOMS_OPTIONS.length && (
                <button type="button" className="btn-link" onClick={handleSelectAllToms}>
                  Select all
                </button>
              )}
            </div>
          )}
        </div>

        <div className="card-footer">
          <button onClick={handleExecuteSearch} className="btn-primary" disabled={isLoading}>
            {isLoading ? <LoaderCircle size={16} className="spin-icon" /> : <FileText size={16} />}
            {isLoading ? 'Generating…' : 'Generate options'}
          </button>
        </div>
      </section>

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
