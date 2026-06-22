import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { getLocalCheckins, updateLocalCheckinStatus, queueStatusChange, saveCheckinLocally } from '../services/offlineDb';
import { getCheckin, updateCheckinStatus, updatePdiReview } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { BORDER_CROSSINGS } from '../services/borderCrossings';

function OfficialDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, online } = useAuth();
  const [checkin, setCheckin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadCheckin();
  }, [id]);

  const loadCheckin = async () => {
    setLoading(true);
    try {
      let data = null;

      if (online) {
        try {
          data = await getCheckin(id);
        } catch {
          // Fallback to local
        }
      }

      if (!data) {
        const localData = await getLocalCheckins();
        data = localData.find(c => c.localId === id || c.id === id);
      }

      if (data) setCheckin(data);
    } catch (err) {
      console.error('Error loading checkin:', err);
    }
    setLoading(false);
  };

  const handlePdiReview = async (status) => {
    setActionLoading(true);
    try {
      const comment = prompt(
        status === 'cleared' ? '✅ Comentario (opcional):' :
        status === 'flagged' ? '⚠️ Motivo de la revisión:' :
        '❌ Motivo de la denegación:',
        ''
      );
      if ((status === 'denied' || status === 'flagged') && !comment) {
        alert('Debes ingresar un motivo.');
        setActionLoading(false);
        return;
      }
      const pdiReview = { status, reviewedBy: user.name, comment: comment || undefined };
      // Save to server if online
      if (online) {
        try {
          const result = await updatePdiReview(checkin.id || checkin.localId, pdiReview);
          setCheckin(prev => ({ ...prev, pdiReview: result.pdi_review }));
        } catch {
          throw new Error('Error al conectar con el servidor');
        }
      } else {
        // Save locally as fallback
        const localData = await getLocalCheckins();
        const localCheckin = localData.find(c => c.localId === id || c.id === id);
        if (localCheckin) {
          const updated = { ...localCheckin, pdiReview };
          await saveCheckinLocally(updated);
        }
        setCheckin(prev => ({ ...prev, pdiReview }));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setActionLoading(false);
  };

  const handleAction = async (newStatus) => {
    setActionLoading(true);
    try {
      const comment = prompt(
        newStatus === 'accepted' ? '✅ Agregar comentario (opcional):' :
        newStatus === 'rejected' ? '❌ Motivo del rechazo (obligatorio):' :
        '🔍 Motivo de la revisión (opcional):',
        ''
      );

      if (newStatus === 'rejected' && !comment) {
        alert('Debes ingresar un motivo para rechazar el trámite.');
        setActionLoading(false);
        return;
      }

      if (online) {
        try {
          const result = await updateCheckinStatus(
            checkin.id || checkin.localId,
            newStatus,
            user.name,
            comment || undefined
          );
          setCheckin(prev => ({ ...prev, ...result }));
        } catch {
          await updateLocalCheckinStatus(checkin.localId, newStatus, user.name, comment);
          await queueStatusChange(checkin.localId, newStatus, user.name, comment);
          setCheckin(prev => ({ ...prev, status: newStatus, processedBy: user.name, comment: comment || prev.comment }));
        }
      } else {
        await updateLocalCheckinStatus(checkin.localId, newStatus, user.name, comment);
        await queueStatusChange(checkin.localId, newStatus, user.name, comment);
        setCheckin(prev => ({ ...prev, status: newStatus, processedBy: user.name, processedAt: new Date().toISOString(), comment: comment || prev.comment }));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setActionLoading(false);
  };

  if (loading) return <div className="page-container"><div className="loading">Cargando trámite...</div></div>;
  if (!checkin) return <div className="page-container"><div className="card empty-state"><h3>❌ Trámite no encontrado</h3><a href="/oficial" className="btn btn-secondary">Volver al panel</a></div></div>;

  return (
    <div className="page-container">
      <button className="btn-back" onClick={() => navigate('/oficial')}>← Volver al Panel</button>

      <div className="card detail-card">
        <div className="detail-header">
          <div>
            <h2>
              {checkin.checkinType === 'vehicle' ? '🚗 Trámite Vehicular' :
               checkin.checkinType === 'minor' ? '👶 Trámite Menor de Edad' :
               checkin.checkinType === 'pet' ? '🐾 Trámite Mascota' : '📋 Trámite General'}
            </h2>
            <p className="card-subtitle">Código: <code>{(checkin.localId || checkin.id)?.slice(0, 8).toUpperCase()}</code></p>
          </div>
          <StatusBadge status={checkin.status} />
        </div>

        {/* Traveler info */}
        <div className="detail-section">
          <h3>👤 Datos del Viajero</h3>
          <div className="detail-grid">
            <div><strong>Nombre:</strong> {checkin.userName || 'Visitante'}</div>
            <div><strong>RUT:</strong> {checkin.rut || '—'}</div>
            <div><strong>Nacionalidad:</strong> {checkin.nationality || 'Chilena'}</div>
            <div><strong>Paso Fronterizo:</strong> {BORDER_CROSSINGS.find(bc => bc.id === checkin.borderCrossing)?.name || checkin.borderCrossing || '—'}</div>
            <div><strong>Email:</strong> {checkin.email || '—'}</div>
            <div><strong>Teléfono:</strong> {checkin.phone || '—'}</div>
          </div>
        </div>

        {/* Type-specific details */}
        {checkin.checkinType === 'vehicle' && (
          <div className="detail-section">
            <h3>🚗 Datos del Vehículo</h3>
            <div className="detail-grid">
              <div><strong>Patente:</strong> <span className="patent-highlight">{checkin.details?.patent || '—'}</span></div>
              <div><strong>Marca:</strong> {checkin.details?.brand || '—'}</div>
              <div><strong>Modelo:</strong> {checkin.details?.model || '—'}</div>
              <div><strong>Año:</strong> {checkin.details?.vehicleYear || '—'}</div>
              <div><strong>Tipo:</strong> {checkin.details?.vehicleType === 'diplomatic' ? '🚩 Diplomático (90 días)' : 'Particular (180 días)'}</div>
            </div>
          </div>
        )}

        {checkin.checkinType === 'minor' && (
          <div className="detail-section">
            <h3>👶 Datos del Menor</h3>
            <div className="detail-grid">
              <div><strong>Nombre:</strong> {checkin.details?.minorName || '—'}</div>
              <div><strong>RUT:</strong> {checkin.details?.minorRut || '—'}</div>
              <div><strong>Viaja con:</strong> {
                checkin.details?.minorAccompaniedBy === 'both' ? 'Ambos padres' :
                checkin.details?.minorAccompaniedBy === 'one_parent' ? 'Un progenitor' :
                'Sin compañía de padres'
              }</div>
              <div><strong>Autorización notarial:</strong> {checkin.details?.hasMinorAuthorization ? '✅ Sí' : '❌ No'}</div>
            </div>
          </div>
        )}

        {checkin.checkinType === 'pet' && (
          <div className="detail-section">
            <h3>🐾 Datos de la Mascota</h3>
            <div className="detail-grid">
              <div><strong>Tipo:</strong> {checkin.details?.petType === 'dog' ? 'Perro' : checkin.details?.petType === 'cat' ? 'Gato' : checkin.details?.petType || '—'}</div>
              <div><strong>Nombre:</strong> {checkin.details?.petName || '—'}</div>
              <div><strong>Raza:</strong> {checkin.details?.petBreed || '—'}</div>
              <div><strong>Vacunas al día:</strong> {checkin.details?.petHasVaccines ? '✅ Sí' : '❌ No'}</div>
              <div><strong>Microchip:</strong> {checkin.details?.petHasMicrochip ? '✅ Sí' : '❌ No'}</div>
            </div>
          </div>
        )}

        {checkin.checkinType === 'general' && (
          <div className="detail-section">
            <h3>📋 Trámite General</h3>
            <p>{checkin.comments || 'Sin descripción'}</p>
          </div>
        )}

        {/* Comments */}
        {checkin.comments && !['general'].includes(checkin.checkinType) && (
          <div className="detail-section">
            <h3>💬 Comentarios del Viajero</h3>
            <p>{checkin.comments}</p>
          </div>
        )}

        {/* PDI Review — Official Only */}
        <div className="detail-section pdi-review-section">
          <h3>🕵️ Control Migratorio — PDI</h3>
          <p className="pdi-subtitle">Revisión migratoria exclusiva del funcionario. Determina si el viajero puede ingresar al país.</p>
          
          {checkin.pdiReview?.status ? (
            <div className={`pdi-result pdi-${checkin.pdiReview.status}`}>
              <div className="pdi-result-header">
                <span className="pdi-result-icon">
                  {checkin.pdiReview.status === 'cleared' ? '✅' : checkin.pdiReview.status === 'flagged' ? '⚠️' : '❌'}
                </span>
                <span className="pdi-result-label">
                  {checkin.pdiReview.status === 'cleared' ? 'INGRESO AUTORIZADO' : checkin.pdiReview.status === 'flagged' ? 'EN REVISIÓN' : 'INGRESO DENEGADO'}
                </span>
              </div>
              {checkin.pdiReview.reviewedBy && <div className="pdi-result-meta">Revisado por: {checkin.pdiReview.reviewedBy} — {new Date(checkin.pdiReview.reviewedAt).toLocaleString('es-CL')}</div>}
              {checkin.pdiReview.comment && <div className="pdi-result-comment">📌 {checkin.pdiReview.comment}</div>}
            </div>
          ) : (
            <div className="pdi-pending">⏳ Pendiente de revisión migratoria</div>
          )}

          {checkin.status === 'accepted' && !checkin.pdiReview?.status && (
            <div className="pdi-actions">
              <button className="btn btn-accept" onClick={() => handlePdiReview('cleared')}>✅ Autorizar Ingreso</button>
              <button className="btn btn-review" onClick={() => handlePdiReview('flagged')}>⚠️ Marcar para Revisión</button>
              <button className="btn btn-reject" onClick={() => handlePdiReview('denied')}>❌ Denegar Ingreso</button>
            </div>
          )}
          {checkin.pdiReview?.status && (
            <div className="pdi-re-reviewed">
              <button className="btn btn-secondary btn-sm" onClick={() => handlePdiReview('cleared')}>🔄 Actualizar revisión</button>
            </div>
          )}
        </div>

        {/* Processing history */}
        <div className="detail-section">
          <h3>📅 Historial</h3>
          <div className="detail-grid">
            <div><strong>Origen:</strong> {checkin.source === 'inperson' ? '📝 Trámite Presencial' : '🌐 Check-In Online'}</div>
            {checkin.createdBy && <div><strong>Creado por:</strong> {checkin.createdBy}</div>}
            <div><strong>Creado:</strong> {new Date(checkin.createdAt).toLocaleString('es-CL')}</div>
            {checkin.processedAt && <div><strong>Procesado:</strong> {new Date(checkin.processedAt).toLocaleString('es-CL')}</div>}
            {checkin.processedBy && <div><strong>Procesado por:</strong> {checkin.processedBy}</div>}
            {checkin.syncedAt && <div><strong>Última sincronización:</strong> {new Date(checkin.syncedAt).toLocaleString('es-CL')}</div>}
            {!checkin.synced && <div><strong>Sincronización:</strong> 📴 Pendiente</div>}
            {checkin.comment && <div><strong>Comentario oficial:</strong> 📌 {checkin.comment}</div>}
          </div>
        </div>

        {/* Actions */}
        {(checkin.status === 'pending' || checkin.status === 'in_review') && (
          <div className="detail-actions">
            <h3>Acciones</h3>
            <div className="action-buttons">
              <button
                className="btn btn-accept btn-lg"
                onClick={() => handleAction('accepted')}
                disabled={actionLoading}
              >
                ✅ Aprobar Trámite
              </button>
              <button
                className="btn btn-review btn-lg"
                onClick={() => handleAction('in_review')}
                disabled={actionLoading}
              >
                🔍 Enviar a Revisión
              </button>
              <button
                className="btn btn-reject btn-lg"
                onClick={() => handleAction('rejected')}
                disabled={actionLoading}
              >
                ❌ Rechazar Trámite
              </button>
            </div>
          </div>
        )}

        {checkin.status === 'accepted' && (
          <div className="detail-section alert alert-success">
            ✅ Este trámite fue <strong>aprobado</strong> por {checkin.processedBy}
          </div>
        )}
        {checkin.status === 'rejected' && (
          <div className="detail-section alert alert-error">
            ❌ Este trámite fue <strong>rechazado</strong> por {checkin.processedBy}
            {checkin.comment && <p>Motivo: {checkin.comment}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export default OfficialDetail;
