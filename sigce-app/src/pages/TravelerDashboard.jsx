import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../App';
import { getLocalCheckins } from '../services/offlineDb';
import { getCheckinsByRut } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { BORDER_CROSSINGS } from '../services/borderCrossings';

function TravelerDashboard() {
  const { online } = useAuth();
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRutForm, setShowRutForm] = useState(false);
  const [rutInput, setRutInput] = useState('');
  const [error, setError] = useState('');

  const rut = sessionStorage.getItem('sigce_viajero_rut');
  const nombre = sessionStorage.getItem('sigce_viajero_nombre') || 'Visitante';

  const loadCheckins = useCallback(async () => {
    if (!rut) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Get server data if online
      let serverCheckins = [];
      if (online) {
        try {
          serverCheckins = await getCheckinsByRut(rut);
        } catch (err) {
          console.warn('No se pudieron cargar datos del servidor:', err.message);
        }
      }

      // 2. Get local data
      const localData = await getLocalCheckins();

      // 3. Merge: local data first (for unsynced items), then server data
      const localMap = new Map();
      for (const item of localData) {
        if (item.rut && item.rut.trim().toLowerCase() === rut.trim().toLowerCase()) {
          localMap.set(item.localId || item.id, item);
        }
      }

      // Merge server data over local (server has latest status)
      for (const item of serverCheckins) {
        const key = item.localId || item.id;
        if (localMap.has(key)) {
          // Merge: keep local form data, but update status from server
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
  }, [rut, online]);

  useEffect(() => {
    loadCheckins();
  }, [loadCheckins]);

  const handleRutSubmit = (e) => {
    e.preventDefault();
    if (!rutInput.trim()) return;
    sessionStorage.setItem('sigce_viajero_rut', rutInput.trim());
    setShowRutForm(false);
    setLoading(true);
    // Component re-render will trigger loadCheckins with new RUT
    window.location.reload();
  };

  const handleClearRut = () => {
    sessionStorage.removeItem('sigce_viajero_rut');
    setCheckins([]);
    setShowRutForm(true);
  };

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleString('es-CL', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
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

  // RUT entry form
  if (!rut || showRutForm) {
    return (
      <div className="page-container">
        <div className="card" style={{ maxWidth: 480, margin: '40px auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <span style={{ fontSize: 64 }}>🛂</span>
            <h2>Mis Trámites</h2>
            <p className="card-subtitle">Ingresa tu RUT para ver tus trámites</p>
          </div>

          <form onSubmit={handleRutSubmit}>
            <div className="form-group">
              <label>RUT / Pasaporte</label>
              <input
                type="text"
                value={rutInput}
                onChange={(e) => setRutInput(e.target.value)}
                placeholder="Ej: 12.345.678-9"
                autoFocus
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              🔍 Ver mis trámites
            </button>
          </form>

          <div className="form-actions" style={{ justifyContent: 'center', marginTop: 16 }}>
            <a href="/checkin" className="btn btn-secondary">📝 Nuevo trámite</a>
          </div>
        </div>
      </div>
    );
  }

  // Main dashboard
  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <h2>📋 Mis Trámites</h2>
            <p>Historial de tus check-ins vinculados a <strong>{rut}</strong></p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ fontSize: 14, color: '#666' }}>👤 {nombre}</span>
            <button className="btn btn-sm btn-secondary" onClick={handleClearRut} style={{ fontSize: 12 }}>
              Cambiar RUT
            </button>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading">Cargando trámites...</div>
      ) : checkins.length === 0 ? (
        <div className="card empty-state">
          <span className="empty-icon">📭</span>
          <h3>No tienes trámites registrados</h3>
          <p>Realiza un check-in anticipado para agilizar tu paso por la aduana.</p>
          <a href="/checkin" className="btn btn-primary">Ir a Check-In</a>
        </div>
      ) : (
        <div className="checkins-list">
          {checkins.map(checkin => (
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
                    <strong>Paso:</strong> {BORDER_CROSSINGS.find(bc => bc.id === (checkin.borderCrossing || checkin.border_crossing))?.name || checkin.borderCrossing || checkin.border_crossing || '—'}
                  </span>
                  <span className="meta-item">
                    <strong>Fecha:</strong> {formatDate(checkin.createdAt || checkin.created_at)}
                  </span>
                </div>

                {checkin.checkinType === 'vehicle' && checkin.details?.patent && (
                  <div className="checkin-detail">
                    🚗 {checkin.details.brand} {checkin.details.model} — Patente: <strong>{checkin.details.patent}</strong>
                    {checkin.details.vehicleType === 'diplomatic' && <span className="tag-diplomatic">🚩 Diplomático</span>}
                  </div>
                )}
                {checkin.checkinType === 'minor' && checkin.details?.minorName && (
                  <div className="checkin-detail">
                    👶 {checkin.details.minorName} — Viaja con: {checkin.details.minorAccompaniedBy === 'both' ? 'Ambos padres' : checkin.details.minorAccompaniedBy === 'one_parent' ? 'Un progenitor' : 'Sin compañía'}
                  </div>
                )}
                {checkin.checkinType === 'pet' && checkin.details?.petName && (
                  <div className="checkin-detail">
                    🐾 {checkin.details.petName} ({checkin.details.petType}) — Vacunas: {checkin.details.petHasVaccines ? '✅' : '❌'} — Microchip: {checkin.details.petHasMicrochip ? '✅' : '❌'}
                  </div>
                )}
                {checkin.comments && (
                  <div className="checkin-detail comment">💬 {checkin.comments}</div>
                )}
              </div>

              <div className="checkin-card-footer">
                <span className={`sync-badge ${checkin.synced ? 'synced' : 'pending'}`}>
                  {checkin.synced ? '✅ Sincronizado' : '📴 Pendiente de sincronización'}
                </span>

                {/* PDI Review Status */}
                {checkin.pdiReview?.status && (
                  <div className={`pdi-result pdi-${checkin.pdiReview.status}`}>
                    <div className="pdi-result-header">
                      <span className="pdi-result-icon">
                        {checkin.pdiReview.status === 'cleared' ? '✅' : checkin.pdiReview.status === 'flagged' ? '⚠️' : '❌'}
                      </span>
                      <span className="pdi-result-label">
                        {checkin.pdiReview.status === 'cleared' ? 'Control Migratorio: AUTORIZADO' : checkin.pdiReview.status === 'flagged' ? 'Control Migratorio: EN REVISIÓN' : 'Control Migratorio: DENEGADO'}
                      </span>
                    </div>
                    {checkin.pdiReview.comment && <div className="pdi-result-comment">📌 {checkin.pdiReview.comment}</div>}
                  </div>
                )}

                {checkin.processedBy && (
                  <div className="official-response">
                    <span className="response-label">Respuesta del funcionario:</span>
                    <span className="response-official">👤 {checkin.processedBy} — {formatDate(checkin.processedAt || checkin.processed_at || checkin.createdAt)}</span>
                    {checkin.comment && <p className="response-comment">💬 {checkin.comment}</p>}
                    {checkin.status === 'accepted' && <p className="response-comment">✅ Trámite aprobado sin observaciones.</p>}
                    {checkin.comment && checkin.status === 'rejected' && <p className="response-comment">❌ {checkin.comment}</p>}
                  </div>
                )}
                {!checkin.processedBy && checkin.status === 'pending' && (
                  <div className="official-response pending-response">
                    <span className="response-label">⏳ Pendiente de revisión por un funcionario</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <a href="/checkin" className="btn btn-primary">📝 Nuevo Check-In</a>
      </div>
    </div>
  );
}

export default TravelerDashboard;
