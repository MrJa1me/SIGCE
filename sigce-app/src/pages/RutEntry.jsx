import React, { useState } from 'react';

function RutEntry({ onRutEntered }) {
  const [rut, setRut] = useState('');
  const [nombre, setNombre] = useState(() => sessionStorage.getItem('sigce_viajero_nombre') || '');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!rut.trim()) {
      setError('Debes ingresar tu RUT o pasaporte');
      return;
    }

    sessionStorage.setItem('sigce_viajero_rut', rut.trim());
    sessionStorage.setItem('sigce_viajero_nombre', nombre.trim() || 'Visitante');

    onRutEntered(rut.trim());
  };

  return (
    <div className="page-container">
      <div className="card" style={{ maxWidth: 480, margin: '40px auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <span style={{ fontSize: 64 }}>🛂</span>
          <h2>Bienvenido a SIGCE</h2>
          <p className="card-subtitle">
            Sistema de Información y Gestión de Control de Extranjería
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label>RUT / Pasaporte</label>
            <input
              type="text"
              value={rut}
              onChange={(e) => { setRut(e.target.value); setError(''); }}
              placeholder="Ej: 12.345.678-9"
              autoFocus
              required
            />
            <small style={{ color: '#666', fontSize: 12 }}>
              Ingresa tu RUT chileno o número de pasaporte para acceder a tus trámites
            </small>
          </div>

          <div className="form-group">
            <label>Nombre (opcional)</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Tu nombre completo"
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }}>
            🔍 Ingresar
          </button>
        </form>

        <div style={{ marginTop: 20, padding: 12, background: '#f0f7ff', borderRadius: 8, fontSize: 13, textAlign: 'center' }}>
          <strong>🚀 ¿Primera vez?</strong>
          <p style={{ margin: '4px 0 0' }}>
            Ingresa tu RUT para comenzar. Todos tus trámites quedarán vinculados a él.
            Si ya has realizado trámites antes, aparecerán automáticamente.
          </p>
        </div>
      </div>
    </div>
  );
}

export default RutEntry;
