import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../App';

const API_URL = 'http://localhost:3000/api';

const ROLES = {
  admin: { label: '👑 Administrador', color: '#003366' },
  official: { label: '👤 Funcionario', color: '#856404' },
  traveler: { label: '🧑‍✈️ Viajero', color: '#155724' },
};

function AdminPanel() {
  const { online } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ username: '', password: '', name: '', role: 'traveler' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/users`);
      setUsers(await res.json());
    } catch (err) {
      console.error('Error loading users:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const openCreate = () => {
    setEditingUser(null);
    setForm({ username: '', password: '', name: '', role: 'traveler' });
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({ username: user.username, password: '', name: user.name, role: user.role });
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      if (editingUser) {
        const body = { name: form.name, role: form.role };
        if (form.username) body.username = form.username;
        if (form.password) body.password = form.password;

        const res = await fetch(`${API_URL}/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error);
        }
        setSuccess(`✅ Usuario ${form.name} actualizado correctamente`);
      } else {
        const res = await fetch(`${API_URL}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error);
        }
        setSuccess(`✅ Usuario ${form.name} creado correctamente`);
      }

      setShowForm(false);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
    setActionLoading(false);
  };

  const handleDelete = async (user) => {
    if (!confirm(`¿Estás seguro de eliminar a "${user.name}" (${user.username})?`)) return;

    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/users/${user.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      setSuccess(`✅ Usuario ${user.name} eliminado`);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
    setActionLoading(false);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>👑 Administración de Usuarios</h2>
        <p>Gestiona viajeros, funcionarios y administradores del sistema SIGCE</p>
        {!online && <div className="alert alert-warning">📴 Sin conexión al servidor — no se pueden gestionar usuarios</div>}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card total-stat">
          <span className="stat-number">{users.length}</span>
          <span className="stat-label">Total Usuarios</span>
          <span className="stat-icon">👥</span>
        </div>
        <div className="stat-card accepted-stat">
          <span className="stat-number">{users.filter(u => u.role === 'traveler').length}</span>
          <span className="stat-label">Viajeros</span>
          <span className="stat-icon">🧑‍✈️</span>
        </div>
        <div className="stat-card review-stat">
          <span className="stat-number">{users.filter(u => u.role === 'official').length}</span>
          <span className="stat-label">Funcionarios</span>
          <span className="stat-icon">👤</span>
        </div>
        <div className="stat-card pending-stat">
          <span className="stat-number">{users.filter(u => u.role === 'admin').length}</span>
          <span className="stat-label">Administradores</span>
          <span className="stat-icon">👑</span>
        </div>
      </div>

      <div className="admin-toolbar">
        <button className="btn btn-primary" onClick={openCreate} disabled={!online}>
          ➕ Nuevo Usuario
        </button>
      </div>

      {/* User Form */}
      {showForm && (
        <div className="card admin-form-card">
          <h3>{editingUser ? '✏️ Editar Usuario' : '➕ Nuevo Usuario'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Nombre de Usuario</label>
                <input type="text" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="ej: viajero3" required />
              </div>
              <div className="form-group">
                <label>Contraseña</label>
                <input type="text" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={editingUser ? 'Dejar vacío para mantener' : '••••••••'} required={!editingUser} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Nombre Completo</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre y apellido" required />
              </div>
              <div className="form-group">
                <label>Rol</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="traveler">🧑‍✈️ Viajero</option>
                  <option value="official">👤 Funcionario de Aduana</option>
                  <option value="admin">👑 Administrador</option>
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                {actionLoading ? 'Guardando...' : editingUser ? '💾 Guardar Cambios' : '✅ Crear Usuario'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      {loading ? (
        <div className="loading">Cargando usuarios...</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Contraseña</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td><code>{u.id}</code></td>
                  <td><strong>{u.name}</strong></td>
                  <td><code>{u.username}</code></td>
                  <td>
                    <span className="role-badge" style={{
                      background: ROLES[u.role]?.color + '15',
                      color: ROLES[u.role]?.color,
                      borderColor: ROLES[u.role]?.color + '40',
                    }}>
                      {ROLES[u.role]?.label || u.role}
                    </span>
                  </td>
                  <td><code>{u.password}</code></td>
                  <td className="actions-cell">
                    <button className="btn btn-sm btn-secondary" onClick={() => openEdit(u)} disabled={!online}>✏️</button>
                    <button className="btn btn-sm btn-reject" onClick={() => handleDelete(u)} disabled={!online || u.id === 1}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;
