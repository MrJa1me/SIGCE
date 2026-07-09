import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { useTheme } from '../services/themeContext';
import { Icon, ROLE_LABELS, roleIconName } from './icons';

function Navbar({ variant = 'traveler' }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const isStaff = variant === 'staff';

  const handleLogout = () => {
    const role = user?.role;
    logout();
    if (role === 'official' || role === 'admin') navigate('/portal');
    else navigate('/');
  };

  const homeLink = isStaff
    ? (user?.role === 'admin' ? '/admin' : user?.role === 'official' ? '/oficial' : '/portal')
    : '/';

  return (
    <nav className={`navbar ${isStaff ? 'navbar-staff' : 'navbar-traveler'}`}>
      <div className="navbar-brand">
        <Link to={homeLink}>
          <Icon name="logo" size="md" className="navbar-logo-icon" />
          <span className="navbar-title">{isStaff ? 'SIGCE — Portal Interno' : 'SIGCE'}</span>
        </Link>
      </div>

      <div className="navbar-links">
        {!isStaff && (
          <>
            <Link to="/pasos" className="nav-link">
              <Icon name="globe" size="sm" /> Pasos Fronterizos
            </Link>
            {user?.role === 'traveler' && (
              <>
                <Link to="/dashboard" className="nav-link">
                  <Icon name="clipboard" size="sm" /> Mis Trámites
                </Link>
                <Link to="/perfil" className="nav-link">
                  <Icon name="user" size="sm" /> Mi Perfil
                </Link>
              </>
            )}
          </>
        )}
        {isStaff && user?.role === 'official' && (
          <>
            <Link to="/oficial" className="nav-link">
              <Icon name="clipboard" size="sm" /> Panel
            </Link>
            <Link to="/oficial/escanear" className="nav-link">
              <Icon name="qr" size="sm" /> Escanear QR
            </Link>
          </>
        )}
        {isStaff && user?.role === 'admin' && (
          <>
            <Link to="/admin" className="nav-link">
              <Icon name="admin" size="sm" /> Administración
            </Link>
            <Link to="/oficial" className="nav-link">
              <Icon name="user" size="sm" /> Panel Oficial
            </Link>
            <Link to="/oficial/escanear" className="nav-link">
              <Icon name="qr" size="sm" /> Escanear QR
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
            <button type="button" onClick={handleLogout} className="btn-logout">Salir</button>
          </>
        ) : (
          <div className="navbar-guest-actions">
            {!isStaff ? (
              <>
                <Link to="/viajero/ingreso" className="btn-login-small">
                  <Icon name="traveler" size="sm" /> Ingresar
                </Link>
                <Link to="/viajero/registro" className="btn-login-small btn-login-register">
                  Registrarse
                </Link>
              </>
            ) : (
              <Link to="/" className="btn-login-small">
                <Icon name="globe" size="sm" /> Sitio viajeros
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
