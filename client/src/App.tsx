import React, { useState, useEffect, useCallback } from 'react';
import styles from './App.module.css';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { TelemetryGrid } from './components/TelemetryGrid';
import { TerminalConsole } from './components/TerminalConsole';
import { RoadmapGrid } from './components/RoadmapGrid';
import { GameCatalog } from './components/catalog/GameCatalog';
import { ContentAdminConsole } from './components/admin/ContentAdminConsole';
import { OperationsDashboard } from './components/admin/OperationsDashboard';
import { ProgressHubModal } from './components/progress/ProgressHubModal';
import { ProfileModal } from './components/profile/ProfileModal';
import { MultiplayerLobbyModal } from './components/multiplayer/MultiplayerLobbyModal';
import { SubscriptionPlansModal } from './components/subscriptions/SubscriptionPlansModal';
import { UpgradePromptModal } from './components/subscriptions/UpgradePromptModal';
import { AuthModal, AuthMode, User } from './components/AuthModal';
import { HealthData, TerminalEntry } from './types/telemetry';
import { getCsrfToken } from './utils/csrf';

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [environment, setEnvironment] = useState<string>('STAGING');

  // Authentication State (Sprint 01: Secure HttpOnly Cookie-Based Authentication)
  // Tokens are NEVER stored in localStorage or sessionStorage
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<AuthMode>('login');
  const [isAdminConsoleVisible, setIsAdminConsoleVisible] = useState<boolean>(true);
  const [isCareerHubOpen, setIsCareerHubOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isMultiplayerOpen, setIsMultiplayerOpen] = useState<boolean>(false);
  const [multiplayerGameSlug, setMultiplayerGameSlug] = useState<string | null>(null);

  // Sprint 11: Premium Access & Entitlements State (EP08-01, EP08-03, EP08-04)
  const [isPlansModalOpen, setIsPlansModalOpen] = useState<boolean>(false);
  const [isUpgradePromptOpen, setIsUpgradePromptOpen] = useState<boolean>(false);
  const [upgradePromptData, setUpgradePromptData] = useState<{
    gameTitle: string;
    requiredPlan: string;
    reason: 'unsubscribed' | 'expired';
    expiredAt?: string;
  }>({
    gameTitle: 'Solar Siege',
    requiredPlan: 'Nexus Pro',
    reason: 'unsubscribed'
  });
  const [membershipStatus, setMembershipStatus] = useState<{
    tier: string;
    planId: string;
    status: string;
    isActive: boolean;
    currentPeriodEnd: string | null;
    renewalDate: string | null;
  } | null>(null);

  const [logs, setLogs] = useState<TerminalEntry[]>([
    {
      id: 'init-1',
      time: new Date().toLocaleTimeString(),
      message: 'NexusPlay React 19 + TypeScript Core Initialized.',
      type: 'dim',
    },
    {
      id: 'init-2',
      time: new Date().toLocaleTimeString(),
      message: 'Sprint 01 Identity & Security active (HttpOnly cookies, CSRF protection, rate limits).',
      type: 'green',
    },
    {
      id: 'init-3',
      time: new Date().toLocaleTimeString(),
      message: 'Sprint 02 Game Discovery Engine online: Published catalog browsing, search & filter active.',
      type: 'blue',
    },
    {
      id: 'init-4',
      time: new Date().toLocaleTimeString(),
      message: 'Sprint 03 Content Administration online: Metadata CRUD, publication workflow, licensing gate, and audit logging.',
      type: 'green',
    },
    {
      id: 'init-5',
      time: new Date().toLocaleTimeString(),
      message: 'Sprint 04 Game Launching & First Playable online: Cyber Invaders Canvas 2D engine & solo sessions active.',
      type: 'blue',
    },
    {
      id: 'init-6',
      time: new Date().toLocaleTimeString(),
      message: 'Sprint 05 Game Progress, History & Achievements online: 10-session history, wave checkpoints & medals active.',
      type: 'green',
    },
    {
      id: 'init-7',
      time: new Date().toLocaleTimeString(),
      message: 'Sprint 06 Player Profiles & Administrative Audit online: Avatar emblems, bio & DB-level immutability active.',
      type: 'blue',
    },
    {
      id: 'init-8',
      time: new Date().toLocaleTimeString(),
      message: 'Sprint 07 Monitoring, Alerting & Deployment Safety online: SRE dashboard, real-time alerts & rollback procedure active.',
      type: 'green',
    },
    {
      id: 'init-9',
      time: new Date().toLocaleTimeString(),
      message: 'Sprint 08 Real-Time Multiplayer online: 2-player lobby lifecycle, 6-char codes & synchronized state active.',
      type: 'blue',
    },
  ]);

  const addLog = useCallback((message: string, type: TerminalEntry['type'] = 'dim') => {
    const entry: TerminalEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      time: new Date().toLocaleTimeString(),
      message,
      type,
    };
    setLogs((prev) => [...prev.slice(-30), entry]);
  }, []);

  // Probe health
  const probeHealth = useCallback(async () => {
    const start = performance.now();
    try {
      const res = await fetch('/api/health');
      const latency = Math.round(performance.now() - start);
      setLatencyMs(latency);

      if (res.ok) {
        const data: HealthData = await res.json();
        setHealth(data);
        setIsOnline(true);
        setEnvironment((data.environment || 'STAGING').toUpperCase());
        addLog(`Health probe succeeded (${latency}ms, DB: ${data.database})`, 'green');
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err: any) {
      setIsOnline(false);
      setLatencyMs(null);
      addLog(`Health probe failed: ${err.message}`, 'rose');
    }
  }, [addLog]);

  // Session verification on mount via ambient HttpOnly cookie
  useEffect(() => {
    fetch('/api/v1/auth/me', {
      credentials: 'include'
    })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Session not active');
      })
      .then((data) => {
        setCurrentUser(data.user);
        addLog(`Active HttpOnly session restored for player: ${data.user.displayName}`, 'blue');
      })
      .catch(() => {
        setCurrentUser(null);
      });
  }, [addLog]);

  // Fetch membership status for authenticated player (EP08-03, AC-29.1, AC-29.2)
  const fetchMembership = useCallback(async () => {
    if (!currentUser) {
      setMembershipStatus(null);
      return;
    }
    try {
      const res = await fetch('/api/v1/subscriptions/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setMembershipStatus(data.subscription || null);
      }
    } catch (e) {
      setMembershipStatus(null);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchMembership();
  }, [fetchMembership]);
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connect = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setWsConnected(true);
          addLog(`Realtime WebSocket connected to ${wsUrl}`, 'green');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'CONNECTION_ESTABLISHED') {
              addLog(`Realtime Handshake: ${data.message}`, 'blue');
            }
          } catch (e) {
            // ignore
          }
        };

        ws.onclose = () => {
          setWsConnected(false);
          addLog('Realtime WebSocket disconnected. Retrying in 5s...', 'yellow');
          reconnectTimeout = setTimeout(connect, 5000);
        };

        ws.onerror = () => {
          setWsConnected(false);
        };
      } catch (e: any) {
        addLog(`WS Connection error: ${e.message}`, 'yellow');
      }
    };

    connect();
    probeHealth();
    const interval = setInterval(probeHealth, 15000);

    return () => {
      clearInterval(interval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, [probeHealth, addLog]);

  const handleOpenAuth = (mode: AuthMode) => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccess = (user: User) => {
    // Tokens are safely kept inside the browser's HttpOnly cookie jar
    setCurrentUser(user);
    addLog(`Authenticated as ${user.displayName} (${user.email}) via secure HttpOnly cookie`, 'green');
  };

  const handleSignOut = async () => {
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken()
        }
      });
    } catch (e) {
      // ignore network error
    }
    setCurrentUser(null);
    addLog('Player signed out. HttpOnly session cookie cleared and revoked from authorization store.', 'yellow');
  };

  return (
    <div className={styles.appWrapper}>
      {/* Background Glowing Auras */}
      <div className={`${styles.glowOrb} ${styles.orb1}`} aria-hidden="true" />
      <div className={`${styles.glowOrb} ${styles.orb2}`} aria-hidden="true" />
      <div className={`${styles.glowOrb} ${styles.orb3}`} aria-hidden="true" />

      <Navbar
        environment={environment}
        isOnline={isOnline}
        latencyMs={latencyMs}
        onProbe={probeHealth}
        currentUser={currentUser}
        onOpenLogin={() => handleOpenAuth('login')}
        onOpenRegister={() => handleOpenAuth('register')}
        onSignOut={handleSignOut}
        isAdminConsoleVisible={isAdminConsoleVisible}
        onToggleAdminConsole={() => setIsAdminConsoleVisible(v => !v)}
        onOpenCareerHub={() => setIsCareerHubOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenMultiplayer={() => {
          setMultiplayerGameSlug(null);
          setIsMultiplayerOpen(true);
        }}
        onOpenPlans={() => setIsPlansModalOpen(true)}
        membershipStatus={membershipStatus}
      />

      <main className={styles.mainContent} id="mainContent">
        <HeroSection
          uptimeSeconds={health?.uptimeSeconds ?? 0}
          pipelineStatus="PASS"
        />

        <TelemetryGrid
          health={health}
          wsConnected={wsConnected}
        />

        {/* Sprint 07: SRE Operations & Monitoring Dashboard (Accessible to Authorized Admins) */}
        {currentUser?.role === 'admin' && (
          <OperationsDashboard onLog={addLog} />
        )}

        {/* Sprint 03: Content Administration Console (Accessible to Authorized Admins) */}
        {currentUser?.role === 'admin' && isAdminConsoleVisible && (
          <ContentAdminConsole onLog={addLog} />
        )}

        {/* Sprint 02: Game Discovery & Catalog Component */}
        <GameCatalog
          onLog={addLog}
          onOpenMultiplayer={(slug) => {
            setMultiplayerGameSlug(slug);
            setIsMultiplayerOpen(true);
          }}
          onOpenPlans={() => setIsPlansModalOpen(true)}
          onOpenUpgradePrompt={(gameTitle, requiredPlan, reason, expiredAt) => {
            setUpgradePromptData({
              gameTitle,
              requiredPlan: requiredPlan || 'Nexus Pro',
              reason: reason || 'unsubscribed',
              expiredAt
            });
            setIsUpgradePromptOpen(true);
          }}
        />

        <TerminalConsole logs={logs} />

        <RoadmapGrid />
      </main>

      <footer className={styles.footer} id="mainFooter">
        <div className={styles.footerContainer}>
          <div>
            <strong>NexusPlay Online Gaming Platform</strong> — Built with React 19, TypeScript & Google Antigravity
          </div>
          <div className={styles.footerRight}>
            <span>Active Sprint: <strong>11 (Premium Access & Entitlements)</strong></span>
            <span>Architecture: <strong>ADR-0007 Verified</strong></span>
            <span>Target Capacity: <strong>10,000 CCU</strong></span>
          </div>
        </div>
      </footer>

      {/* Sprint 01 Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        onLog={addLog}
      />

      {/* Sprint 05 Career & Milestones Hub Modal */}
      <ProgressHubModal
        isOpen={isCareerHubOpen}
        onClose={() => setIsCareerHubOpen(false)}
        onResumeGame={(slug) => {
          setIsCareerHubOpen(false);
          const catalogEl = document.getElementById('game-catalog');
          if (catalogEl) catalogEl.scrollIntoView({ behavior: 'smooth' });
          addLog(`Resuming mission checkpoint for "${slug}". Launching via Discovery Engine.`, 'green');
        }}
        onLog={addLog}
      />

      {/* Sprint 06 Player Profile Modal (EP01-04) */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        onProfileUpdated={(updated) => {
          setCurrentUser((prev) => (prev ? { ...prev, displayName: updated.displayName } : null));
          addLog(`Player identity updated to: "${updated.displayName}"`, 'green');
        }}
        onLog={addLog}
      />

      {/* Sprint 08 Two-Player Multiplayer Sessions (EP05-01, EP05-02, EP05-03) */}
      <MultiplayerLobbyModal
        isOpen={isMultiplayerOpen}
        onClose={() => {
          setIsMultiplayerOpen(false);
          setMultiplayerGameSlug(null);
        }}
        currentUser={currentUser}
        onOpenLogin={() => handleOpenAuth('login')}
        preselectedGameSlug={multiplayerGameSlug}
        onLog={addLog}
      />

      {/* Sprint 11 Subscription Plans Comparison Modal (EP08-01, EP08-03, AC-27.1..27.3, AC-29.1..29.3) */}
      <SubscriptionPlansModal
        isOpen={isPlansModalOpen}
        onClose={() => setIsPlansModalOpen(false)}
        currentUser={currentUser}
        onOpenLogin={() => handleOpenAuth('login')}
        onLog={addLog}
        onSubscriptionUpdated={() => fetchMembership()}
      />

      {/* Sprint 11 Upgrade Prompt Modal on Launch Denial (EP08-04, AC-30.1..30.3) */}
      <UpgradePromptModal
        isOpen={isUpgradePromptOpen}
        onClose={() => setIsUpgradePromptOpen(false)}
        onOpenPlans={() => setIsPlansModalOpen(true)}
        gameTitle={upgradePromptData.gameTitle}
        requiredPlan={upgradePromptData.requiredPlan}
        reason={upgradePromptData.reason}
        expiredAt={upgradePromptData.expiredAt}
      />
    </div>
  );
};

export default App;
