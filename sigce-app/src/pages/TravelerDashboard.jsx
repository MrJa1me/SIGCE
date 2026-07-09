import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { getLocalCheckins } from '../services/offlineDb';
import { getTravelerCheckins } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import DocumentManager from '../components/DocumentManager';
import { BORDER_CROSSINGS } from '../services/borderCrossings';

function TravelerDashboard() {
  const { user, online } = useAuth();
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const rut = user?.rut;
  const userId = user?.id;

  const loadCheckins = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      let serverCheckins = [];
      if (online && (userId || rut)) {
        try {
          serverCheckins = await getTravelerCheckins(userId, rut);
        } catch (err) {
          console.warn('No se pudieron cargar datos del servidor:', err.message);
        }
      }

      const localData = await getLocalCheckins();
      const localMap = new Map();

      for (const item of localData) {
        const matchesUser = userId && item.userId === userId;
        const matchesRut = rut && item.rut?.trim().toLowerCase() === rut.trim().toLowerCase();
        if (matchesUser || matchesRut) {
          localMap.set(item.localId || item.id, item);
        }
      }

      for (const item of serverCheckins) {
        const key = item.localId || item.id;
        if (localMap.has(key)) {
          localMap.set(key, { ...localMap.get(key), ...item, synced: true });
        } else {
          localMap.set(key, { ...item, synced: true });
        }
      }

      const merged = Array.from(localMap.values())
        .sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at));

      setCheckins(merged);
    } catch (err) {
      console.error('Error loading checkins:', err);
      setError('Error al cargar trámites');
    }
    setLoading(false);
  }, [rut, userId, online]);

  useEffect(() => {
    loadCheckins();
  }, [loadCheckins]);

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleString('es-CL', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getTypeIcon = (type) => {
    const icons = { vehicle: '🚗', minor: '👶', pet: '🐾', general: '📋' };
    return icons[type] || '📋';
  };

  const getTypeLabel = (type) => {
    const labels = { vehicle: 'Vehículo', minor: 'Menor de Edad', pet: 'Mascota', general: 'General' };
    return labels[type] || type;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <h2>📋 Mis Trámites</h2>
            <p>
              Hola, <strong>{user?.name}</strong>
              {rut && <> — RUT: <strong>{rut}</strong></>}
            </p>
          </div>
        </div>
      </div>

      {!rut && (
        <div className="alert alert-warning">
          Agrega tu RUT en tu perfil contactando soporte, o al crear trámites se vincularán a tu cuenta.
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading">Cargando trámites...</div>
      ) : checkins.length === 0 ? (
        <div className="card empty-state">
          <span className="empty-icon">📭</span>
          <h3>No tienes trámites registrados</h3>
          <p>Realiza un check-in anticipado para agilizar tu paso por la aduana.</p>
          <Link to="/pasos" className="btn btn-primary">Ir a pasos fronterizos</Link>
        </div>
      ) : (
        <div className="checkins-list">
          {checkins.map((checkin) => (
            <div key={checkin.localId || checkin.id} className="card checkin-card">
              <div className="checkin-card-header">
                <div className="checkin-type-badge">
                  <span>{getTypeIcon(checkin.checkinType || checkin.checkin_type)}</span>
                  <span>{getTypeLabel(checkin.checkinType || checkin.checkin_type)}</span>
                </div>
                <StatusBadge status={checkin.status} />
              </div>

              <div className="checkin-card-body">
                <div className="checkin-meta">
                  <span className="meta-item">
                    <strong>Código:</strong>
                    <code>{(checkin.localId || checkin.id)?.slice(0, 8).toUpperCase()}</code>
                  </span>
                  <span className="meta-item">
                    <strong>Paso:</strong> {BORDER_CROSSINGS.find((bc) => bc.id === (checkin.borderCrossing || checkin.border_crossing))?.name || checkin.borderCrossing || checkin.border_crossing || '—'}
                  </span>
                  <span className="meta-item">
                    <strong>Fecha:</strong> {formatDate(checkin.createdAt || checkin.created_at)}
                  </span>
                </div>

                {checkin.checkinType === 'vehicle' && checkin.details?.patent && (
                  <div className="checkin-detail">
                    🚗 {checkin.details.brand} {checkin.details.model} — Patente: <strong>{checkin.details.patent}</strong>
                  </div>
                )}
                {checkin.comments && (
                  <div className="checkin-detail comment">💬 {checkin.comments}</div>
                )}

                {online && (
                  <DocumentManager
                    checkinId={checkin.localId || checkin.id}
                    title="📎 Documentos"
                  />
                )}
              </div>

              <div className="checkin-card-footer">
                <span className={`sync-badge ${checkin.synced ? 'synced' : 'pending'}`}>
                  {checkin.synced ? '✅ Sincronizado' : '📴 Pendiente de sincronización'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <Link to="/pasos" className="btn btn-primary">📝 Nuevo Check-In</Link>
      </div>
    </div>
  );
}

export default TravelerDashboard;
