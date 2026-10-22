import React, { useState, useRef } from 'react';
import { Sidebar, type ActiveTab } from './components/Sidebar';
import { PromptStudio } from './components/PromptStudio';
import { Tuner } from './components/Tuner';
import { Documents } from './components/Documents';
import { Search } from './components/Search';
import { LoginScreen } from './components/LoginScreen';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { useBackendHealth } from './hooks/useBackendHealth';
import { useOpportunityGenerator } from './hooks/useOpportunityGenerator';
import { useTheme } from './hooks/useTheme';
import { useChatHistory } from './hooks/useChatHistory';
import type { PromptHistoryItem, ResponseGenerationResult } from './types';

const DEFAULT_INITIAL_PROMPT =
  'I need to build a Social Value bid response, for a 3-year contract of £10M with 10% Social Value weighting. The client Birmingham City Council in Birmingham wants the Social Value offer to address digital inclusion and youth employment. Based on: previous responses that have scored highly, what Infosys have delivered so far, approved partnerships in our repository, recognised frameworks for SVROI (National TOMS) and geographical location - build a template of initiatives we can present to the client that would achieve 10% SV, and the impact we can expect to deliver.';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>('prompt');
  const [currentPrompt, setCurrentPrompt] = useState<string>(DEFAULT_INITIAL_PROMPT);
  const [promptFeedback, setPromptFeedback] = useState<{
    type: 'non_rfp' | 'navigated';
    message: string;
    prompt: string;
  } | null>(null);
  const [refinementNote, setRefinementNote] = useState<string | null>(null);

  const { theme, toggleTheme } = useTheme();
  const { online: backendOnline, data: healthData } = useBackendHealth();
  const {
    isLoading,
    error,
    clearError,
    result,
    targetAmount,
    submitPrompt,
    exportResponse,
    setResult
  } = useOpportunityGenerator();

  const {
    history,
    isLoadingHistory,
    isRefining,
    refineError,
    loadHistory,
    refine,
    initThread,
    resetSession,
    setSessionFromHistory,
    threadLength,
    syncThreadLength
  } = useChatHistory();

  // Ref so async callbacks always see latest prompt text
  const currentPromptRef = useRef<string>(DEFAULT_INITIAL_PROMPT);
  currentPromptRef.current = currentPrompt;

  // ────────────────────────────────────────────────────────────────────────────
  // Auth loading screen
  // ────────────────────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.25rem',
          backgroundColor: 'var(--bg-app)',
          color: 'var(--text-secondary)'
        }}
      >
        <img src="/infosys-logo.png" alt="Infosys" className="brand-logo logo-on-light" style={{ height: '40px' }} />
        <img src="/infosys-logo-dark.png" alt="Infosys" className="brand-logo logo-on-dark" style={{ height: '40px' }} />
        <div style={{ fontSize: '0.9rem' }}>Signing you in…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Send a fresh prompt (resets conversation thread completely)
  // ────────────────────────────────────────────────────────────────────────────
  const handleSendPrompt = async (promptText: string) => {
    setCurrentPrompt(promptText);
    setRefinementNote(null);
    clearError();
    resetSession(); // clears the conversation thread

    // Submit directly to backend AI pipeline
    const data = await submitPrompt(promptText);
    if (!data) {
      // Backend AI returned error, which is now captured in `error` state.
      // STOP HERE: do NOT hallucinate or synthesize unverified packages!
      return;
    }

    if (data.intent === 'navigation_documents') {
      setPromptFeedback(null);
      setActiveTab('documents');
      return;
    }
    if (data.intent === 'navigation_search') {
      setPromptFeedback(null);
      setActiveTab('search');
      return;
    }
    if (!data.is_rfp_prompt || !data.result) {
      setPromptFeedback({
        type: 'non_rfp',
        message: data.explanation || 'No tender specifications detected in this prompt.',
        prompt: promptText
      });
      setResult(null);
      setActiveTab('prompt');
      return;
    }

    // ── SUCCESS: seed the conversation thread with turn 1 ──
    initThread(promptText, data.result, data.prompt_id);
    syncThreadLength();

    setPromptFeedback(null);
    setActiveTab('prompt');
    await loadHistory(10);
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Refine: user gives feedback on the current result
  // The hook sends the FULL conversation thread so AI never forgets context.
  // ────────────────────────────────────────────────────────────────────────────
  const handleRefineResult = async (feedbackText: string) => {
    if (!result) return;

    await refine(
      feedbackText,
      result,
      currentPromptRef.current,
      (newResult: ResponseGenerationResult, note: string) => {
        setResult(newResult);
        setRefinementNote(note);
        syncThreadLength(); // update the badge
      }
    );
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Restore a past chat from sidebar history
  // ────────────────────────────────────────────────────────────────────────────
  const handleRestoreChat = async (item: PromptHistoryItem) => {
    setCurrentPrompt(item.raw_prompt);
    setPromptFeedback(null);
    setRefinementNote(null);

    const restoredResult = item.full_result as ResponseGenerationResult | undefined;

    if (restoredResult) {
      setResult(restoredResult);
      // Seed thread from the restored result so further refinements are contextual
      setSessionFromHistory(item.id, item.raw_prompt, restoredResult);
    } else if (item.is_rfp_prompt) {
      // No stored result — re-run
      setSessionFromHistory(item.id);
      await handleSendPrompt(item.raw_prompt);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // New prompt / reset
  // ────────────────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setCurrentPrompt('');
    setPromptFeedback(null);
    setResult(null);
    setRefinementNote(null);
    resetSession();
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onNewPrompt={handleReset}
        backendOnline={backendOnline}
        healthData={healthData}
        theme={theme}
        onToggleTheme={toggleTheme}
        chatHistory={history}
        isLoadingHistory={isLoadingHistory}
        onRestoreChat={handleRestoreChat}
      />

      <main style={{ flex: 1, minWidth: 0, padding: '2rem 2.5rem', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {activeTab === 'prompt' && (
          <PromptStudio
            currentPrompt={currentPrompt}
            onSendPrompt={handleSendPrompt}
            isLoading={isLoading}
            result={result}
            targetAmount={targetAmount}
            error={error}
            onClearError={clearError}
            onRetry={() => handleSendPrompt(currentPrompt || DEFAULT_INITIAL_PROMPT)}
            promptFeedback={promptFeedback}
            onNavigateTab={setActiveTab}
            onClearFeedback={() => setPromptFeedback(null)}
            onExportJson={exportResponse}
            onReset={handleReset}
            onRefineResult={handleRefineResult}
            isRefining={isRefining}
            refineError={refineError}
            refinementNote={refinementNote}
            conversationTurnCount={threadLength}
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
  <ToastProvider>
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  </ToastProvider>
);

export default App;
