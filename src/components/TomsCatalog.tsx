import React, { useState, useEffect, useMemo } from 'react';
import {
  fetchTomsMetrics,
  createTomsMetric,
  updateTomsMetric,
  deleteTomsMetric,
  resetDefaultTomsMetrics,
  fetchMasterInitiatives
} from '../api/client';
import { useToast } from '../context/ToastContext';
import { ConfirmationModal } from './ConfirmationModal';
import { formatGbp } from '../utils/formatters';
import type {
  TOMsMetric,
  TomsMetricCreate,
  TomsMetricUpdate,
  MasterInitiative
} from '../types';
import {
  Plus,
  Search,
  RefreshCw,
  Edit3,
  Trash2,
  HelpCircle,
  FileCheck,
  Award,
  ShieldAlert,
  Leaf,
  Briefcase,
  Users,
  Coins,
  Download,
  X,
  List,
  LayoutGrid,
  Scale,
  FolderGit2,
  ExternalLink
} from 'lucide-react';
import { Pagination } from './Pagination';

interface TomsCatalogProps {
  onSendToPrompt?: (promptText: string) => void;
}

export const TomsCatalog: React.FC<TomsCatalogProps> = () => {
  const toast = useToast();

  // Active Main Tab: TOMs 2025 vs Master Initiatives
  const [activeMainTab, setActiveMainTab] = useState<'toms' | 'initiatives'>('toms');

  // =========================================================================
  // TOMs State
  // =========================================================================
  const [metrics, setMetrics] = useState<TOMsMetric[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTheme, setSelectedTheme] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(8);

  // Add / Edit Modal state for TOMs
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [formData, setFormData] = useState<TomsMetricCreate>({
    code: '',
    name: '',
    theme: 'Work',
    outcome: '',
    unit: 'weeks',
    unit_value_gbp: 250.0,
    description: '',
    evidence_required: '',
    ppn_mapping: 'MAC 2.2: Employment and Skills',
    source: 'National TOMs 2025'
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Delete modal state
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    metric: TOMsMetric | null;
  }>({
    isOpen: false,
    metric: null
  });
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // =========================================================================
  // Master Initiatives State (37 Audited NHS Commitments)
  // =========================================================================
  const [initiatives, setInitiatives] = useState<MasterInitiative[]>([]);
  const [isIniLoading, setIsIniLoading] = useState<boolean>(true);
  const [selectedPillar, setSelectedPillar] = useState<string>('All');
  const [iniSearch, setIniSearch] = useState<string>('');
  const [iniViewMode, setIniViewMode] = useState<'list' | 'cards'>('list');
  const [iniPage, setIniPage] = useState<number>(1);
  const [iniPageSize, setIniPageSize] = useState<number>(8);
  const [selectedInitiativeModal, setSelectedInitiativeModal] = useState<MasterInitiative | null>(null);

  // Load metrics from API
  const loadMetrics = async () => {
    setIsLoading(true);
    try {
      const data = await fetchTomsMetrics();
      setMetrics(data);
    } catch (err: any) {
      toast.error('Could not load TOMs catalog: ' + (err.message || 'Server error'));
    } finally {
      setIsLoading(false);
    }
  };

  // Load initiatives from API / constant
  const loadInitiatives = async () => {
    setIsIniLoading(true);
    try {
      const data = await fetchMasterInitiatives();
      setInitiatives(data);
    } catch (err: any) {
      toast.error('Could not load Master Initiatives: ' + (err.message || 'Server error'));
    } finally {
      setIsIniLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
    loadInitiatives();
  }, []);

  // Filtered metrics list
  const filteredMetrics = useMemo(() => {
    return metrics.filter((m) => {
      const matchesTheme =
        selectedTheme === 'All' ||
        m.theme.toLowerCase().includes(selectedTheme.toLowerCase());

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        m.code.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        (m.outcome && m.outcome.toLowerCase().includes(q)) ||
        (m.ppn_mapping && m.ppn_mapping.toLowerCase().includes(q)) ||
        (m.description && m.description.toLowerCase().includes(q));

      return matchesTheme && matchesSearch;
    });
  }, [metrics, selectedTheme, searchQuery]);

  // Statistics for TOMs
  const themeCounts = useMemo(() => {
    const counts: Record<string, number> = { All: metrics.length };
    metrics.forEach((m) => {
      const t = m.theme || 'Other';
      counts[t] = (counts[t] || 0) + 1;
    });
    return counts;
  }, [metrics]);

  // Reset page when theme or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTheme, searchQuery]);

  // Paginated metrics slice
  const paginatedMetrics = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMetrics.slice(start, start + pageSize);
  }, [filteredMetrics, currentPage, pageSize]);

  // =========================================================================
  // Initiatives Filter & Pagination
  // =========================================================================
  const filteredInitiatives = useMemo(() => {
    return initiatives.filter((ini) => {
      let matchesPillar = true;
      if (selectedPillar !== 'All') {
        if (selectedPillar === 'SV1') matchesPillar = ini.pillar === 'SV1';
        else if (selectedPillar === 'SV2') matchesPillar = ini.pillar === 'SV2';
        else if (selectedPillar === 'SV3') matchesPillar = ini.pillar === 'SV3';
        else if (selectedPillar === 'Governance') matchesPillar = ini.pillar === 'ALL' || ini.pillar.toLowerCase().includes('gov') || ini.name.toLowerCase().includes('governance');
      }

      const q = iniSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        ini.id.toLowerCase().includes(q) ||
        ini.name.toLowerCase().includes(q) ||
        ini.description.toLowerCase().includes(q) ||
        ini.delivered_by.toLowerCase().includes(q) ||
        ini.mac.toLowerCase().includes(q) ||
        (ini.notes && ini.notes.toLowerCase().includes(q));

      return matchesPillar && matchesSearch;
    });
  }, [initiatives, selectedPillar, iniSearch]);

  const pillarCounts = useMemo(() => {
    const counts: Record<string, number> = {
      All: initiatives.length,
      SV1: 0,
      SV2: 0,
      SV3: 0,
      Governance: 0
    };
    initiatives.forEach((ini) => {
      if (ini.pillar === 'SV1') counts.SV1 += 1;
      else if (ini.pillar === 'SV2') counts.SV2 += 1;
      else if (ini.pillar === 'SV3') counts.SV3 += 1;
      else counts.Governance += 1;
    });
    return counts;
  }, [initiatives]);

  useEffect(() => {
    setIniPage(1);
  }, [selectedPillar, iniSearch]);

  const paginatedInitiatives = useMemo(() => {
    const start = (iniPage - 1) * iniPageSize;
    return filteredInitiatives.slice(start, start + iniPageSize);
  }, [filteredInitiatives, iniPage, iniPageSize]);

  const totalDefensibleValue = useMemo(() => {
    return initiatives.reduce((sum, item) => sum + (item.defensible_value_gbp || 0), 0);
  }, [initiatives]);

  // Helper theme icons & styles
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
        label: 'Planet & Climate'
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
    if (t.includes('economy') || t.includes('sme')) {
      return {
        icon: <Coins size={12} />,
        bg: 'rgba(139, 92, 246, 0.12)',
        color: '#7c3aed',
        border: 'rgba(139, 92, 246, 0.25)',
        label: 'Economy & SMEs'
      };
    }
    return {
      icon: <ShieldAlert size={12} />,
      bg: 'rgba(239, 68, 68, 0.12)',
      color: '#dc2626',
      border: 'rgba(239, 68, 68, 0.25)',
      label: theme
    };
  };

  const getPillarBadge = (pillar: string) => {
    if (pillar === 'SV1') {
      return {
        label: 'SV1 Fighting Climate Change',
        bg: 'rgba(16, 185, 129, 0.12)',
        color: '#059669',
        border: 'rgba(16, 185, 129, 0.25)'
      };
    }
    if (pillar === 'SV2') {
      return {
        label: 'SV2 Tackling Economic Inequality',
        bg: 'rgba(59, 130, 246, 0.12)',
        color: '#2563eb',
        border: 'rgba(59, 130, 246, 0.25)'
      };
    }
    if (pillar === 'SV3') {
      return {
        label: 'SV3 Equal Opportunity & Modern Slavery',
        bg: 'rgba(139, 92, 246, 0.12)',
        color: '#7c3aed',
        border: 'rgba(139, 92, 246, 0.25)'
      };
    }
    return {
      label: 'Programme Governance',
      bg: 'rgba(107, 114, 128, 0.12)',
      color: '#4b5563',
      border: 'rgba(107, 114, 128, 0.25)'
    };
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingCode(null);
    setFormData({
      code: `NT${metrics.length + 5}`,
      name: '',
      theme: 'Work',
      outcome: '',
      unit: 'weeks',
      unit_value_gbp: 250.0,
      description: '',
      evidence_required: '',
      ppn_mapping: 'MAC 2.2: Employment and Skills',
      source: 'National TOMs 2025'
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (m: TOMsMetric) => {
    setEditingCode(m.code);
    setFormData({
      code: m.code,
      name: m.name,
      theme: m.theme,
      outcome: m.outcome || '',
      unit: m.unit,
      unit_value_gbp: m.unit_value_gbp,
      description: m.description || '',
      evidence_required: m.evidence_required || '',
      ppn_mapping: m.ppn_mapping || '',
      source: m.source || 'National TOMs'
    });
    setIsModalOpen(true);
  };

  // Save Add/Edit
  const handleSaveMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim() || !formData.unit.trim()) {
      toast.warning('Please fill in required fields: Code, Title, and Unit.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingCode) {
        const updatePayload: TomsMetricUpdate = {
          name: formData.name,
          theme: formData.theme,
          outcome: formData.outcome,
          unit: formData.unit,
          unit_value_gbp: Number(formData.unit_value_gbp),
          description: formData.description,
          evidence_required: formData.evidence_required,
          ppn_mapping: formData.ppn_mapping,
          source: formData.source
        };
        await updateTomsMetric(editingCode, updatePayload);
        toast.success(`Measure '${editingCode}' updated successfully!`);
      } else {
        await createTomsMetric({
          code: formData.code.trim().toUpperCase(),
          name: formData.name.trim(),
          theme: formData.theme,
          outcome: formData.outcome,
          unit: formData.unit.trim(),
          unit_value_gbp: Number(formData.unit_value_gbp),
          description: formData.description,
          evidence_required: formData.evidence_required,
          ppn_mapping: formData.ppn_mapping,
          source: formData.source
        });
        toast.success(`Measure '${formData.code.toUpperCase()}' created!`);
      }
      setIsModalOpen(false);
      loadMetrics();
    } catch (err: any) {
      toast.error(err.message || 'Error saving measure');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Metric
  const handleConfirmDelete = async () => {
    if (!deleteModalState.metric) return;
    setIsDeleting(true);
    try {
      await deleteTomsMetric(deleteModalState.metric.code);
      toast.success(`Measure '${deleteModalState.metric.code}' deactivated.`);
      setDeleteModalState({ isOpen: false, metric: null });
      loadMetrics();
    } catch (err: any) {
      toast.error(err.message || 'Failed to deactivate metric');
    } finally {
      setIsDeleting(false);
    }
  };

  // Reset Benchmarks
  const handleResetDefaults = async () => {
    if (confirm('Restore verified 2025 National TOMs and NHS benchmarks? Custom modifications will be reset.')) {
      setIsLoading(true);
      try {
        await resetDefaultTomsMetrics();
        toast.success('Successfully restored 2025 National TOMs & NHS benchmarks!');
        await loadMetrics();
      } catch (err: any) {
        toast.error('Failed to reset benchmarks: ' + (err.message || 'Server error'));
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Export CSV for TOMs
  const handleExportCatalog = () => {
    const csvHeader = 'Code,Name,Theme,Outcome,Unit,UnitValueGBP,PPNMapping,EvidenceRequired\n';
    const csvRows = metrics
      .map(
        (m) =>
          `"${m.code}","${m.name.replace(/"/g, '""')}","${m.theme}","${(m.outcome || '').replace(/"/g, '""')}","${m.unit}",${m.unit_value_gbp},"${(m.ppn_mapping || '').replace(/"/g, '""')}","${(m.evidence_required || '').replace(/"/g, '""')}"`
      )
      .join('\n');

    const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `National_TOMS_Catalog_2025_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('TOMS Catalog exported to CSV!');
  };

  // Export CSV for Initiatives
  const handleExportInitiatives = () => {
    const csvHeader = 'ID,Pillar,MAC,Initiative,WhatIsCommitted,Volume,DeliveredBy,DefensibleValueGBP,Sch8Ref,Sch3bRef\n';
    const csvRows = initiatives
      .map(
        (i) =>
          `"${i.id}","${i.pillar}","${i.mac}","${i.name.replace(/"/g, '""')}","${i.description.replace(/"/g, '""')}","${(i.committed_volume || '').replace(/"/g, '""')}","${(i.delivered_by || '').replace(/"/g, '""')}",${i.defensible_value_gbp},"${i.sch8_ref || ''}","${i.sch3b_ref || ''}"`
      )
      .join('\n');

    const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Infosys_Master_Initiatives_NHS_FWS_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('37 Master Initiatives exported to CSV!');
  };

  return (
    <div style={{ width: '100%', maxWidth: '1440px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Award size={14} style={{ color: 'var(--color-primary)' }} />
            <span>Master Knowledge Base & Scoring Rules</span>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            National TOMs & Master Initiatives
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.35rem', maxWidth: '780px' }}>
            Audited Social Value measures, 2025 Edition proxy valuations (£), and Infosys's 37 Master NHS FWS contract commitments.
            Verified audit defensibility and PPN 06/20 Model Award Criteria.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {activeMainTab === 'toms' ? (
            <>
              <button onClick={handleOpenAdd} className="btn-primary" style={{ fontSize: '0.82rem' }}>
                <Plus size={15} /> Add Measure
              </button>

              <button onClick={handleExportCatalog} className="btn-secondary" title="Export CSV" style={{ fontSize: '0.82rem' }}>
                <Download size={14} /> Export CSV
              </button>

              <button
                onClick={handleResetDefaults}
                className="btn-secondary"
                title="Restore NHS & Standard Benchmarks"
                style={{ fontSize: '0.82rem' }}
              >
                <RefreshCw size={14} /> Reset Benchmarks
              </button>
            </>
          ) : (
            <>
              <button onClick={handleExportInitiatives} className="btn-secondary" title="Export Initiatives CSV" style={{ fontSize: '0.82rem' }}>
                <Download size={14} /> Export 37 Initiatives CSV
              </button>
            </>
          )}
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────── */}
      {/* MASTER TAB SWITCHER */}
      {/* ──────────────────────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          borderBottom: '2px solid var(--border-subtle)',
          paddingBottom: '0.2rem'
        }}
      >
        <button
          type="button"
          onClick={() => setActiveMainTab('toms')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.25rem',
            fontSize: '0.9rem',
            fontWeight: activeMainTab === 'toms' ? 600 : 500,
            border: 'none',
            borderBottom: activeMainTab === 'toms' ? '3px solid var(--color-primary)' : '3px solid transparent',
            marginBottom: '-2px',
            backgroundColor: 'transparent',
            color: activeMainTab === 'toms' ? 'var(--color-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Scale size={16} />
          <span>National TOMs 2025 Measures ({metrics.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('initiatives')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.25rem',
            fontSize: '0.9rem',
            fontWeight: activeMainTab === 'initiatives' ? 600 : 500,
            border: 'none',
            borderBottom: activeMainTab === 'initiatives' ? '3px solid var(--color-primary)' : '3px solid transparent',
            marginBottom: '-2px',
            backgroundColor: 'transparent',
            color: activeMainTab === 'initiatives' ? 'var(--color-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <FolderGit2 size={16} />
          <span>Infosys Master Initiatives ({initiatives.length})</span>
          <span
            style={{
              fontSize: '0.7rem',
              padding: '0.15rem 0.45rem',
              borderRadius: '12px',
              backgroundColor: '#dcfce7',
              color: '#15803d',
              fontWeight: 700
            }}
          >
            Audited NHS FWS
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: NATIONAL TOMS MEASURES                                             */}
      {/* ========================================================================= */}
      {activeMainTab === 'toms' && (
        <>
          {/* FILTER & SEARCH BAR */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              padding: '1.25rem 1.5rem',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              {/* Search Box */}
              <div style={{ position: 'relative', flex: '1', minWidth: '260px', maxWidth: '420px' }}>
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-tertiary)'
                  }}
                />
                <input
                  type="text"
                  placeholder="Search code, initiative, PPN MAC, keywords…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: '2.2rem', width: '100%', fontSize: '0.85rem' }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '0.6rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-tertiary)'
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Measure Counter & View Mode Switcher */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Showing <strong>{filteredMetrics.length}</strong> of <strong>{metrics.length}</strong> verified measures
                </div>

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
                    title="Cards Grid View"
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

            {/* Theme Pills */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {['All', 'Work', 'Planet', 'Community', 'Economy', 'Modern Slavery'].map((themeName) => {
                const isSelected = selectedTheme === themeName;
                return (
                  <button
                    key={themeName}
                    onClick={() => setSelectedTheme(themeName)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.78rem',
                      fontWeight: isSelected ? 600 : 500,
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--color-primary)' : 'var(--border-subtle)',
                      backgroundColor: isSelected ? 'var(--color-primary-subtle, rgba(59,130,246,0.12))' : 'transparent',
                      color: isSelected ? 'var(--color-primary)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {themeName} {themeCounts[themeName] ? `(${themeCounts[themeName]})` : ''}
                  </button>
                );
              })}
            </div>
          </div>

          {/* TOMS METRICS LIST / GRID */}
          {isLoading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <RefreshCw size={24} className="spin-icon" style={{ margin: '0 auto 0.75rem' }} />
              <div>Loading National TOMs Catalog…</div>
            </div>
          ) : filteredMetrics.length === 0 ? (
            <div
              style={{
                padding: '3rem',
                textAlign: 'center',
                backgroundColor: 'var(--bg-surface)',
                border: '1px dashed var(--border-subtle)',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <HelpCircle size={32} style={{ color: 'var(--text-tertiary)', margin: '0 auto 0.5rem' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>No matching measures found</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Try adjusting your search query or theme filter, or click below to restore defaults.
              </p>
              <button onClick={handleResetDefaults} className="btn-secondary" style={{ marginTop: '1rem', fontSize: '0.8rem' }}>
                Restore Verified Benchmarks
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {viewMode === 'list' ? (
                /* List / Table Format */
                <div
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    overflowX: 'auto',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                    <thead>
                      <tr
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          backgroundColor: 'var(--bg-surface-subtle)',
                          color: 'var(--text-secondary)',
                          fontSize: '0.74rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em'
                        }}
                      >
                        <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Code & Theme</th>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: 600, minWidth: '220px' }}>Measure Name & Scope</th>
                        <th style={{ padding: '0.75rem 0.85rem', fontWeight: 600 }}>Proxy Valuation (£)</th>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: 600, minWidth: '200px' }}>PPN 06/20 Model Criteria</th>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: 600, minWidth: '220px' }}>Schedule 3b Evidence</th>
                        <th style={{ padding: '0.75rem 0.85rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedMetrics.map((m) => {
                        const badge = getThemeBadge(m.theme);
                        const isNHSBenchmark = m.code.startsWith('NHS');

                        return (
                          <tr
                            key={m.code}
                            style={{
                              borderBottom: '1px solid var(--border-subtle)',
                              transition: 'background-color 0.1s ease'
                            }}
                            className="table-row-hover"
                          >
                            {/* Code & Theme */}
                            <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-start' }}>
                                <span
                                  style={{
                                    fontFamily: 'monospace',
                                    fontWeight: 700,
                                    fontSize: '0.82rem',
                                    padding: '0.15rem 0.45rem',
                                    borderRadius: '4px',
                                    backgroundColor: 'var(--bg-surface-subtle)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-subtle)'
                                  }}
                                >
                                  {m.code}
                                </span>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    padding: '0.12rem 0.45rem',
                                    borderRadius: '12px',
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    backgroundColor: badge.bg,
                                    color: badge.color,
                                    border: `1px solid ${badge.border}`
                                  }}
                                >
                                  {badge.icon}
                                  {badge.label}
                                </span>
                                {isNHSBenchmark && (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      padding: '0.1rem 0.4rem',
                                      borderRadius: '4px',
                                      fontSize: '0.66rem',
                                      fontWeight: 600,
                                      backgroundColor: 'rgba(30, 64, 175, 0.1)',
                                      color: '#1d4ed8',
                                      border: '1px solid rgba(30, 64, 175, 0.2)'
                                    }}
                                  >
                                    NHS Benchmark
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Measure Name & Scope */}
                            <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem', marginBottom: '0.25rem' }}>
                                {m.name}
                              </div>
                              {m.outcome && (
                                <div style={{ fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: 500, marginBottom: '0.25rem' }}>
                                  {m.outcome}
                                </div>
                              )}
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                {m.description}
                              </div>
                            </td>

                            {/* Proxy Valuation (£) */}
                            <td style={{ padding: '0.85rem 0.85rem', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                                {formatGbp(m.unit_value_gbp)}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '0.15rem' }}>
                                per {m.unit}
                              </div>
                            </td>

                            {/* PPN Criteria */}
                            <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  fontSize: '0.75rem',
                                  fontWeight: 500,
                                  color: 'var(--text-secondary)',
                                  backgroundColor: 'var(--bg-surface-subtle)',
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '4px',
                                  border: '1px solid var(--border-subtle)',
                                  lineHeight: 1.3
                                }}
                              >
                                {m.ppn_mapping || 'PPN 06/20 Model Award Criteria'}
                              </span>
                            </td>

                            {/* Schedule 3b Evidence */}
                            <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                              <div
                                style={{
                                  fontSize: '0.78rem',
                                  color: 'var(--text-secondary)',
                                  lineHeight: 1.4,
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: '0.35rem'
                                }}
                              >
                                <FileCheck size={13} style={{ color: '#059669', flexShrink: 0, marginTop: '2px' }} />
                                <span>{m.evidence_required || 'Audited contract delivery ledger & beneficiary logs'}</span>
                              </div>
                            </td>

                            {/* Actions */}
                            <td style={{ padding: '0.85rem 0.85rem', verticalAlign: 'top', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                                <button
                                  onClick={() => handleOpenEdit(m)}
                                  className="btn-icon"
                                  title="Edit Measure"
                                  style={{ padding: '0.35rem', borderRadius: '4px' }}
                                >
                                  <Edit3 size={14} />
                                </button>
                                <button
                                  onClick={() => setDeleteModalState({ isOpen: true, metric: m })}
                                  className="btn-icon text-danger"
                                  title="Deactivate Measure"
                                  style={{ padding: '0.35rem', borderRadius: '4px' }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Cards Grid Format */
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                  {paginatedMetrics.map((m) => {
                    const badge = getThemeBadge(m.theme);
                    return (
                      <div
                        key={m.code}
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-md)',
                          padding: '1.25rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '0.75rem',
                          boxShadow: 'var(--shadow-sm)'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                            <span
                              style={{
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                padding: '0.15rem 0.45rem',
                                borderRadius: '4px',
                                backgroundColor: 'var(--bg-surface-subtle)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-subtle)'
                              }}
                            >
                              {m.code}
                            </span>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '12px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                backgroundColor: badge.bg,
                                color: badge.color,
                                border: `1px solid ${badge.border}`
                              }}
                            >
                              {badge.icon}
                              {badge.label}
                            </span>
                          </div>

                          <h4 style={{ fontSize: '0.98rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                            {m.name}
                          </h4>
                          {m.outcome && (
                            <div style={{ fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: 500, marginBottom: '0.4rem' }}>
                              {m.outcome}
                            </div>
                          )}
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '0.75rem' }}>
                            {m.description}
                          </p>
                        </div>

                        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Proxy Valuation</div>
                              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {formatGbp(m.unit_value_gbp)} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-secondary)' }}>/ {m.unit}</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                              <button
                                onClick={() => handleOpenEdit(m)}
                                className="btn-icon"
                                title="Edit Measure"
                                style={{ padding: '0.35rem' }}
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => setDeleteModalState({ isOpen: true, metric: m })}
                                className="btn-icon text-danger"
                                title="Deactivate Measure"
                                style={{ padding: '0.35rem' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          {m.evidence_required && (
                            <div
                              style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-secondary)',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.3rem',
                                backgroundColor: 'var(--bg-surface-subtle)',
                                padding: '0.35rem 0.5rem',
                                borderRadius: '4px'
                              }}
                            >
                              <FileCheck size={12} style={{ color: '#059669', flexShrink: 0, marginTop: '2px' }} />
                              <span style={{ fontSize: '0.72rem' }}>{m.evidence_required}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalItems={filteredMetrics.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[8, 16, 32, 50]}
              />
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: INFOSYS MASTER INITIATIVES (37 AUDITED COMMITMENTS)                */}
      {/* ========================================================================= */}
      {activeMainTab === 'initiatives' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Top Summary Banner */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
              padding: '1.25rem',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>
                Total Master Commitments
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                {initiatives.length} Initiatives
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                Across SV1, SV2, SV3 Pillars
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>
                Defensible TOMs Valuation
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#059669', marginTop: '0.2rem' }}>
                {formatGbp(totalDefensibleValue)}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                Contractual audit-proof commitment
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>
                Contract Specification
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                NHS FWS Tender
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                Schedule 8 & Schedule 3b Audited
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>
                Verified Delivery Partners
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary)', marginTop: '0.35rem' }}>
                Sopht, Good Things Foundation, Oracle, CSH, Unseen, QA Consulting
              </div>
            </div>
          </div>

          {/* Search & Pillar Filters */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              padding: '1.25rem 1.5rem',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              {/* Search Box */}
              <div style={{ position: 'relative', flex: '1', minWidth: '260px', maxWidth: '420px' }}>
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-tertiary)'
                  }}
                />
                <input
                  type="text"
                  placeholder="Search initiative ID, keyword, partner (Sopht, Good Things, Oracle)…"
                  value={iniSearch}
                  onChange={(e) => setIniSearch(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: '2.2rem', width: '100%', fontSize: '0.85rem' }}
                />
                {iniSearch && (
                  <button
                    onClick={() => setIniSearch('')}
                    style={{
                      position: 'absolute',
                      right: '0.6rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-tertiary)'
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* View Mode & Counter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Showing <strong>{filteredInitiatives.length}</strong> of <strong>{initiatives.length}</strong> master initiatives
                </div>

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
                    onClick={() => setIniViewMode('list')}
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
                      backgroundColor: iniViewMode === 'list' ? 'var(--bg-surface)' : 'transparent',
                      color: iniViewMode === 'list' ? 'var(--color-primary)' : 'var(--text-muted)',
                      boxShadow: iniViewMode === 'list' ? 'var(--shadow-sm)' : 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <List size={14} />
                    <span>Table</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIniViewMode('cards')}
                    title="Cards Grid View"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '0.25rem 0.55rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      border: 'none',
                      borderRadius: '4px',
                      backgroundColor: iniViewMode === 'cards' ? 'var(--bg-surface)' : 'transparent',
                      color: iniViewMode === 'cards' ? 'var(--color-primary)' : 'var(--text-muted)',
                      boxShadow: iniViewMode === 'cards' ? 'var(--shadow-sm)' : 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <LayoutGrid size={14} />
                    <span>Cards</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Pillar Filter Pills */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {[
                { id: 'All', label: 'All Initiatives' },
                { id: 'SV1', label: 'SV1 Fighting Climate Change' },
                { id: 'SV2', label: 'SV2 Tackling Economic Inequality' },
                { id: 'SV3', label: 'SV3 Equal Opportunity & Modern Slavery' },
                { id: 'Governance', label: 'Programme Governance' }
              ].map((p) => {
                const isSelected = selectedPillar === p.id;
                const count = pillarCounts[p.id as keyof typeof pillarCounts] || 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPillar(p.id)}
                    style={{
                      padding: '0.35rem 0.85rem',
                      borderRadius: '20px',
                      fontSize: '0.78rem',
                      fontWeight: isSelected ? 600 : 500,
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--color-primary)' : 'var(--border-subtle)',
                      backgroundColor: isSelected ? 'var(--color-primary-subtle, rgba(59,130,246,0.12))' : 'transparent',
                      color: isSelected ? 'var(--color-primary)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {p.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table / Grid View of Initiatives */}
          {isIniLoading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <RefreshCw size={24} className="spin-icon" style={{ margin: '0 auto 0.75rem' }} />
              <div>Loading Infosys Master Initiatives…</div>
            </div>
          ) : filteredInitiatives.length === 0 ? (
            <div
              style={{
                padding: '3rem',
                textAlign: 'center',
                backgroundColor: 'var(--bg-surface)',
                border: '1px dashed var(--border-subtle)',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <HelpCircle size={32} style={{ color: 'var(--text-tertiary)', margin: '0 auto 0.5rem' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>No matching initiatives found</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Try adjusting your search query or pillar filter.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {iniViewMode === 'list' ? (
                /* Table View */
                <div
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    overflowX: 'auto',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                    <thead>
                      <tr
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          backgroundColor: 'var(--bg-surface-subtle)',
                          color: 'var(--text-secondary)',
                          fontSize: '0.74rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em'
                        }}
                      >
                        <th style={{ padding: '0.75rem 1rem', fontWeight: 600, width: '130px' }}>ID & Pillar</th>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: 600, minWidth: '260px' }}>Initiative & Commitment</th>
                        <th style={{ padding: '0.75rem 0.85rem', fontWeight: 600, minWidth: '130px' }}>Committed Volume</th>
                        <th style={{ padding: '0.75rem 0.85rem', fontWeight: 600, minWidth: '160px' }}>Delivered By</th>
                        <th style={{ padding: '0.75rem 0.85rem', fontWeight: 600, width: '110px' }}>PPN MAC</th>
                        <th style={{ padding: '0.75rem 0.85rem', fontWeight: 600, width: '140px' }}>Defensible Value</th>
                        <th style={{ padding: '0.75rem 0.85rem', fontWeight: 600, width: '110px' }}>Schedule Ref</th>
                        <th style={{ padding: '0.75rem 0.85rem', fontWeight: 600, textAlign: 'right', width: '100px' }}>Specs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedInitiatives.map((ini) => {
                        const pBadge = getPillarBadge(ini.pillar);
                        const hasDefensibleVal = (ini.defensible_value_gbp || 0) > 0;

                        return (
                          <tr
                            key={ini.id}
                            style={{
                              borderBottom: '1px solid var(--border-subtle)',
                              transition: 'background-color 0.1s ease'
                            }}
                            className="table-row-hover"
                          >
                            {/* ID & Pillar */}
                            <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'flex-start' }}>
                                <span
                                  style={{
                                    fontFamily: 'monospace',
                                    fontWeight: 700,
                                    fontSize: '0.82rem',
                                    padding: '0.15rem 0.45rem',
                                    borderRadius: '4px',
                                    backgroundColor: 'var(--bg-surface-subtle)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-subtle)'
                                  }}
                                >
                                  {ini.id}
                                </span>
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    fontWeight: 600,
                                    padding: '0.12rem 0.45rem',
                                    borderRadius: '12px',
                                    backgroundColor: pBadge.bg,
                                    color: pBadge.color,
                                    border: `1px solid ${pBadge.border}`,
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {ini.pillar || 'Gov'}
                                </span>
                              </div>
                            </td>

                            {/* Title & Scope */}
                            <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem', marginBottom: '0.25rem' }}>
                                {ini.name}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                {ini.description}
                              </div>
                            </td>

                            {/* Committed Volume */}
                            <td style={{ padding: '0.85rem 0.85rem', verticalAlign: 'top' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  color: 'var(--text-primary)',
                                  backgroundColor: 'var(--bg-surface-subtle)',
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '4px',
                                  border: '1px solid var(--border-subtle)'
                                }}
                              >
                                {ini.committed_volume || 'Contract Duration'}
                              </span>
                            </td>

                            {/* Delivered By */}
                            <td style={{ padding: '0.85rem 0.85rem', verticalAlign: 'top' }}>
                              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                                {ini.delivered_by || 'Infosys'}
                              </div>
                              {ini.attribution && (
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '0.15rem' }}>
                                  {ini.attribution}
                                </div>
                              )}
                            </td>

                            {/* PPN MAC */}
                            <td style={{ padding: '0.85rem 0.85rem', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 500,
                                  color: 'var(--text-secondary)',
                                  backgroundColor: 'var(--bg-surface-subtle)',
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '4px',
                                  border: '1px solid var(--border-subtle)'
                                }}
                              >
                                {ini.mac || 'MAC 4.1'}
                              </span>
                            </td>

                            {/* Defensible Value */}
                            <td style={{ padding: '0.85rem 0.85rem', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                              {hasDefensibleVal ? (
                                <div
                                  style={{
                                    display: 'inline-block',
                                    padding: '0.2rem 0.5rem',
                                    borderRadius: '4px',
                                    backgroundColor: 'rgba(5, 150, 105, 0.1)',
                                    color: '#059669',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    border: '1px solid rgba(5, 150, 105, 0.25)'
                                  }}
                                >
                                  {formatGbp(ini.defensible_value_gbp)}
                                </div>
                              ) : (
                                <span
                                  style={{
                                    fontSize: '0.72rem',
                                    color: 'var(--text-tertiary)',
                                    fontStyle: 'italic'
                                  }}
                                >
                                  {ini.valuation_status || 'Qualitative'}
                                </span>
                              )}
                            </td>

                            {/* Schedule Ref */}
                            <td style={{ padding: '0.85rem 0.85rem', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                {ini.sch8_ref && (
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                                    {ini.sch8_ref}
                                  </span>
                                )}
                                {ini.sch3b_ref && (
                                  <span style={{ fontSize: '0.7rem', color: '#059669', fontFamily: 'monospace' }}>
                                    {ini.sch3b_ref}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Action Button */}
                            <td style={{ padding: '0.85rem 0.85rem', verticalAlign: 'top', textAlign: 'right' }}>
                              <button
                                onClick={() => setSelectedInitiativeModal(ini)}
                                className="btn-secondary"
                                style={{
                                  fontSize: '0.75rem',
                                  padding: '0.3rem 0.6rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem'
                                }}
                              >
                                <span>Specs</span>
                                <ExternalLink size={12} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Cards Grid View */
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                  {paginatedInitiatives.map((ini) => {
                    const pBadge = getPillarBadge(ini.pillar);
                    const hasDefensibleVal = (ini.defensible_value_gbp || 0) > 0;

                    return (
                      <div
                        key={ini.id}
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-md)',
                          padding: '1.25rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '0.75rem',
                          boxShadow: 'var(--shadow-sm)'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                            <span
                              style={{
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                fontSize: '0.82rem',
                                padding: '0.15rem 0.45rem',
                                borderRadius: '4px',
                                backgroundColor: 'var(--bg-surface-subtle)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-subtle)'
                              }}
                            >
                              {ini.id}
                            </span>
                            <span
                              style={{
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                padding: '0.15rem 0.5rem',
                                borderRadius: '12px',
                                backgroundColor: pBadge.bg,
                                color: pBadge.color,
                                border: `1px solid ${pBadge.border}`
                              }}
                            >
                              {ini.pillar || 'Gov'}
                            </span>
                          </div>

                          <h4 style={{ fontSize: '0.96rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                            {ini.name}
                          </h4>
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '0.75rem' }}>
                            {ini.description}
                          </p>
                        </div>

                        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-tertiary)' }}>
                              Delivered by: <strong style={{ color: 'var(--color-primary)' }}>{ini.delivered_by}</strong>
                            </div>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 500,
                                color: 'var(--text-secondary)',
                                backgroundColor: 'var(--bg-surface-subtle)',
                                padding: '0.1rem 0.4rem',
                                borderRadius: '4px',
                                border: '1px solid var(--border-subtle)'
                              }}
                            >
                              {ini.mac}
                            </span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                            <div>
                              {hasDefensibleVal ? (
                                <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#059669' }}>
                                  {formatGbp(ini.defensible_value_gbp)}
                                </div>
                              ) : (
                                <div style={{ fontSize: '0.76rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                                  {ini.valuation_status || 'Qualitative'}
                                </div>
                              )}
                            </div>

                            <button
                              onClick={() => setSelectedInitiativeModal(ini)}
                              className="btn-secondary"
                              style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                            >
                              View Specs
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination for Initiatives */}
              <Pagination
                currentPage={iniPage}
                totalItems={filteredInitiatives.length}
                pageSize={iniPageSize}
                onPageChange={setIniPage}
                onPageSizeChange={setIniPageSize}
                pageSizeOptions={[8, 15, 25, 40]}
              />
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────── */}
      {/* INITIATIVE AUDIT SPECS MODAL                                                 */}
      {/* ──────────────────────────────────────────────────────────────────────────── */}
      {selectedInitiativeModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={() => setSelectedInitiativeModal(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '650px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: 'var(--shadow-xl)',
              padding: '1.75rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      backgroundColor: 'var(--bg-surface-subtle)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    {selectedInitiativeModal.id}
                  </span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '0.2rem 0.55rem',
                      borderRadius: '12px',
                      ...getPillarBadge(selectedInitiativeModal.pillar)
                    }}
                  >
                    {selectedInitiativeModal.pillar} • {selectedInitiativeModal.mac}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {selectedInitiativeModal.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedInitiativeModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem' }}>
              {/* Scope & Commitment */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  What is Committed (Tender Method Statement)
                </label>
                <div style={{ marginTop: '0.25rem', color: 'var(--text-primary)', lineHeight: 1.5, backgroundColor: 'var(--bg-surface-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                  {selectedInitiativeModal.description}
                </div>
              </div>

              {/* Volume & Delivery Mechanism */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Committed Volume
                  </label>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                    {selectedInitiativeModal.committed_volume || 'Contract Standard'}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Delivered By / Partners
                  </label>
                  <div style={{ fontWeight: 600, color: 'var(--color-primary)', marginTop: '0.2rem' }}>
                    {selectedInitiativeModal.delivered_by}
                  </div>
                </div>
              </div>

              {/* Defensible Value & Attribution */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Defensible TOMs Valuation
                  </label>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#059669', marginTop: '0.2rem' }}>
                    {selectedInitiativeModal.defensible_value_gbp > 0
                      ? formatGbp(selectedInitiativeModal.defensible_value_gbp)
                      : selectedInitiativeModal.valuation_status || 'Qualitative'}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Attribution Model
                  </label>
                  <div style={{ color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                    {selectedInitiativeModal.attribution || 'Direct delivery under contract'}
                  </div>
                </div>
              </div>

              {/* Beneficiaries & Contract References */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Target Beneficiaries
                </label>
                <div style={{ color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                  {selectedInitiativeModal.beneficiaries || 'Contract users, NHS staff, and local communities'}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Schedule 8 Clause
                  </label>
                  <div style={{ fontFamily: 'monospace', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                    {selectedInitiativeModal.sch8_ref || 'Paragraph 4.2'}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Schedule 3b Audit Clause
                  </label>
                  <div style={{ fontFamily: 'monospace', color: '#059669', fontWeight: 600, marginTop: '0.2rem' }}>
                    {selectedInitiativeModal.sch3b_ref || 'Paragraph 7.1'}
                  </div>
                </div>
              </div>

              {/* Implementation Notes */}
              {selectedInitiativeModal.notes && (
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Auditor & Governance Notes
                  </label>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '0.2rem' }}>
                    {selectedInitiativeModal.notes}
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
              <button onClick={() => setSelectedInitiativeModal(null)} className="btn-primary" style={{ fontSize: '0.85rem' }}>
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────── */}
      {/* ADD / EDIT TOMS MEASURE MODAL                                                */}
      {/* ──────────────────────────────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={() => !isSaving && setIsModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: 'var(--shadow-xl)',
              padding: '1.75rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {editingCode ? `Edit TOMs Measure: ${editingCode}` : 'Add New TOMs Measure'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isSaving}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMetric} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Code & Theme */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                    TOMs Reference Code *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingCode}
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g. NT10 or NHS-SV1-03"
                    className="input-field"
                    style={{ width: '100%', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                    Theme *
                  </label>
                  <select
                    value={formData.theme}
                    onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                    className="input-field"
                    style={{ width: '100%', fontSize: '0.84rem' }}
                  >
                    <option value="Work">Work & Skills</option>
                    <option value="Planet">Planet & Climate</option>
                    <option value="Community">Community & Wellbeing</option>
                    <option value="Economy">Economy & SMEs</option>
                    <option value="Modern Slavery">Modern Slavery & Ethics</option>
                  </select>
                </div>
              </div>

              {/* Title / Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                  Measure Title & Short Description *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Employment of new apprentices"
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.84rem' }}
                />
              </div>

              {/* Outcome */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                  Strategic Outcome
                </label>
                <input
                  type="text"
                  value={formData.outcome || ''}
                  onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                  placeholder="e.g. More opportunities for disadvantaged people & youth"
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.84rem' }}
                />
              </div>

              {/* Unit & Unit Value */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                    Unit of Measurement *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="e.g. weeks, people FTE, £ invested"
                    className="input-field"
                    style={{ width: '100%', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                    Proxy Valuation (£ per unit) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.unit_value_gbp}
                    onChange={(e) => setFormData({ ...formData, unit_value_gbp: parseFloat(e.target.value) || 0 })}
                    placeholder="e.g. 309.73"
                    className="input-field"
                    style={{ width: '100%', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              {/* PPN Criteria Mapping */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                  PPN 06/20 Model Award Criteria (MAC)
                </label>
                <input
                  type="text"
                  value={formData.ppn_mapping || ''}
                  onChange={(e) => setFormData({ ...formData, ppn_mapping: e.target.value })}
                  placeholder="e.g. MAC 4.1: Fighting Climate Change or MAC 2.2: Employment and Skills"
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.84rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                  Description / Delivery Method
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe how the initiative is executed and delivered in practice…"
                  className="input-field"
                  rows={3}
                  style={{ width: '100%', fontSize: '0.84rem', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                  Required Audit Evidence (Schedule 3b Contract Standard)
                </label>
                <textarea
                  value={formData.evidence_required}
                  onChange={(e) => setFormData({ ...formData, evidence_required: e.target.value })}
                  placeholder="e.g. Monthly apprentice timesheets, verified supplier spend ledger, MSAT certificates…"
                  className="input-field"
                  rows={2}
                  style={{ width: '100%', fontSize: '0.84rem', resize: 'vertical' }}
                />
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  paddingTop: '0.5rem',
                  borderTop: '1px solid var(--border-subtle)'
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary"
                  style={{ fontSize: '0.85rem' }}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ fontSize: '0.85rem' }}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving…' : editingCode ? 'Update Measure' : 'Create Measure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────── */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ──────────────────────────────────────────────────────────────────────────── */}
      <ConfirmationModal
        isOpen={deleteModalState.isOpen}
        title="Deactivate TOMs Measure"
        message={
          <div>
            Are you sure you want to deactivate measure{' '}
            <strong>{deleteModalState.metric?.code}</strong> ({deleteModalState.metric?.name})?
            It will be hidden from the active catalog and simulation tuner.
          </div>
        }
        confirmText="Deactivate"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModalState({ isOpen: false, metric: null })}
      />
    </div>
  );
};
