import React, { useState, useEffect, useMemo } from 'react';
import {
  fetchTomsMetrics,
  createTomsMetric,
  updateTomsMetric,
  deleteTomsMetric,
  resetDefaultTomsMetrics
} from '../api/client';
import { useToast } from '../context/ToastContext';
import { ConfirmationModal } from './ConfirmationModal';
import { formatGbp } from '../utils/formatters';
import type {
  TOMsMetric,
  TomsMetricCreate,
  TomsMetricUpdate
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
  LayoutGrid
} from 'lucide-react';
import { Pagination } from './Pagination';

interface TomsCatalogProps {
  onSendToPrompt?: (promptText: string) => void;
}

export const TomsCatalog: React.FC<TomsCatalogProps> = () => {
  const toast = useToast();

  const [metrics, setMetrics] = useState<TOMsMetric[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTheme, setSelectedTheme] = useState<string>('All');

  // View & Pagination state
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(8);


  // Add / Edit Modal state
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
    source: 'National TOMs 2024'
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

  useEffect(() => {
    loadMetrics();
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

  // Statistics
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
      source: 'National TOMs 2024'
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
          ...formData,
          unit_value_gbp: Number(formData.unit_value_gbp)
        });
        toast.success(`Measure '${formData.code}' added to database!`);
      }
      setIsModalOpen(false);
      await loadMetrics();
    } catch (err: any) {
      toast.error('Save failed: ' + (err.message || 'Server error'));
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete
  const handleConfirmDelete = async () => {
    if (!deleteModalState.metric) return;
    const code = deleteModalState.metric.code;
    setIsDeleting(true);
    try {
      await deleteTomsMetric(code);
      toast.success(`Measure '${code}' deactivated from catalog.`);
      setDeleteModalState({ isOpen: false, metric: null });
      await loadMetrics();
    } catch (err: any) {
      toast.error('Delete failed: ' + (err.message || 'Server error'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Reset defaults
  const handleResetDefaults = async () => {
    if (!window.confirm('Restore standard National TOMs and NHS contract benchmarks?')) return;
    setIsLoading(true);
    try {
      await resetDefaultTomsMetrics();
      toast.success('Restored default TOMs & NHS Schedule 3b/8 benchmarks.');
      await loadMetrics();
    } catch (err: any) {
      toast.error('Reset failed: ' + (err.message || 'Server error'));
    } finally {
      setIsLoading(false);
    }
  };


  // Export catalog
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
    link.setAttribute('download', `National_TOMS_Catalog_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('TOMS Catalog exported to CSV!');
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
            National TOMs & PPN Catalog
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.35rem', maxWidth: '780px' }}>
            Audited Social Value measures, verified proxy valuations (£), and PPN 06/20 Model Award Criteria.
            Configure custom measures or generate high-scoring bid commitments when clients lack internal documents.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
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
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────── */}
      {/* FILTER & SEARCH BAR */}
      {/* ──────────────────────────────────────────────────────────────────────────── */}
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

      {/* ──────────────────────────────────────────────────────────────────────────── */}
      {/* TOMS METRICS LIST / GRID */}
      {/* ──────────────────────────────────────────────────────────────────────────── */}
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
            /* ── Professional List / Table Format ── */
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
                          transition: 'background-color 0.15s ease'
                        }}
                      >
                        {/* Code & Theme */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                            <span
                              style={{
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                padding: '0.18rem 0.5rem',
                                backgroundColor: 'var(--bg-surface-subtle)',
                                borderRadius: '4px',
                                border: '1px solid var(--border-subtle)',
                                color: 'var(--text-primary)'
                              }}
                            >
                              {m.code}
                            </span>
                            <span
                              style={{
                                fontSize: '0.7rem',
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
                            {isNHSBenchmark && (
                              <span
                                style={{
                                  fontSize: '0.66rem',
                                  fontWeight: 600,
                                  padding: '0.1rem 0.35rem',
                                  backgroundColor: 'rgba(5, 150, 105, 0.1)',
                                  color: '#059669',
                                  borderRadius: '3px',
                                  border: '1px solid rgba(5, 150, 105, 0.2)'
                                }}
                              >
                                NHS Schedule 8
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Measure Name & Outcome */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                            {m.name}
                          </div>
                          {m.outcome && (
                            <div style={{ fontSize: '0.76rem', color: 'var(--color-primary)', fontWeight: 500, marginTop: '0.2rem' }}>
                              {m.outcome}
                            </div>
                          )}
                          {m.description && (
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: 1.4 }}>
                              {m.description}
                            </div>
                          )}
                        </td>

                        {/* Proxy Valuation */}
                        <td style={{ padding: '0.85rem 0.85rem', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--color-primary)' }}>
                            {formatGbp(m.unit_value_gbp)}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            per {m.unit}
                          </div>
                        </td>

                        {/* PPN Criteria */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            {m.ppn_mapping || '—'}
                          </div>
                        </td>

                        {/* Evidence Required */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            {m.evidence_required || '—'}
                          </div>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '0.85rem 0.85rem', verticalAlign: 'top', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.3rem' }}>
                            <button
                              onClick={() => handleOpenEdit(m)}
                              className="btn-secondary"
                              style={{ padding: '0.3rem 0.45rem', fontSize: '0.75rem' }}
                              title="Edit / Reconfigure"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={() => setDeleteModalState({ isOpen: true, metric: m })}
                              className="btn-secondary"
                              style={{ padding: '0.3rem 0.45rem', fontSize: '0.75rem', color: '#dc2626' }}
                              title="Deactivate Measure"
                            >
                              <Trash2 size={13} />
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
            /* ── Cards Grid Format ── */
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
                gap: '1rem'
              }}
            >
              {paginatedMetrics.map((m) => {
                const badge = getThemeBadge(m.theme);
                const isNHSBenchmark = m.code.startsWith('NHS');

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
                      gap: '0.75rem',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            padding: '0.18rem 0.5rem',
                            backgroundColor: 'var(--bg-surface-subtle)',
                            borderRadius: '4px',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-primary)'
                          }}
                        >
                          {m.code}
                        </span>

                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '0.15rem 0.45rem',
                            backgroundColor: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}
                        >
                          {badge.icon}
                          <span>{badge.label}</span>
                        </span>

                        {isNHSBenchmark && (
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              padding: '0.12rem 0.35rem',
                              backgroundColor: 'rgba(5, 150, 105, 0.1)',
                              color: '#059669',
                              borderRadius: '3px',
                              border: '1px solid rgba(5, 150, 105, 0.2)'
                            }}
                          >
                            NHS Schedule 3b/8
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        <button
                          onClick={() => handleOpenEdit(m)}
                          className="btn-secondary"
                          style={{ padding: '0.3rem 0.45rem', fontSize: '0.75rem' }}
                          title="Edit / Reconfigure"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteModalState({ isOpen: true, metric: m })}
                          className="btn-secondary"
                          style={{ padding: '0.3rem 0.45rem', fontSize: '0.75rem', color: '#dc2626' }}
                          title="Deactivate Measure"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                        {m.name}
                      </h4>
                      {m.outcome && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                          <em>{m.outcome}</em>
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: '0.4rem',
                        padding: '0.5rem 0.75rem',
                        backgroundColor: 'var(--bg-surface-subtle)',
                        borderRadius: 'var(--radius-sm)'
                      }}
                    >
                      <span style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                        {formatGbp(m.unit_value_gbp)}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        per {m.unit}
                      </span>
                    </div>

                    {m.ppn_mapping && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <strong>PPN 06/20 Model: </strong>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{m.ppn_mapping}</span>
                      </div>
                    )}

                    {m.description && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45, margin: 0 }}>
                        {m.description}
                      </p>
                    )}

                    {m.evidence_required && (
                      <div
                        style={{
                          fontSize: '0.74rem',
                          color: 'var(--text-tertiary)',
                          backgroundColor: 'rgba(0,0,0,0.015)',
                          padding: '0.5rem 0.65rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px dashed var(--border-subtle)',
                          marginTop: 'auto'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600, marginBottom: '0.2rem', color: 'var(--text-secondary)' }}>
                          <FileCheck size={12} />
                          <span>Audited Evidence Required (Schedule 3b):</span>
                        </div>
                        {m.evidence_required}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Reusable Pagination */}
          <Pagination
            currentPage={currentPage}
            totalItems={filteredMetrics.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            pageSizeOptions={[8, 16, 24, 50]}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            itemLabel="measures"
          />
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────── */}
      {/* ADD / EDIT MODAL */}
      {/* ──────────────────────────────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {editingCode ? `Configure Measure '${editingCode}'` : 'Add New TOMs Measure'}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  Define measurement units, proxy valuation in GBP, and PPN 06/20 criteria.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveMetric} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                    Code *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    disabled={!!editingCode}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g. NT18"
                    className="input-field"
                    style={{ width: '100%', fontSize: '0.84rem' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                    Measure Title *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Local Apprenticeship Support"
                    className="input-field"
                    style={{ width: '100%', fontSize: '0.84rem' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
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
                    <option value="Work">Work (Employment & Skills)</option>
                    <option value="Planet">Planet (Net Zero & Environment)</option>
                    <option value="Community">Community (Inclusion & Wellbeing)</option>
                    <option value="Economy">Economy (Local SMEs & Supply Chains)</option>
                    <option value="Modern Slavery">Modern Slavery & Human Rights</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                    PPN 06/20 Model Award Criteria
                  </label>
                  <input
                    type="text"
                    value={formData.ppn_mapping}
                    onChange={(e) => setFormData({ ...formData, ppn_mapping: e.target.value })}
                    placeholder="e.g. MAC 2.2: Employment and Skills"
                    className="input-field"
                    style={{ width: '100%', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                    Measurement Unit *
                  </label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="e.g. weeks, hours, people, tonnes CO2e"
                    className="input-field"
                    style={{ width: '100%', fontSize: '0.84rem' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                    Unit Proxy Value (£) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.unit_value_gbp}
                    onChange={(e) => setFormData({ ...formData, unit_value_gbp: Number(e.target.value) })}
                    className="input-field"
                    style={{ width: '100%', fontSize: '0.84rem' }}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                  Policy Outcome / Goal
                </label>
                <input
                  type="text"
                  value={formData.outcome}
                  onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                  placeholder="e.g. Creating meaningful local careers for underrepresented groups"
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
