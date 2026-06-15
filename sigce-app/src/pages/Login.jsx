import React, { useState } from 'react';
import { useAuth } from '../App';
import { login as apiLogin } from '../services/api';
import { saveCheckinLocally } from '../services/offlineDb';

function Login() {
  const { login, online } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!online) {
      // Offline demo mode — allow local login with default users
      if (username === 'admin' && password === 'admin123') {
        login({ id: 1, username, name: 'Admin Aduanas', role: 'admin' });
      } else if ((username === 'oficial1' || username === 'oficial2') && password === 'aduana2026') {
        login({
          id: username === 'oficial1' ? 2 : 3,
          username,
          name: username === 'oficial1' ? 'María González' : 'Carlos Muñoz',
          role: 'official'
        });
      } else if ((username === 'viajero1' || username === 'viajero2') && password === 'viajero123') {
        login({
          id: username === 'viajero1' ? 4 : 5,
          username,
          name: username === 'viajero1' ? 'Juan Pérez' : 'Ana Soto',
          role: 'traveler'
        });
      } else {
        setError('Modo offline: usuario/contraseña inválidos');
      }
      setLoading(false);
      return;
    }

    try {
      const userData = await apiLogin(username, password);
      login(userData);
    } catch {
      setError('Usuario o contraseña incorrectos');
    }
    setLoading(false);
  };

  return (
    <div className="page-center">
      <div className="login-card">
        <div className="login-header">
          <span className="login-icon">🛂</span>
          <h1>SIGCE</h1>
          <p className="login-subtitle">Sistema Integrado de Gestión de Comercio Exterior</p>
          <p className="login-caption">Check-In Anticipado para Pasos Fronterizos</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="alert alert-error">{error}</div>}
          {!online && <div className="alert alert-warning">📴 Modo offline — usando credenciales locales</div>}

          <div className="form-group">
            <label htmlFor="username">Usuario</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin / oficial1 / viajero1"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar al Sistema'}
          </button>
        </form>

        <div className="login-footer">
          <p><strong>Credenciales de prueba:</strong></p>
          <p style={{color: 'var(--text-light)', fontSize: '0.9em'}}>
            📌 Los viajeros no necesitan cuenta — solo entra directo desde la <a href="/">página principal</a>.
          </p>
          <div className="creds-grid">
            <div>
              <p>👑 <strong>Administrador:</strong></p>
              <code>admin / admin123</code>
            </div>
            <div>
              <p>👤 <strong>Funcionarios:</strong></p>
              <code>oficial1 / aduana2026</code><br />
              <code>oficial2 / aduana2026</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
