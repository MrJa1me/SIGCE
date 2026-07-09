import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { useTheme } from '../services/themeContext';
import { Icon, ROLE_LABELS, roleIconName } from './icons';

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
          <Icon name="logo" size="md" className="navbar-logo-icon" />
          <span className="navbar-title">SIGCE</span>
        </Link>
      </div>

      <div className="navbar-links">
        <Link to="/pasos" className="nav-link">
          <Icon name="globe" size="sm" /> Pasos Fronterizos
        </Link>
        {user?.role === 'traveler' && (
          <Link to="/dashboard" className="nav-link">
            <Icon name="clipboard" size="sm" /> Mis Trámites
          </Link>
        )}
        {user?.role === 'official' && (
          <Link to="/oficial" className="nav-link">
            <Icon name="user" size="sm" /> Panel Oficial
          </Link>
        )}
        {user?.role === 'admin' && (
          <>
            <Link to="/admin" className="nav-link">
              <Icon name="admin" size="sm" /> Admin
            </Link>
            <Link to="/oficial" className="nav-link">
              <Icon name="user" size="sm" /> Panel Oficial
            </Link>
          </>
        )}
      </div>

      <div className="navbar-actions">
        <button onClick={toggleTheme} className="btn-theme" title={isDark ? 'Modo claro' : 'Modo oscuro'}>
          <Icon name={isDark ? 'sun' : 'moon'} size="sm" />
        </button>
      </div>

      <div className="navbar-user">
        {user ? (
          <>
            <span className="user-info">
              <Icon name={roleIconName(user.role)} size="sm" className="user-avatar-icon" />
              <span className="user-name">{user.name}</span>
              <span className={`user-role ${user.role}`}>{ROLE_LABELS[user.role]}</span>
            </span>
            <button onClick={handleLogout} className="btn-logout">Salir</button>
          </>
        ) : (
          <div className="navbar-guest-actions">
            <Link to="/viajero" className="btn-login-small">
              <Icon name="traveler" size="sm" /> Viajeros
            </Link>
            <Link to="/login" className="btn-login-small btn-login-staff">
              <Icon name="user" size="sm" /> Funcionarios
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
