import React, { useEffect, useState } from 'react';
import { useAuth } from '../App';
import { getUserProfile, updateUserProfile } from '../services/api';
import { Icon } from '../components/icons';

const NATIONALITIES = ['Chilena', 'Argentina', 'Peruana', 'Boliviana', 'Otra'];

function TravelerProfile() {
  const { user, online, updateUser } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    rut: user?.rut || '',
    email: user?.email || '',
    phone: user?.phone || '',
    nationality: user?.nationality || 'Chilena',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!user?.id || !online) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const profile = await getUserProfile(user.id);
        setForm({
          name: profile.name || '',
          rut: profile.rut || '',
          email: profile.email || '',
          phone: profile.phone || '',
          nationality: profile.nationality || 'Chilena',
        });
      } catch (err) {
        console.warn(err.message);
      }
      setLoading(false);
    })();
  }, [user?.id, online]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updated = await updateUserProfile(user.id, form);
      updateUser(updated);
      setSuccess('Perfil actualizado. Tus próximos check-ins usarán estos datos.');
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title-with-icon">
          <Icon name="user" size="md" /> Mi Perfil
        </h2>
        <p>Actualiza tus datos para agilizar futuros check-ins anticipados</p>
      </div>

      {!online && (
        <div className="alert alert-warning">
          Sin conexión — necesitas internet para guardar cambios en tu perfil
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card traveler-profile-card">
        {loading ? (
          <div className="loading">Cargando perfil...</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Nombre completo</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>RUT / Pasaporte</label>
                <input
                  type="text"
                  value={form.rut}
                  onChange={(e) => setForm((f) => ({ ...f, rut: e.target.value }))}
                  placeholder="12.345.678-9"
                />
              </div>
              <div className="form-group">
                <label>Nacionalidad</label>
                <select
                  value={form.nationality}
                  onChange={(e) => setForm((f) => ({ ...f, nationality: e.target.value }))}
                >
                  {NATIONALITIES.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="correo@ejemplo.cl"
                />
              </div>
              <div className="form-group">
                <label>Teléfono</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+569 1234 5678"
                />
              </div>
            </div>
            <p className="card-subtitle">
              Usuario: <code>{user?.username}</code> — estos datos se precargan al iniciar un nuevo trámite.
            </p>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving || !online}>
                {saving ? 'Guardando...' : 'Guardar perfil'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default TravelerProfile;
