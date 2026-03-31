import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getUserIncidents } from '../api';
import { useTheme } from '../context/ThemeContext';
import './Header.css';

const NOTIFICATION_REFRESH_MS = 10000;

const Header = ({ user, onLogout, onOpenProfile, onGoHome }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [incidents, setIncidents] = useState([]);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const latestIncidentIdRef = useRef(null);
  const clearBadgePulseTimeoutRef = useRef(null);
  const notificationWrapperRef = useRef(null);
  const profileMenuRef = useRef(null);
  const { isDark, toggleTheme } = useTheme();

  const username = user?.name || user?.user_name || 'ServiceNow User';
  const fullName = user?.user_display_name || username;

  const fetchIncidents = useCallback(async (showPulse = true) => {
    if (!user?.user_sys_id) return;

    try {
      const data = await getUserIncidents(user.user_sys_id);
      const nextTopId = data?.[0]?.sys_id || null;

      if (showPulse && latestIncidentIdRef.current && nextTopId && latestIncidentIdRef.current !== nextTopId) {
        setHasNewNotifications(true);

        if (clearBadgePulseTimeoutRef.current) {
          clearTimeout(clearBadgePulseTimeoutRef.current);
        }

        clearBadgePulseTimeoutRef.current = setTimeout(() => {
          setHasNewNotifications(false);
        }, 4000);
      }

      latestIncidentIdRef.current = nextTopId;
      setIncidents(data || []);
    } catch (err) {
      console.error(err);
    }
  }, [user?.user_sys_id]);

  useEffect(() => {
    if (!user?.user_sys_id) return undefined;

    fetchIncidents(false);

    const refreshNotifications = () => fetchIncidents(true);
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshNotifications();
      }
    }, NOTIFICATION_REFRESH_MS);

    window.addEventListener('focus', refreshNotifications);
    window.addEventListener('visibilitychange', refreshNotifications);
    window.addEventListener('sn-incidents-changed', refreshNotifications);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', refreshNotifications);
      window.removeEventListener('visibilitychange', refreshNotifications);
      window.removeEventListener('sn-incidents-changed', refreshNotifications);

      if (clearBadgePulseTimeoutRef.current) {
        clearTimeout(clearBadgePulseTimeoutRef.current);
      }
    };
  }, [fetchIncidents, user?.user_sys_id]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationWrapperRef.current && !notificationWrapperRef.current.contains(event.target)) {
        setNotificationOpen(false);
      }

      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setNotificationOpen(false);
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleLogout = () => {
    onLogout();
  };

  const handleLogoClick = () => {
    setNotificationOpen(false);
    setDropdownOpen(false);

    if (onGoHome) {
      onGoHome();
      return;
    }

    window.location.assign(window.location.pathname);
  };

  return (
    <header className="app-header">
      <button
        type="button"
        className="header-left header-logo-button"
        onClick={handleLogoClick}
        aria-label="Go to home page"
        title="Go to home page"
      >
        <div className="header-logo-container">
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#293e40" strokeWidth="2"/>
          </svg>
        </div>
      </button>

      <div className="header-right">
        <nav className="header-nav">

          {/*  Notification */}
          <div className="notification-wrapper" ref={notificationWrapperRef}>
            <div
              className="nav-item"
              onClick={() => {
                setNotificationOpen((prev) => !prev);
                setDropdownOpen(false);
                setHasNewNotifications(false);
              }}
            >
              Notification 🔔
              {incidents.length > 0 && (
                <span className={`badge ${hasNewNotifications ? 'badge-live' : ''}`}>{incidents.length}</span>
              )}
            </div>

            {notificationOpen && (
              <div className="notification-dropdown">

                {incidents.length === 0 ? (
                  <div className="empty-msg">No incidents</div>
                ) : (
                  incidents.map((inc) => (
                    <div key={inc.sys_id} className="notification-item">
                      <div className="inc-number">{inc.number}</div>
                      <div className="inc-desc">{inc.short_description}</div>
                      <div className="inc-date">
                        {new Date(inc.sys_created_on).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}

              </div>
            )}
          </div>

        </nav>

        {/* 🌙 Dark Mode Toggle */}
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle dark mode"
        >
          <span className="theme-toggle-track">
            <span className="theme-toggle-thumb">{isDark ? '🌙' : '☀️'}</span>
          </span>
        </button>

        {/* 👤 Profile */}
        <div className="user-profile-menu" ref={profileMenuRef}>
          <button
            className="profile-button"
            onClick={() => {
              setDropdownOpen((prev) => !prev);
              setNotificationOpen(false);
            }}
          >
            <img
              src={`https://ui-avatars.com/api/?name=${username}&background=random`}
              alt="Avatar"
              className="profile-avatar"
            />
            <span className="profile-name">{fullName}</span>
          </button>

          {dropdownOpen && (
            <div className="profile-dropdown">
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  setDropdownOpen(false);
                  onOpenProfile?.();
                }}
              >
                Profile
              </button>
              <div className="dropdown-divider"></div>
              <button onClick={handleLogout} className="dropdown-item text-danger">
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;