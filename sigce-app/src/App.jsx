import React, { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AduanaSelect from './pages/AduanaSelect';
import AduanaPage from './pages/AduanaPage';
import TravelerDashboard from './pages/TravelerDashboard';
import OfficialPanel from './pages/OfficialPanel';
import OfficialDetail from './pages/OfficialDetail';
import OfficialNewCheckin from './pages/OfficialNewCheckin';
import AdminPanel from './pages/AdminPanel';
import Navbar from './components/Navbar';
import ConnectionStatus from './components/ConnectionStatus';
import { startPeriodicSync, stopPeriodicSync, isOnline, onNetworkChange } from './services/syncService';
import './App.css';

export const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

function App() {
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem('sigce_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [online, setOnline] = useState(isOnline());
  const [syncStatus, setSyncStatus] = useState('');

  const login = (userData) => {
    setUser(userData);
    sessionStorage.setItem('sigce_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('sigce_user');
  };

  useEffect(() => {
    startPeriodicSync(15000);
    onNetworkChange((status) => {
      setOnline(status);
      if (status) setSyncStatus('📡 Conectado — sincronizando...');
      else setSyncStatus('📴 Sin conexión — modo offline');
      setTimeout(() => setSyncStatus(''), 4000);
    });
    return () => stopPeriodicSync();
  }, []);

  // Protected route wrapper
  const ProtectedRoute = ({ children, allowedRole }) => {
    if (!user) return <Navigate to="/login" replace />;
    if (allowedRole && user.role !== allowedRole) {
      if (user.role === 'admin') return <Navigate to="/admin" replace />;
      return <Navigate to={user.role === 'official' ? '/oficial' : '/'} replace />;
    }
    return children;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, online }}>
      <div className="app">
        <Navbar />
        <ConnectionStatus online={online} syncStatus={syncStatus} />
        <main className="main-content">
          <Routes>
            <Route path="/login" element={user ? <Navigate to={user.role === 'official' ? '/oficial' : '/'} replace /> : <Login />} />
            {/* Rutas públicas — viajeros sin login */}
            <Route path="/" element={<AduanaSelect />} />
            <Route path="/aduana/:id" element={<AduanaPage />} />
            <Route path="/dashboard" element={<TravelerDashboard />} />
            {/* Rutas protegidas */}
            <Route path="/oficial" element={<ProtectedRoute allowedRole="official"><OfficialPanel /></ProtectedRoute>} />
            <Route path="/oficial/:id" element={<ProtectedRoute allowedRole="official"><OfficialDetail /></ProtectedRoute>} />
            <Route path="/oficial/nuevo" element={<ProtectedRoute allowedRole="official"><OfficialNewCheckin /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute allowedRole="admin"><AdminPanel /></ProtectedRoute>} />
            <Route path="*" element={<div className="page-error"><h2>404 — Página no encontrada</h2><p>¿Te perdiste en la frontera?</p></div>} />
          </Routes>
        </main>
      </div>
    </AuthContext.Provider>
  );
}

export default App;
