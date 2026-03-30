import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { loginUser } from '../api';
import './Login.css';

const Login = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Please enter both User ID and Password');
      return;
    }

    setIsLoggingIn(true);
    try {
      const user = await loginUser(username, password);
      toast.success(`Welcome, ${user.name || username}!`);
      onLoginSuccess(user);
    } catch (error) {
      toast.error('Invalid credentials. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-glass-container">
        <div className="login-header">
          <div className="logo-placeholder">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#293e40" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="#293e40" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="#293e40" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2>Incident Dashboard</h2>
          <p>Sign in with your ServiceNow credentials</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="username">User ID</label>
            <input
              id="username"
              type="text"
              placeholder="e.g. admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoggingIn}
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoggingIn}
            />
          </div>
          
          <button 
            type="submit" 
            className={`login-button ${isLoggingIn ? 'loading' : ''}`}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
