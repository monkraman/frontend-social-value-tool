import React from 'react';
import { Plus, MessageSquare, Sliders, Database, Search, Sun, Moon, LogIn, LogOut, Clock, Sparkles, ChevronRight } from 'lucide-react';
import type { ThemeMode } from '../constants/theme';
import type { PromptHistoryItem } from '../types';
import { useAuth } from '../context/AuthContext';

export type ActiveTab = 'prompt' | 'tuner' | 'documents' | 'search';

export interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onNewPrompt: () => void;
  backendOnline: boolean;
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
  theme,
  onToggleTheme,
  chatHistory = [],
  isLoadingHistory = false,
  onRestoreChat
}) => {
  const { user, isAuthenticated, logout, openAuthModal } = useAuth();

  const navItems: Array<{ id: ActiveTab; label: string; icon: React.ReactNode }> = [
    { id: 'prompt', label: 'Prompt Studio', icon: <MessageSquare size={16} /> },
    { id: 'tuner', label: 'Interactive Tuner', icon: <Sliders size={16} /> },
    { id: 'documents', label: 'Knowledge Documents', icon: <Database size={16} /> },
    { id: 'search', label: 'Vector Search', icon: <Search size={16} /> }
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

  // Only show rfp prompts in history
  const rfpHistory = chatHistory.filter((h) => h.is_rfp_prompt).slice(0, 10);

  return (
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
        overflowY: 'auto'
      }}
    >
      {/* Brand Header */}
      <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Social Value
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              RFP Response Engine
            </div>
          </div>
          <span
            style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '0.15rem 0.45rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-muted)',
              color: 'var(--text-secondary)',
              letterSpacing: '0.04em'
            }}
          >
            v1.0
          </span>
        </div>
      </div>

      {/* New Prompt Button */}
      <div style={{ padding: '1rem 1.25rem 0.5rem 1.25rem', flexShrink: 0 }}>
        <button
          onClick={onNewPrompt}
          className="btn-secondary"
          style={{ width: '100%', justifyContent: 'flex-start', padding: '0.5rem 0.75rem' }}
        >
          <Plus size={16} />
          <span>New Prompt</span>
        </button>
      </div>

      {/* Navigation List */}
      <nav style={{ padding: '0.5rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.2rem', flexShrink: 0 }}>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.55rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: isActive ? 'var(--bg-muted)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: '0.8125rem',
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.15s ease'
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Recent Chats History Section */}
      <div
        style={{
          padding: '0 0.75rem',
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.75rem 0.25rem 0.4rem 0.25rem',
            borderTop: '1px solid var(--border-subtle)',
            marginTop: '0.25rem'
          }}
        >
          <Clock size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Recent Chats
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
          {isLoadingHistory && (
            <div style={{ padding: '0.5rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Loading history…
            </div>
          )}

          {!isLoadingHistory && rfpHistory.length === 0 && (
            <div style={{ padding: '0.5rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No recent chats yet
            </div>
          )}

          {rfpHistory.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onRestoreChat?.(item);
                onTabChange('prompt');
              }}
              title={item.raw_prompt}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem',
                padding: '0.5rem 0.6rem',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-secondary)',
                fontSize: '0.78rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.13s ease',
                width: '100%'
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--bg-muted)';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
              }}
            >
              <Sparkles size={11} style={{ flexShrink: 0, marginTop: '2px', opacity: 0.6 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '0.78rem',
                    lineHeight: 1.35,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontWeight: 500
                  }}
                >
                  {item.client_name
                    ? `${item.client_name}${item.location ? ` · ${item.location}` : ''}`
                    : truncatePrompt(item.raw_prompt)}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                  {item.contract_value_gbp
                    ? `£${(item.contract_value_gbp / 1000000).toFixed(1)}M · ${item.weighting_percent ?? 10}% SV · `
                    : ''}
                  {formatRelativeTime(item.created_at)}
                </div>
              </div>
              <ChevronRight size={10} style={{ flexShrink: 0, marginTop: '3px', opacity: 0.4 }} />
            </button>
          ))}
        </div>
      </div>

      {/* User Authentication Card */}
      <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border-subtle)', flexShrink: 0 }}>
        {isAuthenticated && user ? (
          <div
            style={{
              padding: '0.65rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--text-primary)',
                  color: 'var(--text-inverse)',
                  fontSize: '0.75rem',
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
                    fontSize: '0.8125rem',
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
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '0.05rem 0.35rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-muted)',
                      color: 'var(--text-secondary)'
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
                padding: '0.35rem',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-muted)',
                cursor: 'pointer'
              }}
              title="Sign Out"
            >
              <LogOut size={15} />
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
              padding: '0.55rem 0.75rem',
              fontSize: '0.8125rem',
              fontWeight: 600
            }}
          >
            <LogIn size={15} />
            <span>Sign In / Demo Login</span>
          </button>
        )}
      </div>

      {/* Theme Switcher */}
      <div
        style={{
          padding: '0.75rem 1.25rem',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          {theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
          <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
        </div>
        <button
          onClick={onToggleTheme}
          className="btn-secondary"
          style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', borderRadius: 'var(--radius-sm)' }}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </div>

      {/* Bottom Status */}
      <div style={{ padding: '0.75rem 1.25rem 1rem 1.25rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: backendOnline ? 'var(--status-online)' : 'var(--status-offline)'
            }}
          />
          <span>{backendOnline ? 'FastAPI Connected' : 'Local Fallback Engine'}</span>
        </div>
      </div>
    </aside>
  );
};
