import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import Landing from './pages/Landing.jsx';
import { AuthProvider } from './auth/AuthContext.jsx';
import './styles.css';
import './perpoly-modern.css';
import './perpoly-v5-overrides.css';

// The public website is independent from the original secure staff application.
// / (and /home) => public site; /staff => original App with its login and roles.
const publicPage = window.location.pathname === '/' || window.location.pathname === '/home';
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {publicPage ? <Landing/> : <AuthProvider><App/></AuthProvider>}
  </React.StrictMode>
);
