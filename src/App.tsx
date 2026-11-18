import React, { useCallback, useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar, type ActiveTab } from './components/Sidebar';
import { Tuner } from './components/Tuner';
import { Documents } from './components/Documents';
import { Search } from './components/Search';
import { TomsCatalog } from './components/TomsCatalog';
import { PartnersEcosystem } from './components/PartnersEcosystem';
import { InitiativeGenerator } from './components/InitiativeGenerator';
import { LoginScreen } from './components/LoginScreen';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { useBackendHealth } from './hooks/useBackendHealth';
import { useTheme } from './hooks/useTheme';
import { deleteRun, listRuns, type RunSummary } from './api/generator';
import type { OpenRunRequest } from './components/generator/LocalGenerator';
import { useToast } from './context/ToastContext';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>('generator');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const { theme, toggleTheme } = useTheme();
  const { online: backendOnline, data: healthData } = useBackendHealth();

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
  // New bid: a blank Initiative Generator
  // ────────────────────────────────────────────────────────────────────────────
  const handleReset = () => {
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
        {activeTab === 'generator' && (
          <InitiativeGenerator
            openRun={openRun}
            onRunsChanged={refreshRuns}
            onActiveRunChange={setActiveRunId}
          />
        )}
        {activeTab === 'tuner' && <Tuner />}
        {activeTab === 'toms' && <TomsCatalog />}
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
