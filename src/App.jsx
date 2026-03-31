import React, { useState, useEffect, useCallback, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import Header from './components/Header';
import Login from './components/Login';
import IncidentDashboard from './pages/IncidentDashboard';
import ProfilePage from './pages/ProfilePage';
import { logoutUser, restoreUserSession } from './api';
import './index.css';

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
const WARNING_DURATION_SECONDS = 60;
const WARNING_TIMEOUT_MS = WARNING_DURATION_SECONDS * 1000;
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];

const getStoredUser = () => {
  const saved = sessionStorage.getItem('sn_user') || localStorage.getItem('sn_user_backup');

  try {
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const DASHBOARD_PATH = '/home';
const PROFILE_PATH = '/profile';
const DEFAULT_DASHBOARD_FILTER = 'active=true';
const DEFAULT_DASHBOARD_PAGE = '1';

const getInitialView = () => {
  const url = new URL(window.location.href);
  return url.pathname.endsWith(PROFILE_PATH) ? 'profile' : 'dashboard';
};

function App() {
  const warningTimeoutRef = useRef(null);
  const logoutTimeoutRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  const [isAuthenticated, setIsAuthenticated] = useState(() => !!sessionStorage.getItem('sn_auth_token'));
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());
  const [activeView, setActiveView] = useState(() => getInitialView());
  const [dashboardResetKey, setDashboardResetKey] = useState(0);
  const [isRestoringSession, setIsRestoringSession] = useState(() => !sessionStorage.getItem('sn_auth_token') && !!localStorage.getItem('sn_auth_token_backup'));
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(WARNING_DURATION_SECONDS);

  const clearSessionTimers = useCallback(() => {
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    if (logoutTimeoutRef.current) clearTimeout(logoutTimeoutRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  }, []);

  const handleLogout = useCallback((message) => {
    clearSessionTimers();
    setShowSessionWarning(false);
    setSecondsRemaining(WARNING_DURATION_SECONDS);
    logoutUser();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setActiveView('dashboard');
    setIsRestoringSession(false);

    if (message) {
      toast(message, { icon: '⏳' });
    }
  }, [clearSessionTimers]);

  const startWarningCountdown = useCallback(() => {
    clearSessionTimers();
    setShowSessionWarning(true);
    setSecondsRemaining(WARNING_DURATION_SECONDS);

    countdownIntervalRef.current = setInterval(() => {
      setSecondsRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    logoutTimeoutRef.current = setTimeout(() => {
      handleLogout('You were logged out after inactivity.');
    }, WARNING_TIMEOUT_MS);
  }, [clearSessionTimers, handleLogout]);

  const resetInactivityTimer = useCallback(() => {
    if (!isAuthenticated) return;

    clearSessionTimers();
    setShowSessionWarning(false);
    setSecondsRemaining(WARNING_DURATION_SECONDS);

    warningTimeoutRef.current = setTimeout(() => {
      startWarningCountdown();
    }, INACTIVITY_TIMEOUT_MS - WARNING_TIMEOUT_MS);
  }, [clearSessionTimers, isAuthenticated, startWarningCountdown]);

  const handleStaySignedIn = useCallback(async () => {
    try {
      await restoreUserSession();
      resetInactivityTimer();
      toast.success('Session extended successfully.');
    } catch (error) {
      handleLogout('Your session expired. Please sign in again.');
    }
  }, [handleLogout, resetInactivityTimer]);

  useEffect(() => {
    const hasBackupSession = !!localStorage.getItem('sn_auth_token_backup');

    if (!sessionStorage.getItem('sn_auth_token') && hasBackupSession) {
      setIsRestoringSession(true);

      restoreUserSession()
        .then(({ user }) => {
          setCurrentUser(user);
          setIsAuthenticated(true);
        })
        .catch(() => {
          setCurrentUser(null);
          setIsAuthenticated(false);
        })
        .finally(() => {
          setIsRestoringSession(false);
        });

      return;
    }

    setIsRestoringSession(false);
  }, []);

  useEffect(() => {
    const handleSessionRestored = (event) => {
      const restoredUser = event.detail?.user || getStoredUser();
      if (restoredUser) {
        setCurrentUser(restoredUser);
      }
      setIsAuthenticated(true);
    };

    const handleSessionExpired = () => {
      handleLogout('Your session expired. Please sign in again.');
    };

    window.addEventListener('sn-session-restored', handleSessionRestored);
    window.addEventListener('sn-session-expired', handleSessionExpired);

    return () => {
      window.removeEventListener('sn-session-restored', handleSessionRestored);
      window.removeEventListener('sn-session-expired', handleSessionExpired);
    };
  }, [handleLogout]);

  useEffect(() => {
    const url = new URL(window.location.href);

    if (activeView === 'profile') {
      url.pathname = PROFILE_PATH;
      url.search = '';
    } else {
      url.pathname = DASHBOARD_PATH;
      url.searchParams.delete('view');
    }

    url.hash = '';
    window.history.replaceState({}, '', `${url.pathname}${url.search}`);
  }, [activeView]);

  useEffect(() => {
    if (!isAuthenticated) {
      clearSessionTimers();
      return undefined;
    }

    const handleActivity = () => {
      if (!showSessionWarning) {
        resetInactivityTimer();
      }
    };

    resetInactivityTimer();
    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, true);
    });

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity, true);
      });
      clearSessionTimers();
    };
  }, [clearSessionTimers, isAuthenticated, resetInactivityTimer, showSessionWarning]);

  if (isRestoringSession) {
    return (
      <>
        <Toaster position="top-right" />
        <div className="session-status-shell">
          <div className="session-status-card">
            <div className="session-status-spinner" />
            <h2>Restoring your session...</h2>
            <p>Reconnecting you securely to the incident dashboard.</p>
          </div>
        </div>
      </>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Toaster position="top-right" />
        <Login
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            setIsAuthenticated(true);
            setActiveView('dashboard');
            resetInactivityTimer();
          }}
        />
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <Header
        user={currentUser}
        onLogout={() => handleLogout('You have been signed out.')}
        onOpenProfile={() => setActiveView('profile')}
        onGoHome={() => {
          const url = new URL(window.location.href);
          url.pathname = DASHBOARD_PATH;
          url.search = '';
          url.hash = '';
          window.history.replaceState({}, '', `${url.pathname}${url.search}`);
          setDashboardResetKey((prev) => prev + 1);
          setActiveView('dashboard');
        }}
      />

      {activeView === 'profile' ? (
        <ProfilePage
          user={currentUser}
          onBack={() => setActiveView('dashboard')}
          onProfileUpdated={(updatedUser) => setCurrentUser(updatedUser)}
        />
      ) : (
        <IncidentDashboard key={dashboardResetKey} user={currentUser} />
      )}

      {showSessionWarning && (
        <div className="session-warning-overlay">
          <div className="session-warning-dialog" role="dialog" aria-modal="true" aria-labelledby="session-warning-title">
            <p className="session-warning-kicker">Session Timeout Warning</p>
            <h3 id="session-warning-title">You’ll be signed out soon</h3>
            <p>
              We detected inactivity. For your security, you’ll be logged out in{' '}
              <strong>{secondsRemaining}s</strong> unless you continue your session.
            </p>
            <div className="session-warning-actions">
              <button type="button" className="btn btn-default" onClick={() => handleLogout('You have been signed out.')}>Logout now</button>
              <button type="button" className="btn btn-primary" onClick={handleStaySignedIn}>Stay signed in</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
