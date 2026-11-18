import React, { useState } from 'react';
import {
  Plus,
  Sliders,
  Database,
  Search,
  Sun,
  Moon,
  LogOut,
  Clock,
  Server,
  Cpu,
  X,
  ShieldCheck,
  Activity,
  AlertTriangle,
  FileText,
  RefreshCw,
  Target,
  Building,
  ListChecks,
  Trash2
} from 'lucide-react';
import type { ThemeMode } from '../constants/theme';
import type { BackendHealthData, AuditLogItem, AuditSummary } from '../types';
import type { RunSummary } from '../api/generator';
import { frameworkById } from '../local/frameworks';
import type { FrameworkId } from '../local/types';
import { ConfirmationModal } from './ConfirmationModal';
import { useAuth } from '../context/AuthContext';
import { fetchAuditLogs, fetchAuditSummary } from '../api/client';
import { parseApiDate } from '../utils/formatters';

export type ActiveTab = 'generator' | 'prompt' | 'opportunity' | 'tuner' | 'toms' | 'partners' | 'documents' | 'search';

export interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onNewPrompt: () => void;
  backendOnline: boolean;
  healthData?: BackendHealthData;
  theme: ThemeMode;
  onToggleTheme: () => void;
  /** The signed-in user's saved Initiative Generator tenders, newest first. */
  runs?: RunSummary[];
  isLoadingRuns?: boolean;
  /** The saved tender open in the generator, highlighted in the list. */
  activeRunId?: string | null;
  onOpenRun?: (id: string) => void;
  onDeleteRun?: (id: string) => Promise<void>;
  /** On small screens the sidebar is an off-canvas drawer controlled by the app shell. */
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

