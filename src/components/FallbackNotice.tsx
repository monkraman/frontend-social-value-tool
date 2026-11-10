import React from 'react';
import { Info } from 'lucide-react';

/** Shown when the backend says the AI provider failed and the deterministic engine built the packages. */
export const FallbackNotice: React.FC = () => (
  <div
    role="status"
    style={{
      display: 'flex',
      gap: '0.6rem',
      alignItems: 'flex-start',
      padding: '0.8rem 1rem',
      borderRadius: 'var(--radius-md)',
      backgroundColor: 'rgba(202, 138, 4, 0.10)',
      border: '1px solid rgba(202, 138, 4, 0.35)',
      color: 'var(--text-primary)',
      fontSize: '0.85rem',
      lineHeight: 1.45
    }}
  >
    <Info size={16} style={{ color: '#B7791F', flexShrink: 0, marginTop: '0.1rem' }} />
    <span>AI unavailable — showing the standard National TOMs template, not tailored to your documents.</span>
  </div>
);
