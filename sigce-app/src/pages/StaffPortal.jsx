import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { login as apiLogin } from '../services/api';
import { Icon } from '../components/icons';

function StaffPortal() {
  const { user, login, online } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  if (user?.role === 'official') return <Navigate to="/oficial" replace />;
  if (user?.role === 'traveler') return <Navigate to="/pasos" replace />;

  const redirectByRole = (role) => {
    if (role === 'admin') navigate('/admin');
    else navigate('/oficial');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!online) {
      if (username === 'admin' && password === 'admin123') {
        login({ id: 1, username, name: 'Admin Aduanas', role: 'admin' });
        redirectByRole('admin');
      } else if ((username === 'oficial1' || username === 'oficial2') && password === 'aduana2026') {
        login({
          id: username === 'oficial1' ? 2 : 3,
          username,
          name: username === 'oficial1' ? 'María González' : 'Carlos Muñoz',
          role: 'official',
        });
        redirectByRole('official');
      } else {
        setError('Modo offline: solo funcionarios y admin con credenciales de prueba');
      }
      setLoading(false);
      return;
    }

    try {
      const userData = await apiLogin(username, password);
      if (userData.role === 'traveler') {
        setError('Esta cuenta es de viajero. Usa el acceso público en la página principal.');
        setLoading(false);
        return;
      }
      login(userData);
      redirectByRole(userData.role);
    } catch (err) {
      setError(err.message || 'Usuario o contraseña incorrectos');
    }
    setLoading(false);
  };

  return (
    <div className="staff-portal-page">
      <div className="staff-portal-sidebar">
        <div className="staff-portal-brand">
          <Icon name="shield" size="xl" />
          <div>
            <h1>Portal Interno</h1>
            <p>Servicio Nacional de Aduanas — SIGCE</p>
          </div>
        </div>
        <ul className="staff-portal-features">
          <li><Icon name="clipboard" size="sm" /> Gestión de trámites</li>
          <li><Icon name="qr" size="sm" /> Control fronterizo QR</li>
          <li><Icon name="search" size="sm" /> Revisión PDI</li>
          <li><Icon name="admin" size="sm" /> Administración del sistema</li>
        </ul>
        <Link to="/" className="staff-portal-back">
          ← Volver al sitio de viajeros
        </Link>
      </div>

      <div className="staff-portal-main">
        <div className="staff-portal-login-card">
          <div className="login-header">
            <Icon name="user" size="xl" className="login-icon-svg" />
            <h2>Ingreso de personal</h2>
            <p className="login-subtitle">Funcionarios de aduana y administradores</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && <div className="alert alert-error">{error}</div>}
            {!online && (
              <div className="alert alert-warning">Modo offline — credenciales de prueba disponibles</div>
            )}

            <div className="form-group">
              <label htmlFor="staff-username">Usuario institucional</label>
              <input
                id="staff-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="oficial1 / admin"
                required
                disabled={loading}
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label htmlFor="staff-password">Contraseña</label>
              <input
                id="staff-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Verificando...' : 'Ingresar al portal'}
            </button>
          </form>

          <div className="staff-portal-demo">
            <p><strong>Demo:</strong> <code>oficial1 / aduana2026</code> · <code>admin / admin123</code></p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StaffPortal;