function formatRelativeTime(isoStr?: string | null): string {
  if (!isoStr) return '';
  const now = Date.now();
  const then = parseApiDate(isoStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function truncateTitle(text: string, max = 34): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '…';
}

const millions = (gbp: number) => `£${(gbp / 1_000_000).toLocaleString('en-GB', { maximumFractionDigits: 1 })}m`;

/** One line under a saved tender: framework, region, contract value and value against target. */
function runDetail(run: RunSummary): string {
  const parts: string[] = [];
  if (run.framework) parts.push(frameworkById(run.framework as FrameworkId).short);
  if (run.region && !run.title.startsWith(run.region)) parts.push(run.region);
  if (run.contract_value_gbp) parts.push(`${millions(run.contract_value_gbp)} contract`);
  if (run.value_gbp != null && run.target_gbp) parts.push(`${Math.round((run.value_gbp / run.target_gbp) * 100)}% of target`);
  return parts.join(' · ');
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onNewPrompt,
  backendOnline,
  healthData,
  theme,
  onToggleTheme,
  runs = [],
  isLoadingRuns = false,
  activeRunId = null,
  onOpenRun,
  onDeleteRun,
  mobileOpen = false,
  onCloseMobile
}) => {
  const { user, logout } = useAuth();
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagTab, setDiagTab] = useState<'overview' | 'audit'>('overview');
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditSummary, setAuditSummary] = useState<AuditSummary | null>(null);
  const [auditSeverity, setAuditSeverity] = useState<string>('');
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  const loadAuditData = async (severityFilter = auditSeverity) => {
    setIsLoadingAudit(true);
    try {
      const [logs, summary] = await Promise.all([
        fetchAuditLogs(severityFilter || undefined, 50),
        fetchAuditSummary()
      ]);
      setAuditLogs(logs);
      setAuditSummary(summary);
    } catch (err) {
      console.error('Failed to load audit data:', err);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  const handleOpenDiagnostics = () => {
    setShowDiagnostics(true);
    loadAuditData();
  };

  const primaryNavItems: Array<{ id: ActiveTab; label: string; icon: React.ReactNode }> = [
    { id: 'generator', label: 'Initiative Generator', icon: <ListChecks size={17} /> },
    { id: 'toms', label: 'TOMs Catalog', icon: <Target size={17} /> },
    { id: 'partners', label: 'Regional Partners', icon: <Building size={17} /> },
    { id: 'tuner', label: 'Value Tuner', icon: <Sliders size={17} /> }
  ];

  const legacyNavItems: Array<{ id: ActiveTab; label: string; icon: React.ReactNode }> = [
    { id: 'documents', label: 'Repository', icon: <Database size={17} /> },
    { id: 'search', label: 'Evidence Search', icon: <Search size={17} /> }
  ];

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const sidebarPreviewRuns = runs.slice(0, 5);
  const [pendingDelete, setPendingDelete] = useState<RunSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const drawerFilteredRuns = runs.filter((run) => {
    const q = historySearchQuery.trim().toLowerCase();
    if (!q) return true;
    return [run.title, run.client, run.region, run.framework && frameworkById(run.framework as FrameworkId).short]
      .some((v) => v && v.toLowerCase().includes(q));
  });

  const openRun = (id: string) => {
    onOpenRun?.(id);
    setShowHistoryDrawer(false);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteRun?.(pendingDelete.id);
    } finally {
      setIsDeleting(false);
      setPendingDelete(null);
    }
  };

  return (
    <>
      {mobileOpen && <div className="mobile-backdrop" onClick={onCloseMobile} aria-hidden="true" />}
      <aside
        className={`app-sidebar${mobileOpen ? ' is-open' : ''}`}
        aria-label="Main navigation"
      >
      <div className="sidebar-brand">
        <img src="/infosys-logo.png" alt="Infosys" className="brand-logo logo-on-light" style={{ height: '22px' }} />
        <img src="/infosys-logo-dark.png" alt="Infosys" className="brand-logo logo-on-dark" style={{ height: '22px' }} />
        <span className="sidebar-product">Social Value</span>
        <button type="button" className="icon-button mobile-only" onClick={onCloseMobile} aria-label="Close menu" style={{ marginLeft: 'auto' }}>
          <X size={18} />
        </button>
      </div>

      <div className="sidebar-section">
        <button
          onClick={() => {
            onTabChange('generator');
            onNewPrompt();
          }}
          className="btn-primary"
          style={{ width: '100%' }}
        >
          <Plus size={16} /> New bid
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Screens">
        {[primaryNavItems, legacyNavItems].map((group, gi) => (
          <React.Fragment key={gi}>
            {gi > 0 && <div className="sidebar-divider" />}
            {group.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`nav-item${isActive ? ' is-active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </nav>

      <div className="sidebar-recent">
        {runs.length > 0 && (
          <>
            <div className="sidebar-label">
              <span>Recent tenders</span>
              <button onClick={() => setShowHistoryDrawer(true)} className="btn-link">
                {runs.length > sidebarPreviewRuns.length ? 'View all' : 'Manage'}
              </button>
            </div>
            {sidebarPreviewRuns.map((run) => (
              <button
                key={run.id}
                onClick={() => openRun(run.id)}
                title={`${run.title} · ${runDetail(run)}`}
                className={`recent-item${run.id === activeRunId ? ' is-active' : ''}`}
                aria-current={run.id === activeRunId ? 'true' : undefined}
              >
                <span className="recent-name">{truncateTitle(run.title)}</span>
                <span className="recent-time">{formatRelativeTime(run.updated_at)}</span>
              </button>
            ))}
          </>
        )}
        {isLoadingRuns && runs.length === 0 && <div className="sidebar-label">Loading…</div>}
        {!isLoadingRuns && runs.length === 0 && (
          <div className="sidebar-label">
            <span>Your saved tenders appear here</span>
          </div>
        )}
      </div>

      {user && (
        <div className="sidebar-footer">
          <span className="avatar" aria-hidden="true">{getInitials(user.name)}</span>
          <span className="sidebar-user" title={`${user.name} · ${user.role}`}>{user.name}</span>
          <button
            onClick={onToggleTheme}
            className="icon-button"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button
            onClick={handleOpenDiagnostics}
            className="icon-button"
            aria-label={backendOnline ? 'System online, open diagnostics' : 'System offline, open diagnostics'}
            title={backendOnline ? 'Online' : 'Offline'}
          >
            <span className={`status-dot${backendOnline ? ' is-online' : ''}`} />
          </button>
          <button onClick={logout} className="icon-button" aria-label="Sign out" title="Sign out">
            <LogOut size={15} />
          </button>
        </div>
      )}
    </aside>

    {/* Secondary Slide-Out Sidebar: Recent Searches Drawer */}
    {showHistoryDrawer && (
      <>
        {/* Semi-transparent backdrop to easily close on click outside */}
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'var(--overlay)',
            backdropFilter: 'blur(1.5px)',
            zIndex: 80
          }}
          onClick={() => setShowHistoryDrawer(false)}
        />

        {/* Slide-out Panel anchored to the sidebar */}
        <div
          className="history-drawer"
          style={{
            position: 'fixed',
            left: '240px',
            top: 0,
            bottom: 0,
            width: '340px',
            backgroundColor: 'var(--bg-surface)',
            borderRight: '1px solid var(--border-medium)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 85,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'slideIn 0.18s ease'
          }}
        >
          {/* Drawer Header */}
          <div
            style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-card)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={16} style={{ color: 'var(--color-primary)' }} />
              <div>
                <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Your tenders
                </h3>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {runs.length} saved, most recently changed first
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowHistoryDrawer(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0.25rem',
                borderRadius: 'var(--radius-sm)'
              }}
              title="Close drawer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Search Filter Input */}
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-muted)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search by client, region or framework…"
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.65rem 0.45rem 1.95rem',
                  fontSize: '0.78rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Drawer List */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {drawerFilteredRuns.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                {runs.length === 0 ? 'No saved tenders yet. Generate initiatives and they are saved here.' : `No tenders match "${historySearchQuery}"`}
              </div>
            ) : (
              drawerFilteredRuns.map((run) => (
                <div key={run.id} className={`history-run${run.id === activeRunId ? ' is-active' : ''}`}>
                  <button type="button" className="history-run-open" onClick={() => openRun(run.id)}>
                    <span className="history-run-head">
                      <strong>{run.title}</strong>
                      <span className="history-run-time">{formatRelativeTime(run.updated_at)}</span>
                    </span>
                    <span className="history-run-detail">{runDetail(run)}</span>
                    <span className="history-run-detail">
                      {run.initiative_count} initiative{run.initiative_count === 1 ? '' : 's'}
                      {run.value_gbp != null ? ` · ${millions(run.value_gbp)} social value` : ''}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="icon-button history-run-delete"
                    onClick={() => setPendingDelete(run)}
                    aria-label={`Delete ${run.title} from history`}
                    title="Delete from history"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Drawer Footer */}
          <div style={{ padding: '0.65rem 1rem', borderTop: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-card)', fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Only you can see your saved tenders</span>
            <button
              onClick={() => setShowHistoryDrawer(false)}
              className="btn-secondary"
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
            >
              Close
            </button>
          </div>
        </div>
      </>
    )}

      <ConfirmationModal
        isOpen={pendingDelete !== null}
        title="Delete this saved tender?"
        message={
          <>
            <strong>{pendingDelete?.title}</strong> and its initiatives will be removed from your history. This cannot be undone.
          </>
        }
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      {/* System Diagnostics Modal */}
      {showDiagnostics && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'var(--overlay)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
            backdropFilter: 'blur(3px)'
          }}
          onClick={() => setShowDiagnostics(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-lg, 10px)',
              width: '100%',
              maxWidth: diagTab === 'audit' ? '720px' : '540px',
              transition: 'max-width 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '1.25rem 1.5rem 0 1.5rem',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Activity size={18} style={{ color: 'var(--color-primary)' }} />
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  System Diagnostics & Audit Hub
                </h3>
              </div>
              <button
                onClick={() => setShowDiagnostics(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Diagnostic Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', padding: '0 1.5rem', background: 'var(--bg-muted)' }}>
              <button
                onClick={() => setDiagTab('overview')}
                style={{
                  padding: '0.65rem 0.9rem',
                  fontSize: '0.78rem',
                  fontWeight: diagTab === 'overview' ? 600 : 500,
                  border: 'none',
                  borderBottom: diagTab === 'overview' ? '2px solid var(--color-primary)' : '2px solid transparent',
                  background: 'transparent',
                  color: diagTab === 'overview' ? 'var(--text-primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <Server size={14} />
                <span>System Health</span>
              </button>
              <button
                onClick={() => {
                  setDiagTab('audit');
                  loadAuditData();
                }}
                style={{
                  padding: '0.65rem 0.9rem',
                  fontSize: '0.78rem',
                  fontWeight: diagTab === 'audit' ? 600 : 500,
                  border: 'none',
                  borderBottom: diagTab === 'audit' ? '2px solid var(--color-primary)' : '2px solid transparent',
                  background: 'transparent',
                  color: diagTab === 'audit' ? 'var(--text-primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem'
                }}
              >
                <AlertTriangle size={14} style={{ color: auditSummary?.errors_last_24h ? '#ef4444' : undefined }} />
                <span>Audit & Error Logs</span>
                {auditSummary && auditSummary.errors_last_24h > 0 && (
                  <span
                    style={{
                      fontSize: '0.65rem',
                      padding: '0.05rem 0.35rem',
                      borderRadius: '10px',
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      fontWeight: 700
                    }}
                  >
                    {auditSummary.errors_last_24h}
                  </span>
                )}
              </button>
            </div>

            {diagTab === 'overview' ? (
              <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.8125rem', maxHeight: '70vh', overflowY: 'auto' }}>
                {/* Database Section */}
                <div
                  style={{
                    padding: '0.85rem',
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Server size={15} style={{ color: 'var(--color-primary)' }} />
                    <strong style={{ color: 'var(--text-primary)' }}>Vector Database Engine</strong>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.35rem', color: 'var(--text-secondary)' }}>
                    <span>Engine:</span>
                    <strong style={{ color: healthData?.database?.engine === 'postgresql' ? '#16a34a' : 'var(--text-primary)' }}>
                      {healthData?.database?.engine === 'postgresql' ? 'PostgreSQL (pgvector)' : 'PostgreSQL unavailable'}
                    </strong>
                    <span>pgvector:</span>
                    <span>{healthData?.database?.pgvector_installed ? `Installed (v${healthData?.database?.pgvector_version || '0.8.0'})` : 'Not Detected'}</span>
                    <span>Vector Dim:</span>
                    <span>{healthData?.embedding_dimension || 768} dimensions</span>
                    <span>Connection:</span>
                    <span style={{ color: healthData?.database?.connected ? '#16a34a' : '#ef4444', fontWeight: 600 }}>
                      {healthData?.database?.connected ? 'Online' : 'Unreachable'}
                    </span>
                  </div>
                </div>

                {/* AI Model Section */}
                <div
                  style={{
                    padding: '0.85rem',
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Cpu size={15} style={{ color: 'var(--color-primary)' }} />
                    <strong style={{ color: 'var(--text-primary)' }}>LLM & Embedding Provider</strong>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.35rem', color: 'var(--text-secondary)' }}>
                    <span>Active Provider:</span>
                    <strong style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                      {healthData?.active_provider || 'Gemini'}
                    </strong>
                    <span>Chat Model:</span>
                    <span className="tag-mono" style={{ color: 'var(--text-primary)' }}>
                      {healthData?.providers?.gemini?.model || 'gemini-3.8-flash'}
                    </span>
                    <span>Embedding:</span>
                    <span className="tag-mono" style={{ color: 'var(--text-primary)' }}>
                      text-embedding-004
                    </span>
                    <span>Direct REST:</span>
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>
                      Connected
                    </span>
                  </div>
                </div>

                {/* Statutory Audit & Compliance Card */}
                <div
                  style={{
                    padding: '0.85rem',
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileText size={15} style={{ color: 'var(--color-primary)' }} />
                      <strong style={{ color: 'var(--text-primary)' }}>Audit & Retention Compliance</strong>
                    </div>
                    <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#16a34a', fontWeight: 600 }}>
                      PPN 06/20 Compliant
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '0.35rem', color: 'var(--text-secondary)' }}>
                    <span>Retention Policy:</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>3 Years (1,095 Days Statutory)</span>
                    <span>Total Logs Indexed:</span>
                    <span>{auditSummary ? auditSummary.total_logs.toLocaleString() : 'Loading…'} records</span>
                    <span>24h Error Rate:</span>
                    <span style={{ color: (auditSummary?.errors_last_24h || 0) > 0 ? '#ef4444' : '#16a34a', fontWeight: 600 }}>
                      {auditSummary ? `${auditSummary.errors_last_24h} exceptions` : '0'}
                    </span>
                  </div>
                </div>

                {/* Anti-Hallucination Guardrail */}
                <div
                  style={{
                    padding: '0.85rem',
                    backgroundColor: 'rgba(34, 197, 94, 0.05)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.65rem'
                  }}
                >
                  <ShieldCheck size={18} style={{ color: '#16a34a', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ color: '#16a34a', display: 'block', marginBottom: '0.2rem' }}>
                      Prototype calculation safeguards
                    </strong>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', lineHeight: 1.45 }}>
                      Calculations are repeatable using the current TOMs catalog. Confirm the catalog rates, source evidence and delivery assumptions before using bid figures.
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.8125rem', maxHeight: '70vh', overflowY: 'auto' }}>
                {/* Audit Controls & Summary KPI */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  <div style={{ padding: '0.65rem 0.75rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Stored Logs</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {auditSummary?.total_logs ?? 0}
                    </div>
                  </div>
                  <div style={{ padding: '0.65rem 0.75rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>24h Errors / Warnings</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: (auditSummary?.errors_last_24h || 0) > 0 ? '#ef4444' : '#16a34a' }}>
                      {auditSummary?.errors_last_24h ?? 0}
                    </div>
                  </div>
                  <div style={{ padding: '0.65rem 0.75rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Statutory Retention</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#16a34a', marginTop: '0.2rem' }}>
                      3 Years (1,095 Days)
                    </div>
                  </div>
                </div>

                {/* Filter and Refresh Bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Filter Severity:</span>
                    <select
                      value={auditSeverity}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAuditSeverity(val);
                        loadAuditData(val);
                      }}
                      style={{
                        padding: '0.3rem 0.5rem',
                        fontSize: '0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">All Severities</option>
                      <option value="ERROR">Errors Only (CRITICAL)</option>
                      <option value="WARNING">Warnings</option>
                      <option value="INFO">Informational (API Calls)</option>
                    </select>
                  </div>

                  <button
                    onClick={() => loadAuditData()}
                    className="btn-secondary"
                    disabled={isLoadingAudit}
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <RefreshCw size={12} className={isLoadingAudit ? 'spin' : ''} />
                    <span>Refresh Logs</span>
                  </button>
                </div>

                {/* Audit Logs List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {isLoadingAudit && auditLogs.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Loading system audit records…
                    </div>
                  ) : auditLogs.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-sm)' }}>
                      No audit or error records found for this filter.
                    </div>
                  ) : (
                    auditLogs.map((log) => {
                      const isErr = log.severity === 'ERROR' || log.severity === 'CRITICAL' || (log.status_code && log.status_code >= 400);
                      const isWarn = log.severity === 'WARNING';
                      return (
                        <div
                          key={log.id}
                          style={{
                            padding: '0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: isErr ? 'rgba(239, 68, 68, 0.05)' : isWarn ? 'rgba(245, 158, 11, 0.05)' : 'var(--bg-card)',
                            border: `1px solid ${isErr ? 'rgba(239, 68, 68, 0.25)' : isWarn ? 'rgba(245, 158, 11, 0.25)' : 'var(--border-subtle)'}`,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.35rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <span
                                style={{
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  padding: '0.1rem 0.35rem',
                                  borderRadius: '3px',
                                  backgroundColor: isErr ? '#ef4444' : isWarn ? '#f59e0b' : 'var(--btn-primary-bg)',
                                  color: '#ffffff'
                                }}
                              >
                                {log.severity}
                              </span>
                              {log.method && log.endpoint && (
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.78rem' }}>
                                  {log.method} {log.endpoint}
                                </span>
                              )}
                              {log.status_code && (
                                <span
                                  style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    color: log.status_code >= 400 ? '#ef4444' : '#16a34a'
                                  }}
                                >
                                  {log.status_code}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {log.duration_ms ? `${log.duration_ms.toFixed(0)}ms · ` : ''}
                              {parseApiDate(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </div>
                          </div>

                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {log.event_type}
                          </div>

                          {log.error_detail && (
                            <div
                              style={{
                                marginTop: '0.25rem',
                                padding: '0.5rem',
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                borderRadius: '4px',
                                color: '#ef4444',
                                fontFamily: 'monospace',
                                fontSize: '0.72rem',
                                wordBreak: 'break-all'
                              }}
                            >
                              {log.error_detail}
                            </div>
                          )}

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            <span>Trace ID: <code style={{ color: 'var(--text-secondary)' }}>{log.request_id || 'system'}</code></span>
                            {log.client_ip && <span>IP: {log.client_ip}</span>}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            <div
              style={{
                padding: '0.75rem 1.5rem',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Production Logs: Local Rotating Files & CloudWatch / stdout
              </div>
              <button
                onClick={() => setShowDiagnostics(false)}
                className="btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
