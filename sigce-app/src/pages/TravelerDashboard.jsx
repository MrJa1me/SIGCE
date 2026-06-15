import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { getLocalCheckins } from '../services/offlineDb';
import { getCheckins } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { BORDER_CROSSINGS } from '../services/borderCrossings';

function TravelerDashboard() {
  const { online } = useAuth();
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCheckins();
  }, [online]);

  const loadCheckins = async () => {
    setLoading(true);
    try {
      // Get local data (always works, no login needed)
      const localData = await getLocalCheckins();

      setCheckins(localData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (err) {
      console.error('Error loading checkins:', err);
    }
    setLoading(false);
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

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>📋 Mis Trámites</h2>
        <p>Historial de tus check-ins anticipados en aduana</p>
      </div>

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
                  <span>{getTypeIcon(checkin.checkinType)}</span>
                  <span>{getTypeLabel(checkin.checkinType)}</span>
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
                    <strong>Paso:</strong> {BORDER_CROSSINGS.find(bc => bc.id === checkin.borderCrossing)?.name || checkin.borderCrossing || '—'}
                  </span>
                  <span className="meta-item">
                    <strong>Fecha:</strong> {formatDate(checkin.createdAt)}
                  </span>
                  <span className="meta-item">
                    <strong>RUT:</strong> {checkin.rut || 'No registrado'}
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
                {checkin.processedBy && (
                  <div className="official-response">
                    <span className="response-label">Respuesta del funcionario:</span>
                    <span className="response-official">👤 {checkin.processedBy} — {formatDate(checkin.processedAt || checkin.createdAt)}</span>
                    {checkin.comment && <p className="response-comment">💬 {checkin.comment}</p>}
                    {!checkin.comment && checkin.status === 'accepted' && <p className="response-comment">✅ Trámite aprobado sin observaciones.</p>}
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
    </div>
  );
}

export default TravelerDashboard;
