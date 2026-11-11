import React, { useState } from 'react';
import { FolderOpen, Server } from 'lucide-react';
import { PageHeader } from './PageHeader';
import { BackendGenerator } from './InitiativeGeneratorBackend';
import { LocalGenerator } from './generator/LocalGenerator';

/**
 * Two ways to generate initiatives:
 *  - Local library: patterns, measures and past responses read from the reference folder on this computer.
 *  - Backend: the tables and AI held by the API.
 */
export const InitiativeGenerator: React.FC = () => {
  const [source, setSource] = useState<'local' | 'backend'>('local');

  return (
    <div className="page">
      <PageHeader
        title="Initiative Generator"
        actions={
          <div className="segmented" role="tablist" aria-label="Source">
            <button role="tab" aria-selected={source === 'local'} className={source === 'local' ? 'is-active' : ''} onClick={() => setSource('local')}>
              <FolderOpen size={14} /> Local library
            </button>
            <button role="tab" aria-selected={source === 'backend'} className={source === 'backend' ? 'is-active' : ''} onClick={() => setSource('backend')}>
              <Server size={14} /> Backend
            </button>
          </div>
        }
      />
      {source === 'local' ? <LocalGenerator /> : <BackendGenerator />}
    </div>
  );
};
