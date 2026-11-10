import React from 'react';

interface PageHeaderProps {
  /** Same text as the screen's sidebar label. */
  title: string;
  /** Primary actions for the screen, right-aligned. */
  actions?: React.ReactNode;
}

/** The one header every screen uses: a title and, optionally, its actions. No taglines. */
export const PageHeader: React.FC<PageHeaderProps> = ({ title, actions }) => (
  <header className="page-header">
    <h1 className="page-title">{title}</h1>
    {actions && <div className="page-actions">{actions}</div>}
  </header>
);
