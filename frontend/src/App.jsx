import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeView } from './views/HomeView';
import { QuizView } from './views/QuizView';
import { GamesView } from './views/GamesView';
import { RemindersView } from './views/RemindersView';
import { MemoriesView } from './views/MemoriesView';
import { ProfileView } from './views/ProfileView';
import { AuthView } from './views/AuthView';
import { CaregiverView } from './views/CaregiverView';
import { CompanionView } from './views/CompanionView';
import { ErrorBoundary } from './components/ErrorBoundary';
import {
  api,
  storage,
  DEFAULT_PATIENT,
  DEFAULT_REMINDERS,
  DEFAULT_MEMORIES,
  DEFAULT_GAMES,
  DEFAULT_QUESTIONS
} from './api';
import { Smartphone, Monitor } from 'lucide-react';

export function App() {
  const [currentUser, setCurrentUser] = useState(() => storage.getUser());
  const [activeTab, setActiveTab] = useState('home');
  const [inQuizMode, setInQuizMode] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [viewMode, setViewMode] = useState(() => (storage.getUser()?.role === 'caregiver' ? 'fullscreen' : 'phone'));
  const [phoneRatio, setPhoneRatio] = useState('19.5/9');
  const [textSize, setTextSize] = useState('normal');

  const RATIO_CONFIGS = {
    '19.5/9': { label: '9:19.5 (iPhone)', ratio: '9 / 19.5', height: '844px', width: '390px' },
    '20/9': { label: '9:20 (Android)', ratio: '9 / 20', height: '866px', width: '390px' },
    '16/9': { label: '9:16 (Classic)', ratio: '9 / 16', height: '693px', width: '390px' }
  };

  // Lock outer desktop page scroll when viewing mobile frame simulator
  useEffect(() => {
    if (viewMode === 'phone') {
      document.body.classList.add('phone-mode-active');
    } else {
      document.body.classList.remove('phone-mode-active');
    }
    return () => {
      document.body.classList.remove('phone-mode-active');
    };
  }, [viewMode]);

  const [patient, setPatient] = useState(() => {
    const stored = storage.getPatient();
    if (stored) return stored;
    const user = storage.getUser();
    if (user) {
      return {
        id: user.id,
        user_id: user.id,
        name: user.name,
        preferred_name: user.name,
        email: user.email
      };
    }
    return null;
  });

  const [reminders, setReminders] = useState([]);
  const [memories, setMemories] = useState([]);
  const [games, setGames] = useState(DEFAULT_GAMES);
  const [questions, setQuestions] = useState(DEFAULT_QUESTIONS);
  const [backendStatus, setBackendStatus] = useState('checking');

  // Load backend data on mount
  useEffect(() => {
    async function loadData() {
      // 1. Health check
      try {
        const health = await api.checkHealth();
        if (health.status === 'success') {
          setBackendStatus('online');
        } else {
          setBackendStatus('preview');
        }
      } catch {
        setBackendStatus('preview');
      }

      // 2. Fetch patient profile if user is logged in
      const activeUser = storage.getUser();
      if (activeUser) {
        try {
          const profile = await api.getMyProfile();
          if (profile) {
            setPatient(profile);
            storage.setPatient(profile);
            const patientId = profile.id || profile._id;
            const rems = await api.getReminders(patientId).catch(() => []);
            if (rems && rems.length > 0) setReminders(rems);
            const mems = await api.getMemories(patientId).catch(() => []);
            if (mems && mems.length > 0) setMemories(mems);
          }
        } catch (e) {
          console.warn('Profile fetch error:', e);
        }
      }

      // 3. Fetch games
      try {
        const gms = await api.getGames();
        if (gms && gms.length > 0) setGames(gms);
      } catch (e) {
        console.warn('Using default games');
      }

      // 4. Fetch questions (Personalized if patient has personal info, else fixed backup)
      try {
        const patientId = activeUser?.id;
        const qs = await api.getQuestions(null, 'easy', patientId);
        if (qs && qs.length > 0) setQuestions(qs);
      } catch (e) {
        console.warn('Using default questions');
      }
    }

    loadData();
  }, []);

  // Update text scaling on body class
  useEffect(() => {
    document.body.classList.remove('text-large', 'text-xlarge');
    if (textSize === 'large') document.body.classList.add('text-large');
    if (textSize === 'xlarge') document.body.classList.add('text-xlarge');
  }, [textSize]);

  // Handle Mark Done on Reminder
  const handleToggleReminder = async (reminderId) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === reminderId ? { ...r, completed: !r.completed } : r))
    );
    try {
      await api.completeReminder(reminderId);
    } catch (err) {
      console.error('Failed to sync reminder to backend', err);
    }
  };

  // Handle Quiz Completion
  const handleCompleteQuiz = async (stats) => {
    try {
      const patientId = patient?.id || patient?._id || patient?.patient_id || patient?.user_id || currentUser?.id;
      const gameId = selectedGame?.id || 'brain-boost';
      console.log('[SmritiRoots] Submitting quiz result:', { patientId, gameId, stats });
      const res = await api.submitGameResult({
        patient_id: patientId,
        game_id: gameId,
        score: stats.score,
        accuracy: stats.accuracy,
        time_taken: stats.timeTaken,
        difficulty: stats.nextDifficulty || 'easy'
      });
      console.log('[SmritiRoots] Quiz result successfully recorded to MongoDB:', res);
      return res;
    } catch (err) {
      console.error('[SmritiRoots] Result submission failed:', err);
      throw err;
    }
  };

  // Launch Quiz and fetch personalized or category questions for patient
  const startQuizForGame = async (game) => {
    setSelectedGame(game);
    setInQuizMode(true);
    try {
      const patientId = patient?.id || patient?._id || patient?.patient_id || patient?.user_id || currentUser?.id;
      const qs = await api.getQuestions(game?.category || null, 'easy', patientId);
      if (qs && qs.length > 0) {
        setQuestions(qs);
      }
    } catch (e) {
      console.warn('Questions fetch error for game:', e);
    }
  };

  // Handle Auth Success
  const handleAuthSuccess = async (user) => {
    setCurrentUser(user);
    storage.setUser(user);

    if (user.role === 'caregiver') {
      setViewMode('fullscreen');
    } else {
      setViewMode('phone');
    }

    // Immediately reflect the authenticated user's name on UI
    const initialProfile = {
      id: user.id,
      user_id: user.id,
      name: user.name,
      preferred_name: user.preferred_name || user.name,
      email: user.email,
      role: user.role
    };
    setPatient(initialProfile);
    storage.setPatient(initialProfile);

    // Fetch backend profile and connected data
    try {
      const profile = await api.getMyProfile();
      if (profile) {
        setPatient(profile);
        storage.setPatient(profile);
        const patientId = profile.id || profile._id;
        const rems = await api.getReminders(patientId).catch(() => []);
        if (rems && rems.length > 0) setReminders(rems);
        const mems = await api.getMemories(patientId).catch(() => []);
        if (mems && mems.length > 0) setMemories(mems);

        // Fetch questions for patient (Personalized if personal info exists, else backup)
        const qs = await api.getQuestions(null, 'easy', patientId).catch(() => []);
        if (qs && qs.length > 0) setQuestions(qs);
      }
    } catch (e) {
      console.warn('Backend profile fetch deferred:', e);
    }

    setActiveTab('home');
    setInQuizMode(false);
  };

  // Handle Logout
  const handleLogout = () => {
    storage.clearToken();
    storage.setUser(null);
    storage.setPatient(null);
    setCurrentUser(null);
    setPatient(null);
    setReminders([]);
    setMemories([]);
    setActiveTab('home');
    setInQuizMode(false);
  };

  // Find next pending reminder for Home screen card
  const nextReminder = reminders.find((r) => !r.completed) || reminders[0];

  return (
    <>
      {/* Viewport Mode & Aspect Ratio Switcher */}
      <div className="view-mode-toolbar">
        <span className="toolbar-label">Frame:</span>
        <button
          onClick={() => {
            setViewMode('phone');
            setPhoneRatio('19.5/9');
          }}
          className={`toolbar-btn ${viewMode === 'phone' && phoneRatio === '19.5/9' ? 'active' : ''}`}
          title="Modern Phone (9:19.5 - iPhone 14/15/16)"
        >
          <Smartphone size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          9:19.5 (iPhone)
        </button>
        <button
          onClick={() => {
            setViewMode('phone');
            setPhoneRatio('20/9');
          }}
          className={`toolbar-btn ${viewMode === 'phone' && phoneRatio === '20/9' ? 'active' : ''}`}
          title="Tall Android (9:20 - Galaxy / Pixel)"
        >
          <Smartphone size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          9:20 (Android)
        </button>
        <button
          onClick={() => {
            setViewMode('phone');
            setPhoneRatio('16/9');
          }}
          className={`toolbar-btn ${viewMode === 'phone' && phoneRatio === '16/9' ? 'active' : ''}`}
          title="Classic Phone (9:16 - iPhone SE / Standard)"
        >
          <Smartphone size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          9:16 (Classic)
        </button>
        <button
          onClick={() => setViewMode('fullscreen')}
          className={`toolbar-btn ${viewMode === 'fullscreen' ? 'active' : ''}`}
          title="Expanded Desktop Fullscreen"
        >
          <Monitor size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          Fullscreen
        </button>

        {currentUser && (
          <button
            onClick={handleLogout}
            className="toolbar-btn logout-quick-btn"
            style={{ color: '#DC2626', background: '#FEF2F2' }}
            title="Log out and return to Login/Register screen"
          >
            Sign Out ({currentUser.name || 'User'})
          </button>
        )}
      </div>

      {/* Main Viewport Container */}
      <div className={`app-viewport-wrapper ${viewMode === 'phone' ? 'phone-frame' : 'fullscreen'}`}>
        <div
          className="phone-shell"
          style={
            viewMode === 'phone'
              ? {
                  '--phone-ratio': (RATIO_CONFIGS[phoneRatio] || RATIO_CONFIGS['19.5/9']).ratio,
                  '--phone-height': (RATIO_CONFIGS[phoneRatio] || RATIO_CONFIGS['19.5/9']).height,
                  '--phone-width': (RATIO_CONFIGS[phoneRatio] || RATIO_CONFIGS['19.5/9']).width
                }
              : undefined
          }
        >
          {/* iOS-style Status Bar with Dynamic Island */}
          <div className="phone-status-bar">
            <span className="status-bar-time">9:41</span>
            <div className="phone-dynamic-island">
              <span className="island-lens" />
            </div>
            <div className="status-bar-icons">
              {/* Cellular Signal Bars */}
              <svg className="status-icon" viewBox="0 0 17 12" fill="currentColor">
                <rect x="0" y="8" width="3" height="4" rx="0.5" />
                <rect x="4.5" y="5.5" width="3" height="6.5" rx="0.5" />
                <rect x="9" y="3" width="3" height="9" rx="0.5" />
                <rect x="13.5" y="0.5" width="3" height="11.5" rx="0.5" />
              </svg>
              {/* Wi-Fi Icon */}
              <svg className="status-icon" viewBox="0 0 16 12" fill="currentColor">
                <path d="M8 10a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm-4.24-2.83a6 6 0 0 1 8.48 0 .75.75 0 0 0 1.06-1.06 7.5 7.5 0 0 0-10.6 0 .75.75 0 0 0 1.06 1.06zm-2.12-2.12a9 9 0 0 1 12.72 0 .75.75 0 1 0 1.06-1.06 10.5 10.5 0 0 0-14.84 0 .75.75 0 0 0 1.06 1.06z" />
              </svg>
              {/* Battery Icon */}
              <svg className="status-icon" viewBox="0 0 24 12" fill="currentColor">
                <rect x="0" y="0.5" width="20" height="11" rx="3" stroke="currentColor" strokeWidth="1" fill="none" />
                <rect x="2" y="2.5" width="14" height="7" rx="1.5" />
                <path d="M22 4.5V7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Dynamic Content Scroll Area - Internal Vertical Scroll */}
          <div className={`app-content-scroll ${currentUser && currentUser.role !== 'caregiver' && !inQuizMode && activeTab !== 'companion' ? 'has-bottom-nav' : 'no-bottom-nav'}`}>
            {/* 1. If not logged in, render AuthView (Login & Register) */}
            {!currentUser ? (
              <AuthView onAuthSuccess={handleAuthSuccess} />
            ) : currentUser.role === 'caregiver' ? (
              /* 2. Caregiver Clinical Portal (Role-based access) */
              <ErrorBoundary>
                <CaregiverView
                  currentUser={currentUser}
                  onLogout={handleLogout}
                />
              </ErrorBoundary>
            ) : inQuizMode ? (
              /* 3. If in Quiz View, display Quiz */
              <QuizView
                questions={questions}
                patient={patient}
                gameTitle={selectedGame?.name || 'Brain Boost Quiz'}
                onBack={() => setInQuizMode(false)}
                onCompleteQuiz={handleCompleteQuiz}
              />
            ) : activeTab === 'companion' ? (
              /* 4. SmritiRoots Voice AI Companion */
              <CompanionView
                patient={patient}
                onBack={() => setActiveTab('home')}
              />
            ) : (
              /* 5. Elder / Patient Mobile Dashboard */
              <>
                {/* Standard Brand Header */}
                <Header
                  patient={patient}
                  onAvatarClick={() => setActiveTab('profile')}
                />

                {/* Tab Views */}
                {activeTab === 'home' && (
                  <HomeView
                    patient={patient}
                    nextReminder={nextReminder}
                    onOpenCompanion={() => setActiveTab('companion')}
                    onStartQuiz={() => {
                      startQuizForGame(games[0] || { id: 'brain-boost', name: 'Brain Boost' });
                    }}
                    onCompleteReminder={handleToggleReminder}
                    onViewMemories={() => {
                      setActiveTab('memories');
                      const patientId = patient?.id || patient?._id;
                      if (patientId) {
                        api.getMemories(patientId).then((mems) => {
                          if (mems && mems.length > 0) setMemories(mems);
                        }).catch(() => {});
                      }
                    }}
                  />
                )}

                {activeTab === 'games' && (
                  <GamesView
                    games={games}
                    onPlayGame={(game) => {
                      startQuizForGame(game);
                    }}
                  />
                )}

                {activeTab === 'reminders' && (
                  <RemindersView
                    reminders={reminders}
                    onToggleReminder={handleToggleReminder}
                  />
                )}

                {activeTab === 'memories' && (
                  <MemoriesView
                    memories={memories}
                    onBack={() => setActiveTab('home')}
                  />
                )}

                {activeTab === 'profile' && (
                  <ProfileView
                    patient={patient}
                    backendStatus={backendStatus}
                    textSize={textSize}
                    onTextSizeChange={setTextSize}
                    onLogout={handleLogout}
                  />
                )}
              </>
            )}
          </div>

          {/* Bottom Navigation Dock (Visible on main tabs for patient, hidden for caregiver & quiz) */}
          {currentUser && currentUser.role !== 'caregiver' && !inQuizMode && activeTab !== 'companion' && (
            <BottomNav
              activeTab={activeTab}
              onTabChange={(tab) => {
                setActiveTab(tab);
                setInQuizMode(false);
              }}
              reminderCount={reminders.filter((r) => !r.completed).length}
            />
          )}

          {/* iOS Home Indicator Bar (for Phone Frame simulator) */}
          {viewMode === 'phone' && <div className="phone-home-indicator" />}
        </div>
      </div>
    </>
  );
}

export default App;
