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

  const DANGER = '#C53B3B';

  const icon = isDanger ? (
    <Trash2 size={18} />
  ) : variant === 'warning' ? (
    <Archive size={18} />
  ) : (
    <HelpCircle size={18} />
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--overlay)',
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
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg, 10px)',
          border: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.15rem 1.4rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              className="icon-badge"
              style={{
                width: '38px',
                height: '38px',
                backgroundColor: isDanger ? 'rgba(197, 59, 59, 0.10)' : undefined,
                color: isDanger ? DANGER : undefined
              }}
            >
              {icon}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {title}
              </h3>
              {badge && (
                <span
                  style={{
                    display: 'inline-block',
                    marginTop: '0.25rem',
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    padding: '0.1rem 0.5rem',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: isDanger ? 'rgba(197, 59, 59, 0.10)' : 'var(--color-primary-subtle)',
                    border: `1px solid ${isDanger ? 'rgba(197, 59, 59, 0.30)' : 'var(--color-primary-border)'}`,
                    color: isDanger ? DANGER : 'var(--color-primary-text)'
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
        <div style={{ padding: '1.25rem 1.4rem', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {typeof message === 'string' ? <p style={{ margin: 0 }}>{message}</p> : message}
        </div>

        {/* Modal Footer / Actions */}
        <div
          style={{
            padding: '0.85rem 1.4rem',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-card)',
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
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${isDanger ? DANGER : 'var(--btn-primary-bg)'}`,
              backgroundColor: isDanger ? DANGER : 'var(--btn-primary-bg)',
              color: '#FFFFFF',
              boxShadow: 'var(--shadow-sm)',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              transition: 'opacity 0.15s ease'
            }}
          >
            {isLoading && <Loader2 size={14} className="spin" />}
            <span>{isLoading ? 'Working…' : confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
