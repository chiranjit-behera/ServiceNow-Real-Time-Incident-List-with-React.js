import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import Header from './components/Header';
import Login from './components/Login';
import IncidentDashboard from './pages/IncidentDashboard';
import './index.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!sessionStorage.getItem('sn_auth_token'));
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = sessionStorage.getItem('sn_user');
    return saved ? JSON.parse(saved) : null;
  });

  if (!isAuthenticated) {
    return (
      <>
        <Toaster position="top-right" />
        <Login 
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            setIsAuthenticated(true);
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
        onLogout={() => {
          setIsAuthenticated(false);
          setCurrentUser(null);
        }} 
      />
      <IncidentDashboard user={currentUser} />
    </>
  );
}

export default App;
