import React, { useState } from 'react';
import { logoutUser } from '../api';
import './Header.css';

const Header = ({ user, onLogout }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    logoutUser();
    onLogout();
  };

  const username = user?.name || user?.user_name;
  const fullName = user.user_display_name;

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="header-logo-container">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#293e40" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="#293e40" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="#293e40" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      
      <div className="header-right">
        <nav className="header-nav">
          <a href="#" className="nav-item">
            Notification <span className="badge">1</span>
          </a>
          {/* <a href="#" className="nav-item">Requests</a>
          <a href="#" className="nav-item">Knowledge</a> */}
          {/* <a href="#" className="nav-item">Cart</a>
          <a href="#" className="nav-item">Tours</a> */}
        </nav>
        
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
              <button onClick={handleLogout} className="dropdown-item text-danger">Logout</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
