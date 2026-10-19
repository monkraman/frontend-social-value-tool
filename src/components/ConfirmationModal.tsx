import React, { useEffect } from 'react';
import { Trash2, Archive, HelpCircle, X, Loader2 } from 'lucide-react';

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  badge?: string;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
  badge,
  isLoading = false,
  onConfirm,
  onCancel
}) => {
  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';

  const accentColor = isDanger ? '#ef4444' : isWarning ? '#f59e0b' : 'var(--color-primary, #3b82f6)';
  const icon = isDanger ? (
    <Trash2 size={20} style={{ color: '#ef4444' }} />
  ) : isWarning ? (
    <Archive size={20} style={{ color: '#f59e0b' }} />
  ) : (
    <HelpCircle size={20} style={{ color: 'var(--color-primary, #3b82f6)' }} />
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(3px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
        animation: 'fadeIn 0.15s ease-out'
      }}
      onClick={() => {
        if (!isLoading) onCancel();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: 'var(--bg-surface, #ffffff)',
          borderRadius: 'var(--radius-lg, 12px)',
          border: '1px solid var(--border-medium)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: isDanger
                  ? 'rgba(239, 68, 68, 0.12)'
                  : isWarning
                  ? 'rgba(245, 158, 11, 0.12)'
                  : 'rgba(59, 130, 246, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {icon}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {title}
              </h3>
              {badge && (
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    padding: '0.1rem 0.35rem',
                    borderRadius: '4px',
                    backgroundColor: isDanger ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-muted)',
                    color: isDanger ? '#ef4444' : 'var(--text-muted)'
                  }}
                >
                  {badge}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              padding: '0.25rem',
              borderRadius: 'var(--radius-sm)'
            }}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ padding: '1.25rem 1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
          {typeof message === 'string' ? <p style={{ margin: 0 }}>{message}</p> : message}
        </div>

        {/* Modal Footer / Actions */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-card, #f9fafb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.65rem'
          }}
        >
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="btn-secondary"
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.8125rem',
              fontWeight: 500,
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              padding: '0.5rem 1.15rem',
              fontSize: '0.8125rem',
              fontWeight: 600,
              borderRadius: 'var(--radius-md, 6px)',
              border: 'none',
              backgroundColor: accentColor,
              color: '#ffffff',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: isDanger ? '0 2px 8px rgba(239, 68, 68, 0.35)' : 'none',
              transition: 'opacity 0.15s ease'
            }}
          >
            {isLoading && <Loader2 size={14} className="spin" />}
            <span>{isLoading ? 'Processing...' : confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
