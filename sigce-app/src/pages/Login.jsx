import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { login as apiLogin } from '../services/api';
import { Icon } from '../components/icons';

function Login() {
  const { login, online } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const redirectByRole = (role) => {
    if (role === 'admin') navigate('/admin');
    else if (role === 'official') navigate('/oficial');
    else navigate('/');
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
        setError('Esta cuenta es de viajero. Usa el acceso en el área de viajeros.');
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
    <div className="page-center">
      <div className="login-card">
        <div className="login-header">
          <Icon name="user" size="xl" className="login-icon-svg" />
          <h1>Acceso Funcionarios</h1>
          <p className="login-subtitle">Panel oficial y administración</p>
          <p className="login-caption">Solo personal de aduana y administradores</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="alert alert-error">{error}</div>}
          {!online && <div className="alert alert-warning">Modo offline — credenciales de prueba disponibles</div>}

          <div className="form-group">
            <label htmlFor="username">Usuario</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="oficial1 / admin"
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
            {loading ? 'Ingresando...' : 'Ingresar al panel'}
          </button>
        </form>

        <div className="login-footer">
          <p><Link to="/">← Volver a selección de rol</Link></p>
          <p style={{ color: 'var(--text-light)', fontSize: '0.9em' }}>
            ¿Eres viajero? <Link to="/viajero">Ir al área de viajeros</Link>
          </p>
          <div className="creds-grid">
            <div>
              <p><strong>Administrador:</strong></p>
              <code>admin / admin123</code>
            </div>
            <div>
              <p><strong>Funcionarios:</strong></p>
              <code>oficial1 / aduana2026</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
