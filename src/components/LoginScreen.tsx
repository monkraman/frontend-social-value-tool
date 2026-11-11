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
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.25rem',
        padding: '1.5rem'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.4rem',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderTop: '4px solid var(--color-primary)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          padding: '2.25rem 2.25rem 2rem 2.25rem'
        }}
      >
        <div
          style={{
            paddingBottom: '1.25rem',
            borderBottom: '1px solid var(--border-subtle)'
          }}
        >
          <img src="/infosys-logo.png" alt="Infosys" className="brand-logo logo-on-light" style={{ height: '40px', marginBottom: '1.6rem' }} />
          <img src="/infosys-logo-dark.png" alt="Infosys" className="brand-logo logo-on-dark" style={{ height: '40px', marginBottom: '1.6rem' }} />
          <div className="eyebrow" style={{ marginBottom: '0.4rem' }}>
            Social Value · RFP Response Engine
          </div>
          <h1
            style={{
              fontSize: '1.6rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: '0.3rem'
            }}
          >
            Welcome back
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Sign in to continue building your social value responses.
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '0.4rem'
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
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '0.4rem'
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
              padding: '0.75rem 1rem',
              marginTop: '0.4rem',
              justifyContent: 'center',
              fontSize: '0.9rem',
              fontWeight: 600
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Signing you in…</span>
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
