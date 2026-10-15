import React, { useState } from 'react';
import { Sidebar, type ActiveTab } from './components/Sidebar';
import { PromptStudio } from './components/PromptStudio';
import { Tuner } from './components/Tuner';
import { Documents } from './components/Documents';
import { Search } from './components/Search';
import { LoginScreen } from './components/LoginScreen';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useBackendHealth } from './hooks/useBackendHealth';
import { useOpportunityGenerator } from './hooks/useOpportunityGenerator';
import { useTheme } from './hooks/useTheme';
import { parseRfpPrompt } from './utils/promptParser';

const DEFAULT_INITIAL_PROMPT =
  'I need to build a Social Value bid response, for a 3-year contract of £10M with 10% Social Value weighting. The client Birmingham City Council in Birmingham wants the Social Value offer to address digital inclusion and youth employment. Based on: previous responses that have scored highly, what Infosys have delivered so far, approved partnerships in our repository, recognised frameworks for SVROI (National TOMS) and geographical location - build a template of initiatives we can present to the client that would achieve 10% SV, and the impact we can expect to deliver.';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>('prompt');
  const [currentPrompt, setCurrentPrompt] = useState<string>(DEFAULT_INITIAL_PROMPT);

  const { theme, toggleTheme } = useTheme();
  const { online: backendOnline } = useBackendHealth();
  const { isLoading, result, targetAmount, generate, exportResponse, setResult } = useOpportunityGenerator();

  // Show minimal loader while verifying existing session token
  if (authLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-app)',
          color: 'var(--text-secondary)'
        }}
      >
        <div style={{ fontSize: '0.875rem' }}>Verifying Superadmin Session...</div>
      </div>
    );
  }

  // 1. GATE: If not authenticated with backend, render LoginScreen
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // 2. WORKSPACE: If authenticated, render full application
  const handleSendPrompt = async (promptText: string) => {
    setCurrentPrompt(promptText);
    const parsed = parseRfpPrompt(promptText);
    await generate(parsed.request);
    setActiveTab('prompt');
  };

  const handleReset = () => {
    setCurrentPrompt('');
    setResult(null);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      {/* Minimalist Sidebar with Superadmin profile & Sign Out */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onNewPrompt={handleReset}
        backendOnline={backendOnline}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Workspace Area */}
      <main style={{ flex: 1, minWidth: 0, padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {activeTab === 'prompt' && (
          <PromptStudio
            currentPrompt={currentPrompt}
            onSendPrompt={handleSendPrompt}
            isLoading={isLoading}
            result={result}
            targetAmount={targetAmount}
            onExportJson={exportResponse}
            onReset={handleReset}
          />
        )}

        {activeTab === 'tuner' && <Tuner />}

        {activeTab === 'documents' && <Documents />}

        {activeTab === 'search' && <Search />}
      </main>
    </div>
  );
};

export const App: React.FC = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
