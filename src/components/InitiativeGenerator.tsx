import React from 'react';
import { PageHeader } from './PageHeader';
import { LocalGenerator } from './generator/LocalGenerator';

export const InitiativeGenerator: React.FC<{ onSendToBidStudio?: (text: string) => void }> = ({ onSendToBidStudio }) => (
  <div className="page">
    <PageHeader title="Initiative Generator" />
    <LocalGenerator onSendToBidStudio={onSendToBidStudio} />
  </div>
);
