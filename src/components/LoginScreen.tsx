import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginScreen: React.FC = () => {
  const { login, isLoading, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email.trim() || !password.trim()) {
      setLocalError('Please enter your email and password.');
      return;
    }

    try {
      await login(email.trim(), password);
    } catch {
      // Error managed in context / displayed via activeError
    }
  };

  const activeError = localError || error;

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '380px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-md)',
          padding: '2rem'
        }}
      >
        <div
          style={{
            paddingBottom: '1.25rem',
            borderBottom: '1px solid var(--border-subtle)'
          }}
        >
          <img
            src="/infosys-logo.png"
            alt="Infosys"
            className="brand-logo"
            style={{ height: '30px', marginBottom: '1.25rem' }}
          />
          <h1
            style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              marginBottom: '0.25rem'
            }}
          >
            Sign in
          </h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            to continue to Social Value RFP Engine
          </p>
        </div>

        {activeError && (
          <div
            style={{
              padding: '0.6rem 0.85rem',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8125rem',
              color: '#ef4444'
            }}
          >
            {activeError}
          </div>
        )}

        {/* Demo / Superadmin Credentials Helper */}
        <div
          style={{
            padding: '0.65rem 0.85rem',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <div><strong>Default Superadmin:</strong></div>
            <div style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>admin@infosys.com / admin123</div>
          </div>
          <button
            type="button"
            onClick={() => {
              setEmail('admin@infosys.com');
              setPassword('admin123');
            }}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-medium)',
              borderRadius: '4px',
              padding: '0.25rem 0.5rem',
              color: 'var(--color-primary, #3b82f6)',
              cursor: 'pointer',
              fontSize: '0.75rem'
            }}
          >
            Auto-fill
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: 'var(--text-primary)',
                marginBottom: '0.35rem'
              }}
            >
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="input-field"
              style={{ width: '100%' }}
              autoFocus
              required
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: 'var(--text-primary)',
                marginBottom: '0.35rem'
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="input-field"
              style={{ width: '100%' }}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '0.6rem 1rem',
              marginTop: '0.5rem',
              justifyContent: 'center',
              fontSize: '0.875rem',
              fontWeight: 500
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
