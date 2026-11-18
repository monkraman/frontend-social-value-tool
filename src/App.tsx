import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar, type ActiveTab } from './components/Sidebar';
import { PromptStudio } from './components/PromptStudio';
import { Tuner } from './components/Tuner';
import { Documents } from './components/Documents';
import { Search } from './components/Search';
import { TomsCatalog } from './components/TomsCatalog';
import { PartnersEcosystem } from './components/PartnersEcosystem';
import { OpportunityFinder } from './components/OpportunityFinder';
import { InitiativeGenerator } from './components/InitiativeGenerator';
import { LoginScreen } from './components/LoginScreen';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { useBackendHealth } from './hooks/useBackendHealth';
import { useOpportunityGenerator } from './hooks/useOpportunityGenerator';
import { useTheme } from './hooks/useTheme';
import { useChatHistory } from './hooks/useChatHistory';
import { deleteRun, listRuns, type RunSummary } from './api/generator';
import type { OpenRunRequest } from './components/generator/LocalGenerator';
import { useToast } from './context/ToastContext';
import type { ResponseGenerationResult } from './types';

const DEFAULT_INITIAL_PROMPT =
  'I need to build a Social Value bid response, for a 3-year contract of £10M with 10% Social Value weighting. The client Birmingham City Council in Birmingham wants the Social Value offer to address digital inclusion and youth employment. Based on: previous responses that have scored highly, what Infosys have delivered so far, approved partnerships in our repository, recognised frameworks for SVROI (National TOMS) and geographical location - build a template of initiatives we can present to the client that would achieve 10% SV, and the impact we can expect to deliver.';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>('generator');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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
    isRefining,
    refineError,
    loadHistory,
    refine,
    initThread,
    resetSession,
    threadLength,
    syncThreadLength
  } = useChatHistory();

  // ── Initiative Generator history: the signed-in user's own saved tenders ──
  const toast = useToast();
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [isLoadingRuns, setIsLoadingRuns] = useState(false);
  const [openRun, setOpenRun] = useState<OpenRunRequest | undefined>(undefined);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  const refreshRuns = useCallback(async () => {
    setIsLoadingRuns(true);
    try {
      setRuns(await listRuns(50));
    } catch (e) {
      console.error('Failed to load history:', e);
    } finally {
      setIsLoadingRuns(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) refreshRuns();
    else setRuns([]);
  }, [isAuthenticated, refreshRuns]);

  const handleOpenRun = (id: string) => {
    setActiveTab('generator');
    setMobileNavOpen(false);
    setOpenRun({ id, nonce: Date.now() });
  };

  const handleDeleteRun = async (id: string) => {
    try {
      await deleteRun(id);
      if (id === activeRunId) setOpenRun({ id: null, nonce: Date.now() });
      toast.success('Removed from your history');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      refreshRuns();
    }
  };

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
  // New bid: a blank Initiative Generator
  // ────────────────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setCurrentPrompt('');
    setPromptFeedback(null);
    setResult(null);
    setRefinementNote(null);
    resetSession();
    setActiveTab('generator');
    setOpenRun({ id: null, nonce: Date.now() });
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────────
  const goToTab = (tab: ActiveTab) => {
    // The generator unmounts on other tabs; coming back reopens the tender that was on screen.
    if (tab === 'generator' && activeTab !== 'generator' && activeRunId) setOpenRun({ id: activeRunId, nonce: Date.now() });
    setActiveTab(tab);
    setMobileNavOpen(false);
  };

  return (
    <div className="app-shell">
      <Sidebar
        activeTab={activeTab}
        onTabChange={goToTab}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
        onNewPrompt={handleReset}
        backendOnline={backendOnline}
        healthData={healthData}
        theme={theme}
        onToggleTheme={toggleTheme}
        runs={runs}
        isLoadingRuns={isLoadingRuns}
        activeRunId={activeTab === 'generator' ? activeRunId : null}
        onOpenRun={handleOpenRun}
        onDeleteRun={handleDeleteRun}
      />

      <div className="app-body">
      <header className="mobile-topbar">
        <button
          type="button"
          className="icon-button"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open menu"
          aria-expanded={mobileNavOpen}
        >
          <Menu size={20} />
        </button>
        <img src="/infosys-logo.png" alt="Infosys" className="brand-logo logo-on-light" style={{ height: '22px' }} />
        <img src="/infosys-logo-dark.png" alt="Infosys" className="brand-logo logo-on-dark" style={{ height: '22px' }} />
        <span className="mobile-topbar-title">Social Value</span>
      </header>

      <main className="app-main">
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
        {activeTab === 'opportunity' && (
          <OpportunityFinder
            onSendToBidStudio={(promptText) => {
              setCurrentPrompt(promptText);
              setActiveTab('prompt');
            }}
          />
        )}
        {activeTab === 'generator' && (
          <InitiativeGenerator
            onSendToBidStudio={(promptText) => {
              setCurrentPrompt(promptText);
              setActiveTab('prompt');
            }}
            openRun={openRun}
            onRunsChanged={refreshRuns}
            onActiveRunChange={setActiveRunId}
          />
        )}
        {activeTab === 'tuner' && <Tuner />}
        {activeTab === 'toms' && (
          <TomsCatalog
            onSendToPrompt={(promptText) => {
              setCurrentPrompt(promptText);
              setActiveTab('prompt');
            }}
          />
        )}
        {activeTab === 'partners' && <PartnersEcosystem />}
        {activeTab === 'documents' && <Documents />}
        {activeTab === 'search' && <Search />}
      </main>
      </div>
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
