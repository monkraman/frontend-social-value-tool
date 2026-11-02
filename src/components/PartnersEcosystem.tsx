import React, { useState, useEffect, useMemo } from 'react';
import {
  fetchRegionalPartners,
  createRegionalPartner,
  updateRegionalPartner,
  deleteRegionalPartner
} from '../api/client';
import { useToast } from '../context/ToastContext';
import { ConfirmationModal } from './ConfirmationModal';
import type { RegionalPartner, RegionalPartnerCreate } from '../types';
import {
  Plus,
  Search,
  MapPin,
  Briefcase,
  Users,
  Leaf,
  Coins,
  ShieldAlert,
  Building,
  CheckCircle2,
  Edit3,
  Trash2,
  X,
  RefreshCw
} from 'lucide-react';

export const PartnersEcosystem: React.FC = () => {
  const toast = useToast();

  const [partners, setPartners] = useState<RegionalPartner[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('All');
  const [selectedTheme, setSelectedTheme] = useState<string>('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<RegionalPartnerCreate>({
    location: 'Birmingham',
    partner_name: '',
    theme: 'Work',
    toms_code: 'NT1',
    focus_area: '',
    contact_info: '',
    description: '',
    is_approved: true
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Delete Confirmation State
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    partner: RegionalPartner | null;
  }>({
    isOpen: false,
    partner: null
  });
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Load partners from API
  const loadPartners = async () => {
    setIsLoading(true);
    try {
      const data = await fetchRegionalPartners();
      setPartners(data);
    } catch (err: any) {
      toast.error('Could not load partner ecosystem: ' + (err.message || 'Server error'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPartners();
  }, []);

  // Filtered partners
  const filteredPartners = useMemo(() => {
    return partners.filter((p) => {
      const matchesLoc =
        selectedLocation === 'All' ||
        p.location.toLowerCase().includes(selectedLocation.toLowerCase());

      const matchesTheme =
        selectedTheme === 'All' ||
        p.theme.toLowerCase().includes(selectedTheme.toLowerCase());

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.partner_name.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        (p.focus_area && p.focus_area.toLowerCase().includes(q)) ||
        (p.toms_code && p.toms_code.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q));

      return matchesLoc && matchesTheme && matchesSearch;
    });
  }, [partners, selectedLocation, selectedTheme, searchQuery]);

  // Unique locations list
  const locationsList = useMemo(() => {
    const set = new Set<string>();
    partners.forEach((p) => {
      if (p.location) set.add(p.location);
    });
    return ['All', ...Array.from(set).sort()];
  }, [partners]);

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
    setEditingId(null);
    setFormData({
      location: selectedLocation !== 'All' ? selectedLocation : 'Birmingham',
      partner_name: '',
      theme: 'Work',
      toms_code: 'NT1',
      focus_area: '',
      contact_info: '',
      description: '',
      is_approved: true
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (p: RegionalPartner) => {
    setEditingId(p.id);
    setFormData({
      location: p.location,
      partner_name: p.partner_name,
      theme: p.theme,
      toms_code: p.toms_code || '',
      focus_area: p.focus_area || '',
      contact_info: p.contact_info || '',
      description: p.description || '',
      is_approved: p.is_approved
    });
    setIsModalOpen(true);
  };

  // Save Partner
  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.partner_name.trim() || !formData.location.trim()) {
      toast.warning('Please enter Partner Name and Location.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingId) {
        await updateRegionalPartner(editingId, formData);
        toast.success(`Partner '${formData.partner_name}' updated!`);
      } else {
        await createRegionalPartner(formData);
        toast.success(`Partner '${formData.partner_name}' added to ${formData.location} ecosystem!`);
      }
      setIsModalOpen(false);
      await loadPartners();
    } catch (err: any) {
      toast.error('Save failed: ' + (err.message || 'Server error'));
    } finally {
      setIsSaving(false);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteModalState.partner) return;
    const id = deleteModalState.partner.id;
    const name = deleteModalState.partner.partner_name;
    setIsDeleting(true);
    try {
      await deleteRegionalPartner(id);
      toast.success(`Partner '${name}' removed.`);
      setDeleteModalState({ isOpen: false, partner: null });
      await loadPartners();
    } catch (err: any) {
      toast.error('Delete failed: ' + (err.message || 'Server error'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '1440px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Building size={14} style={{ color: 'var(--color-primary)' }} />
            <span>Approved Delivery Ecosystem</span>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            Regional Partners & Locations
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.35rem', maxWidth: '780px' }}>
            Accredited charities, colleges, and social enterprises categorized by city and Social Value theme.
            The Bid Studio automatically resolves these partners in your tender proposals based on contract geography.
          </p>
        </div>

        {/* Action Button */}
        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
          <button onClick={handleOpenAdd} className="btn-primary" style={{ fontSize: '0.82rem' }}>
            <Plus size={15} /> Add Regional Partner
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────── */}
      {/* STATS RIBBON */}
      {/* ──────────────────────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          padding: '1.25rem 1.5rem',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Approved Partners</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '0.1rem' }}>
            {partners.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Ecosystem organizations</div>
        </div>

        <div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Covered Locations</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.1rem' }}>
            {locationsList.length - 1} Regions
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Birmingham, Manchester, London…</div>
        </div>

        <div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Delivery Alignment</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#059669', marginTop: '0.1rem' }}>
            100% Pre-Vetted
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>DBS & Accreditation Verified</div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────── */}
      {/* FILTERS & SEARCH */}
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
              placeholder="Search partner, city, focus area, code…"
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

          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Showing <strong>{filteredPartners.length}</strong> of <strong>{partners.length}</strong> partners
          </div>
        </div>

        {/* Location Pills */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginRight: '0.2rem' }}>
            Location:
          </span>
          {locationsList.map((loc) => {
            const isSelected = selectedLocation === loc;
            return (
              <button
                key={loc}
                onClick={() => setSelectedLocation(loc)}
                style={{
                  padding: '0.3rem 0.65rem',
                  borderRadius: '16px',
                  fontSize: '0.76rem',
                  fontWeight: isSelected ? 600 : 500,
                  border: '1px solid',
                  borderColor: isSelected ? 'var(--color-primary)' : 'var(--border-subtle)',
                  backgroundColor: isSelected ? 'var(--color-primary-subtle, rgba(59,130,246,0.12))' : 'transparent',
                  color: isSelected ? 'var(--color-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                {loc}
              </button>
            );
          })}
        </div>

        {/* Theme Pills */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginRight: '0.2rem' }}>
            Theme:
          </span>
          {['All', 'Work', 'Planet', 'Community', 'Economy', 'Modern Slavery'].map((themeName) => {
            const isSelected = selectedTheme === themeName;
            return (
              <button
                key={themeName}
                onClick={() => setSelectedTheme(themeName)}
                style={{
                  padding: '0.3rem 0.65rem',
                  borderRadius: '16px',
                  fontSize: '0.76rem',
                  fontWeight: isSelected ? 600 : 500,
                  border: '1px solid',
                  borderColor: isSelected ? 'var(--color-primary)' : 'var(--border-subtle)',
                  backgroundColor: isSelected ? 'var(--color-primary-subtle, rgba(59,130,246,0.12))' : 'transparent',
                  color: isSelected ? 'var(--color-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                {themeName}
              </button>
            );
          })}
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────── */}
      {/* PARTNERS GRID */}
      {/* ──────────────────────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <RefreshCw size={24} className="spin-icon" style={{ margin: '0 auto 0.75rem' }} />
          <div>Loading Partner Ecosystem…</div>
        </div>
      ) : filteredPartners.length === 0 ? (
        <div
          style={{
            padding: '3rem',
            textAlign: 'center',
            backgroundColor: 'var(--bg-surface)',
            border: '1px dashed var(--border-subtle)',
            borderRadius: 'var(--radius-md)'
          }}
        >
          <Building size={32} style={{ color: 'var(--text-tertiary)', margin: '0 auto 0.5rem' }} />
          <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>No matching partners found</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Try adjusting your search query or location filter, or click "Add Regional Partner" to register one.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '1rem'
          }}
        >
          {filteredPartners.map((p) => {
            const badge = getThemeBadge(p.theme);

            return (
              <div
                key={p.id}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  boxShadow: 'var(--shadow-sm)',
                  position: 'relative'
                }}
              >
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.5rem',
                        backgroundColor: 'var(--bg-surface-subtle)',
                        borderRadius: '4px',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <MapPin size={11} style={{ color: 'var(--color-primary)' }} />
                      <span>{p.location}</span>
                    </span>

                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '0.15rem 0.45rem',
                        backgroundColor: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.border}`,
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      {badge.icon}
                      <span>{badge.label}</span>
                    </span>

                    {p.toms_code && (
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          fontFamily: 'monospace',
                          padding: '0.12rem 0.4rem',
                          backgroundColor: 'rgba(0,0,0,0.03)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '3px',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        {p.toms_code}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button
                      onClick={() => handleOpenEdit(p)}
                      className="btn-secondary"
                      style={{ padding: '0.3rem 0.45rem', fontSize: '0.75rem' }}
                      title="Edit Partner"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      onClick={() => setDeleteModalState({ isOpen: true, partner: p })}
                      className="btn-secondary"
                      style={{ padding: '0.3rem 0.45rem', fontSize: '0.75rem', color: '#dc2626' }}
                      title="Delete Partner"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Partner Name */}
                <div>
                  <h4 style={{ fontSize: '1.02rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                    {p.partner_name}
                  </h4>
                  {p.focus_area && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: 500, marginTop: '0.2rem' }}>
                      {p.focus_area}
                    </div>
                  )}
                </div>

                {/* Description */}
                {p.description && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45, margin: 0 }}>
                    {p.description}
                  </p>
                )}

                {/* Pre-approved badge footer */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    fontSize: '0.72rem',
                    color: '#059669',
                    marginTop: 'auto',
                    paddingTop: '0.35rem'
                  }}
                >
                  <CheckCircle2 size={12} />
                  <span>Approved for tender method statements</span>
                </div>
              </div>
            );
          })}
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
              maxWidth: '520px',
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
                  {editingId ? 'Edit Regional Partner' : 'Add Regional Delivery Partner'}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  Register approved partners to be automatically resolved in location-specific tender bids.
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
            <form onSubmit={handleSavePartner} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                  Partner / Organization Name *
                </label>
                <input
                  type="text"
                  value={formData.partner_name}
                  onChange={(e) => setFormData({ ...formData, partner_name: e.target.value })}
                  placeholder="e.g. BMet College & West Midlands Apprenticeship Hub"
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.84rem' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                    City / Delivery Region *
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Birmingham, Manchester, National"
                    className="input-field"
                    style={{ width: '100%', fontSize: '0.84rem' }}
                    required
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
                    <option value="Work">Work (Employment & Skills)</option>
                    <option value="Planet">Planet (Net Zero & Climate)</option>
                    <option value="Community">Community (Inclusion & Wellbeing)</option>
                    <option value="Economy">Economy (Local SMEs)</option>
                    <option value="Modern Slavery">Modern Slavery</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                    Mapped TOMs Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.toms_code || ''}
                    onChange={(e) => setFormData({ ...formData, toms_code: e.target.value })}
                    placeholder="e.g. NT1, NT8, NHS-SV2-01"
                    className="input-field"
                    style={{ width: '100%', fontSize: '0.84rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                    Focus Area / Specialty
                  </label>
                  <input
                    type="text"
                    value={formData.focus_area || ''}
                    onChange={(e) => setFormData({ ...formData, focus_area: e.target.value })}
                    placeholder="e.g. Youth NEET Mentoring"
                    className="input-field"
                    style={{ width: '100%', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                  Description / Operational Scope
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Details of delivery facilities, venue access, and accredited training capabilities…"
                  className="input-field"
                  rows={3}
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
                  {isSaving ? 'Saving…' : editingId ? 'Update Partner' : 'Add Partner'}
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
        title="Remove Delivery Partner"
        message={
          <div>
            Are you sure you want to remove{' '}
            <strong>{deleteModalState.partner?.partner_name}</strong> ({deleteModalState.partner?.location})?
          </div>
        }
        confirmText="Remove"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModalState({ isOpen: false, partner: null })}
      />
    </div>
  );
};
