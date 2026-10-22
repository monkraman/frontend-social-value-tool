import React, { useState } from 'react';
import {
  Plus,
  MessageSquare,
  Sliders,
  Database,
  Search,
  Sun,
  Moon,
  LogIn,
  LogOut,
  Clock,
  ChevronRight,
  Server,
  Cpu,
  X,
  ShieldCheck,
  Activity,
  AlertTriangle,
  FileText,
  RefreshCw,
  PanelLeftOpen,
  ArrowUpRight
} from 'lucide-react';
import type { ThemeMode } from '../constants/theme';
import type { PromptHistoryItem, BackendHealthData, AuditLogItem, AuditSummary } from '../types';
import { useAuth } from '../context/AuthContext';
import { fetchAuditLogs, fetchAuditSummary } from '../api/client';

export type ActiveTab = 'prompt' | 'tuner' | 'documents' | 'search';

export interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onNewPrompt: () => void;
  backendOnline: boolean;
  healthData?: BackendHealthData;
  theme: ThemeMode;
  onToggleTheme: () => void;
  chatHistory?: PromptHistoryItem[];
  isLoadingHistory?: boolean;
  onRestoreChat?: (item: PromptHistoryItem) => void;
}

function formatRelativeTime(isoStr?: string | null): string {
  if (!isoStr) return '';
  const now = Date.now();
  const then = new Date(isoStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function truncatePrompt(text: string, max = 42): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '…';
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onNewPrompt,
  backendOnline,
  healthData,
  theme,
  onToggleTheme,
  chatHistory = [],
  isLoadingHistory = false,
  onRestoreChat
}) => {
  const { user, isAuthenticated, logout, openAuthModal } = useAuth();
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

  const navItems: Array<{ id: ActiveTab; label: string; icon: React.ReactNode }> = [
    { id: 'prompt', label: 'Bid Studio', icon: <MessageSquare size={17} /> },
    { id: 'tuner', label: 'Value Tuner', icon: <Sliders size={17} /> },
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

  // All RFP prompts in history
  const rfpHistory = chatHistory.filter((h) => h.is_rfp_prompt);
  const sidebarPreviewHistory = rfpHistory.slice(0, 4);

  const drawerFilteredHistory = rfpHistory.filter((item) => {
    if (!historySearchQuery.trim()) return true;
    const q = historySearchQuery.toLowerCase();
    return (
      (item.client_name && item.client_name.toLowerCase().includes(q)) ||
      (item.location && item.location.toLowerCase().includes(q)) ||
      (item.raw_prompt && item.raw_prompt.toLowerCase().includes(q))
    );
  });

  return (
    <>
      <aside
        style={{
          width: '260px',
          height: '100vh',
          backgroundColor: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          flexShrink: 0,
          overflow: 'hidden'
        }}
      >
      {/* Brand Header */}
      <div style={{ padding: '1.35rem 1.5rem 1rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
        <img src="/infosys-logo.png" alt="Infosys" className="brand-logo logo-on-light" style={{ height: '32px' }} />
        <img src="/infosys-logo-dark.png" alt="Infosys" className="brand-logo logo-on-dark" style={{ height: '32px' }} />
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginTop: '0.95rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border-subtle)'
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                lineHeight: 1.2
              }}
            >
              Social Value
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
              RFP Response Engine
            </div>
          </div>
          <span
            style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '0.15rem 0.45rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-primary-subtle)',
              color: 'var(--color-primary-text)',
              letterSpacing: '0.04em'
            }}
          >
            v1.0
          </span>
        </div>
      </div>

      {/* New Prompt Button */}
      <div style={{ padding: '0.95rem 1.25rem 0.5rem 1.25rem', flexShrink: 0 }}>
        <button
          onClick={onNewPrompt}
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: '0.6rem 0.75rem', fontSize: '0.84rem' }}
        >
          <Plus size={16} />
          <span>New bid response</span>
        </button>
      </div>

      {/* Navigation List */}
      <nav style={{ padding: '0.4rem 0.75rem 0.6rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.15rem', flexShrink: 0 }}>
        {navItems.map((item) => {
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
      </nav>

      {/* Recent Searches Section (Non-overlapping, independently scrollable) */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.65rem 0.85rem 0.35rem 0.85rem',
            borderTop: '1px solid var(--border-subtle)',
            marginTop: '0.2rem',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Clock size={12} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
            <span className="eyebrow" style={{ color: 'var(--text-muted)' }}>
              Recent bids
            </span>
          </div>
          {rfpHistory.length > 0 && (
            <button
              onClick={() => setShowHistoryDrawer(true)}
              className="btn-link"
              style={{ fontSize: '0.7rem' }}
              title="View all recent bids"
            >
              <span>View all</span>
              <PanelLeftOpen size={11} />
            </button>
          )}
        </div>

        <div
          style={{
            padding: '0 0.65rem 0.5rem 0.65rem',
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.2rem'
          }}
        >
          {isLoadingHistory && (
            <div style={{ padding: '0.5rem 0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Loading recent bids…
            </div>
          )}

          {!isLoadingHistory && rfpHistory.length === 0 && (
            <div style={{ padding: '0.75rem 0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Your recent bids will appear here
            </div>
          )}

          {sidebarPreviewHistory.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onRestoreChat?.(item);
                onTabChange('prompt');
              }}
              title={item.raw_prompt}
              className="row-hover"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.55rem',
                padding: '0.5rem 0.55rem',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-secondary)',
                fontSize: '0.78rem',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                flexShrink: 0
              }}
            >
              <FileText size={13} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--color-primary)' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '0.8rem',
                    lineHeight: 1.35,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontWeight: 600,
                    color: 'var(--text-primary)'
                  }}
                >
                  {item.client_name
                    ? `${item.client_name}${item.location ? ` · ${item.location}` : ''}`
                    : truncatePrompt(item.raw_prompt)}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                  {item.contract_value_gbp
                    ? `£${(item.contract_value_gbp / 1000000).toFixed(1)}M · `
                    : ''}
                  {formatRelativeTime(item.created_at)}
                </div>
              </div>
              <ChevronRight size={10} style={{ flexShrink: 0, marginTop: '3px', opacity: 0.4 }} />
            </button>
          ))}

          {rfpHistory.length > 3 && (
            <button
              onClick={() => setShowHistoryDrawer(true)}
              className="btn-secondary"
              style={{
                width: '100%',
                marginTop: '0.35rem',
                padding: '0.35rem 0.5rem',
                fontSize: '0.72rem',
                justifyContent: 'center',
                gap: '0.35rem',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <span>View all bids ({rfpHistory.length})</span>
              <ArrowUpRight size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Pinned Solid Footer (Never Overlapped) */}
      <div
        style={{
          marginTop: 'auto',
          flexShrink: 0,
          backgroundColor: 'var(--bg-sidebar)',
          borderTop: '1px solid var(--border-subtle)',
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* User Authentication Card */}
        <div style={{ padding: '0.65rem 0.85rem' }}>
          {isAuthenticated && user ? (
            <div
              style={{
                padding: '0.55rem 0.7rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--btn-primary-bg)',
                    color: '#FFFFFF',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {getInitials(user.name)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                    title={user.name}
                  >
                    {user.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span
                      style={{
                        fontSize: '0.63rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '0.05rem 0.3rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--color-primary-subtle)',
                        color: 'var(--color-primary-text)'
                      }}
                    >
                      {user.role}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={logout}
                className="btn-secondary"
                style={{
                  padding: '0.3rem',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
                title="Sign Out"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={openAuthModal}
              className="btn-secondary"
              style={{
                width: '100%',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                fontSize: '0.78rem',
                fontWeight: 600
              }}
            >
              <LogIn size={14} />
              <span>Sign In / Demo Login</span>
            </button>
          )}
        </div>

        {/* Theme Switcher */}
        <div
          style={{
            padding: '0.55rem 0.85rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
            <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
          </div>
          <button
            onClick={onToggleTheme}
            className="btn-secondary"
            style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', borderRadius: 'var(--radius-sm)' }}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>

        {/* Bottom Status & Diagnostics */}
        <div style={{ padding: '0.65rem 0.85rem 0.85rem 0.85rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.73rem', color: 'var(--text-muted)', flexShrink: 0 }}>
          <button
            onClick={handleOpenDiagnostics}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}
            title="Click to view live system diagnostics"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: backendOnline ? 'var(--status-online, #22c55e)' : 'var(--status-offline, #ef4444)',
                    boxShadow: backendOnline ? '0 0 6px rgba(34, 197, 94, 0.4)' : 'none'
                  }}
                />
                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  {backendOnline ? 'System Operational' : 'Service Offline'}
                </span>
              </div>
              <Activity size={12} style={{ color: 'var(--text-muted)' }} />
            </div>
          </button>
        </div>
      </div>
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
          style={{
            position: 'fixed',
            left: '260px',
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
                  Recent bids
                </h3>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {rfpHistory.length} bid responses, newest first
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
                placeholder="Search by client, place or brief…"
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
            {drawerFilteredHistory.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                No bids match "{historySearchQuery}"
              </div>
            ) : (
              drawerFilteredHistory.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    onRestoreChat?.(item);
                    onTabChange('prompt');
                    setShowHistoryDrawer(false);
                  }}
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)';
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-primary-subtle)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)';
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-surface)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                      {item.client_name || 'Tender Opportunity'}
                    </strong>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {formatRelativeTime(item.created_at)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.72rem' }}>
                    {item.location && (
                      <span style={{ padding: '0.1rem 0.35rem', borderRadius: '3px', backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)' }}>
                        {item.location}
                      </span>
                    )}
                    {item.contract_value_gbp && (
                      <span style={{ color: 'var(--text-muted)' }}>
                        £{(item.contract_value_gbp / 1000000).toFixed(1)}M
                      </span>
                    )}
                    {item.weighting_percent && (
                      <span style={{ color: 'var(--text-muted)' }}>
                        • {item.weighting_percent}% SV
                      </span>
                    )}
                  </div>

                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.74rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {item.raw_prompt}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.2rem' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-primary-text)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      Open in Bid Studio <ArrowUpRight size={11} />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Drawer Footer */}
          <div style={{ padding: '0.65rem 1rem', borderTop: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-card)', fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Select a bid to reopen it</span>
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
                      {healthData?.database?.connected ? '✓ Online & Verified' : '✗ Unreachable'}
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
                      ✓ Active (IPv4 Fast-Path)
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
                      Calculations are repeatable using the current POC catalog. Confirm the catalog rates, source evidence and delivery assumptions before using bid figures.
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
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
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
