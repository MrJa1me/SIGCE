import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { login as apiLogin } from '../services/api';
import { Icon } from '../components/icons';

function TravelerLogin() {
  const { login, online } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!online) {
      setError('El inicio de sesión de viajeros requiere conexión a internet');
      setLoading(false);
      return;
    }

    try {
      const userData = await apiLogin(username, password);
      if (userData.role !== 'traveler') {
        setError('Esta cuenta no es de viajero. Usa el acceso de funcionarios.');
        setLoading(false);
        return;
      }
      login(userData);
      navigate('/pasos');
    } catch (err) {
      setError(err.message || 'Usuario o contraseña incorrectos');
    }
    setLoading(false);
  };

  return (
    <div className="page-center">
      <div className="login-card">
        <div className="login-header">
          <Icon name="traveler" size="xl" className="login-icon-svg" />
          <h1>Ingreso Viajero</h1>
          <p className="login-subtitle">Accede a tu cuenta para gestionar trámites</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="alert alert-error">{error}</div>}
          {!online && <div className="alert alert-warning">Sin conexión — conéctate para iniciar sesión</div>}

          <div className="form-group">
            <label htmlFor="username">Usuario</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Tu nombre de usuario"
              required
              disabled={loading}
              autoComplete="username"
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
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading || !online}>
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="login-footer">
          <p>¿No tienes cuenta? <Link to="/viajero/registro">Regístrate aquí</Link></p>
          <p><Link to="/viajero">← Volver al área de viajeros</Link></p>
        </div>
      </div>
    </div>
  );
}

export default TravelerLogin;
