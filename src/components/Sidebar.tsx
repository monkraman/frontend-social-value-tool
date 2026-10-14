import React from 'react';
import { Plus, MessageSquare, Sliders, Database, Search, Sun, Moon } from 'lucide-react';
import type { ThemeMode } from '../constants/theme';

export type ActiveTab = 'prompt' | 'tuner' | 'documents' | 'search';

export interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onNewPrompt: () => void;
  backendOnline: boolean;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onNewPrompt,
  backendOnline,
  theme,
  onToggleTheme
}) => {
  const navItems: Array<{ id: ActiveTab; label: string; icon: React.ReactNode }> = [
    { id: 'prompt', label: 'Prompt Studio', icon: <MessageSquare size={16} /> },
    { id: 'tuner', label: 'Interactive Tuner', icon: <Sliders size={16} /> },
    { id: 'documents', label: 'Knowledge Documents', icon: <Database size={16} /> },
    { id: 'search', label: 'Vector Search', icon: <Search size={16} /> }
  ];

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
        flexShrink: 0
      }}
    >
      {/* Brand Header */}
      <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          Social Value
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          RFP Response Engine
        </div>
      </div>

      {/* New Prompt Button */}
      <div style={{ padding: '1rem 1.25rem 0.5rem 1.25rem' }}>
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
      <nav style={{ padding: '0.5rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.2rem', flex: 1 }}>
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

      {/* Theme Switcher */}
      <div
        style={{
          padding: '0.75rem 1.25rem',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
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
      <div style={{ padding: '0.75rem 1.25rem 1rem 1.25rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
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
