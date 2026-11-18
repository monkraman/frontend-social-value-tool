import React from 'react';
import { PageHeader } from './PageHeader';
import { LocalGenerator, type OpenRunRequest } from './generator/LocalGenerator';

interface InitiativeGeneratorProps {
  onSendToBidStudio?: (text: string) => void;
  openRun?: OpenRunRequest;
  onRunsChanged?: () => void;
  onActiveRunChange?: (id: string | null) => void;
}

export const InitiativeGenerator: React.FC<InitiativeGeneratorProps> = (props) => (
  <div className="page">
    <PageHeader title="Initiative Generator" />
    <LocalGenerator {...props} />
  </div>
);
