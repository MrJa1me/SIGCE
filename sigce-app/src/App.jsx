import React, { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import RoleSelect from './pages/RoleSelect';
import StaffPortal from './pages/StaffPortal';
import TravelerHome from './pages/TravelerHome';
import TravelerLogin from './pages/TravelerLogin';
import TravelerRegister from './pages/TravelerRegister';
import AduanaSelect from './pages/AduanaSelect';
import AduanaPage from './pages/AduanaPage';
import TravelerDashboard from './pages/TravelerDashboard';
import TravelerCheckIn from './pages/TravelerCheckIn';
import OfficialPanel from './pages/OfficialPanel';
import OfficialDetail from './pages/OfficialDetail';
import OfficialQrScan from './pages/OfficialQrScan';
import OfficialVerify from './pages/OfficialVerify';
import TravelerProfile from './pages/TravelerProfile';
import AppShell from './components/AppShell';
import { BorderCrossingsProvider } from './context/BorderCrossingsContext';
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

  const updateUser = (partial) => {
    setUser((prev) => {
      const next = { ...prev, ...partial };
      sessionStorage.setItem('sigce_user', JSON.stringify(next));
      return next;
    });
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('sigce_user');
  };

  useEffect(() => {
    startPeriodicSync(15000);
    onNetworkChange((status) => {
      setOnline(status);
      if (status) setSyncStatus('Conectado — sincronizando...');
      else setSyncStatus('Sin conexión — modo offline');
      setTimeout(() => setSyncStatus(''), 4000);
    });
    return () => stopPeriodicSync();
  }, []);

  const ProtectedRoute = ({ children, allowedRole }) => {
    if (!user) {
      if (allowedRole === 'traveler') return <Navigate to="/viajero/ingreso" replace />;
      return <Navigate to="/portal" replace />;
    }
    if (allowedRole && user.role !== allowedRole) {
      if (allowedRole === 'official' && user.role === 'admin') return children;
      if (user.role === 'admin') return <Navigate to="/admin" replace />;
      if (user.role === 'official') return <Navigate to="/oficial" replace />;
      if (user.role === 'traveler') return <Navigate to="/pasos" replace />;
      return <Navigate to="/" replace />;
    }
    return children;
  };

  const StaffPortalRoute = () => <StaffPortal />;

  const TravelerLoginRoute = () => {
    if (user?.role === 'traveler') return <Navigate to="/pasos" replace />;
    return <TravelerLogin />;
  };

  const TravelerRegisterRoute = () => {
    if (user?.role === 'traveler') return <Navigate to="/pasos" replace />;
    return <TravelerRegister />;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, online, syncStatus }}>
      <BorderCrossingsProvider>
      <AppShell syncStatus={syncStatus}>
        <Routes>
          <Route path="/" element={<RoleSelect />} />
          <Route path="/portal" element={<StaffPortalRoute />} />
          <Route path="/login" element={<Navigate to="/portal" replace />} />
          <Route path="/viajero" element={<TravelerHome />} />
          <Route path="/viajero/ingreso" element={<TravelerLoginRoute />} />
          <Route path="/viajero/registro" element={<TravelerRegisterRoute />} />
          <Route path="/pasos" element={<AduanaSelect />} />
          <Route path="/aduana/:id" element={<AduanaPage />} />
          <Route path="/dashboard" element={<ProtectedRoute allowedRole="traveler"><TravelerDashboard /></ProtectedRoute>} />
          <Route path="/perfil" element={<ProtectedRoute allowedRole="traveler"><TravelerProfile /></ProtectedRoute>} />
          <Route path="/checkin" element={<ProtectedRoute allowedRole="traveler"><TravelerCheckIn /></ProtectedRoute>} />
          <Route path="/oficial" element={<ProtectedRoute allowedRole="official"><OfficialPanel /></ProtectedRoute>} />
          <Route path="/oficial/escanear" element={<ProtectedRoute allowedRole="official"><OfficialQrScan /></ProtectedRoute>} />
          <Route path="/oficial/verificar/:id" element={<ProtectedRoute allowedRole="official"><OfficialVerify /></ProtectedRoute>} />
          <Route path="/oficial/:id" element={<ProtectedRoute allowedRole="official"><OfficialDetail /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute allowedRole="admin"><AdminPanel /></ProtectedRoute>} />
          <Route path="*" element={<div className="page-error"><h2>404 — Página no encontrada</h2><p>¿Te perdiste en la frontera?</p></div>} />
        </Routes>
      </AppShell>
      </BorderCrossingsProvider>
    </AuthContext.Provider>
  );
}

export default App;
