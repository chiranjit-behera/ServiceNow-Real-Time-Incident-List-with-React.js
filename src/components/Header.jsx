import React, { useState, useEffect } from 'react';
import { logoutUser, getUserIncidents } from '../api';
import { useTheme } from '../context/ThemeContext';
import './Header.css';

const Header = ({ user, onLogout }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [incidents, setIncidents] = useState([]);
  const { isDark, toggleTheme } = useTheme();

  const username = user?.name || user?.user_name;
  const fullName = user.user_display_name;

  useEffect(() => {
    if (user?.user_sys_id) {
      fetchIncidents();
    }
  }, [user]);

  const fetchIncidents = async () => {
    try {
      const data = await getUserIncidents(user.user_sys_id);
      setIncidents(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    logoutUser();
    onLogout();
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="header-logo-container">
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#293e40" strokeWidth="2"/>
          </svg>
        </div>
      </div>

      <div className="header-right">
        <nav className="header-nav">

          {/*  Notification */}
          <div className="notification-wrapper">
            <div
              className="nav-item"
              onClick={() => setNotificationOpen(!notificationOpen)}
            >
              Notification 🔔
              {incidents.length > 0 && (
                <span className="badge">{incidents.length}</span>
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
        <div className="user-profile-menu">
          <button
            className="profile-button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
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
              <a href="#" className="dropdown-item">Profile</a>
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