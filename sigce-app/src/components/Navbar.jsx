import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { useTheme } from '../services/themeContext';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">
          <span className="navbar-logo">🛂</span>
          <span className="navbar-title">SIGCE</span>
        </Link>
      </div>

      <div className="navbar-links">
        <Link to="/pasos" className="nav-link">🌎 Pasos Fronterizos</Link>
        {user?.role === 'traveler' && (
          <Link to="/dashboard" className="nav-link">📋 Mis Trámites</Link>
        )}
        {user?.role === 'official' && <Link to="/oficial" className="nav-link">👤 Panel Oficial</Link>}
        {user?.role === 'admin' && (
          <>
            <Link to="/admin" className="nav-link">👑 Admin</Link>
            <Link to="/oficial" className="nav-link">👤 Panel Oficial</Link>
          </>
        )}
      </div>

      <div className="navbar-actions">
        <button onClick={toggleTheme} className="btn-theme" title={isDark ? 'Modo claro' : 'Modo oscuro'}>
          {isDark ? '☀️' : '🌙'}
        </button>
      </div>

      <div className="navbar-user">
        {user ? (
          <>
            <span className="user-info">
              <span className="user-avatar">
                {user.role === 'admin' ? '👑' : user.role === 'official' ? '👤' : '🧳'}
              </span>
              <span className="user-name">{user.name}</span>
              <span className={`user-role ${user.role}`}>
                {user.role === 'admin' ? 'Admin' : user.role === 'official' ? 'Funcionario' : 'Viajero'}
              </span>
            </span>
            <button onClick={handleLogout} className="btn-logout">Salir</button>
          </>
        ) : (
          <div className="navbar-guest-actions">
            <Link to="/viajero" className="btn-login-small">🧳 Viajeros</Link>
            <Link to="/login" className="btn-login-small btn-login-staff">👤 Funcionarios</Link>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
