import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { register as apiRegister } from '../services/api';

function TravelerRegister() {
  const { login, online } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    rut: '',
    email: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!online) {
      setError('El registro requiere conexión a internet');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      const userData = await apiRegister({
        username: form.username,
        password: form.password,
        name: form.name,
        rut: form.rut || undefined,
        email: form.email || undefined,
      });
      login(userData);
      navigate('/pasos');
    } catch (err) {
      setError(err.message || 'Error al crear la cuenta');
    }
    setLoading(false);
  };

  return (
    <div className="page-center">
      <div className="login-card login-card-wide">
        <div className="login-header">
          <span className="login-icon">✨</span>
          <h1>Crear cuenta</h1>
          <p className="login-subtitle">Regístrate como viajero en SIGCE</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="alert alert-error">{error}</div>}
          {!online && <div className="alert alert-warning">📴 Sin conexión — conéctate para registrarte</div>}

          <div className="form-group">
            <label htmlFor="name">Nombre completo *</label>
            <input id="name" type="text" value={form.name} onChange={update('name')} placeholder="Juan Pérez" required disabled={loading} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="rut">RUT / Pasaporte</label>
              <input id="rut" type="text" value={form.rut} onChange={update('rut')} placeholder="12.345.678-9" disabled={loading} />
            </div>
            <div className="form-group">
              <label htmlFor="email">Correo electrónico</label>
              <input id="email" type="email" value={form.email} onChange={update('email')} placeholder="correo@ejemplo.com" disabled={loading} />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="username">Usuario *</label>
            <input id="username" type="text" value={form.username} onChange={update('username')} placeholder="juanperez" required disabled={loading} autoComplete="username" />
            <small className="form-hint">Solo letras, números, puntos, guiones y guiones bajos</small>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Contraseña *</label>
              <input id="password" type="password" value={form.password} onChange={update('password')} placeholder="Mínimo 6 caracteres" required disabled={loading} autoComplete="new-password" />
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirmar contraseña *</label>
              <input id="confirmPassword" type="password" value={form.confirmPassword} onChange={update('confirmPassword')} placeholder="Repite la contraseña" required disabled={loading} autoComplete="new-password" />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading || !online}>
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <div className="login-footer">
          <p>¿Ya tienes cuenta? <Link to="/viajero/ingreso">Inicia sesión</Link></p>
          <p><Link to="/viajero">← Volver al área de viajeros</Link></p>
        </div>
      </div>
    </div>
  );
}

export default TravelerRegister;
