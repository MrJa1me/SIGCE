import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../App';
import { getVerifyCheckin, updateCheckinStatus } from '../services/api';
import { getLocalCheckins, updateLocalCheckinStatus, queueStatusChange } from '../services/offlineDb';
import { useBorderCrossings } from '../context/BorderCrossingsContext';
import CheckinQr from '../components/CheckinQr';
import StatusBadge from '../components/StatusBadge';
import { Icon, CheckinTypeIcon, checkinTypeLabel } from '../components/icons';
import { BORDER_STATUS, formatCheckinCode } from '../services/qrUtils';

function OfficialVerify() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, online } = useAuth();
  const { getBorderCrossing } = useBorderCrossings();
  const [checkin, setCheckin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const loadCheckin = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      let data = null;
      if (online) {
        try {
          data = await getVerifyCheckin(id);
        } catch {
          // fallback local
        }
      }
      if (!data) {
        const local = await getLocalCheckins();
        data = local.find((c) => c.localId === id || c.id === id);
      }
      if (!data) throw new Error('Trámite no encontrado');
      setCheckin(data);
    } catch (err) {
      if (!silent) {
        setError(err.message);
        setCheckin(null);
      }
    }
    if (!silent) setLoading(false);
  }, [id, online]);

  useEffect(() => {
    loadCheckin(false);
    const timer = setInterval(() => loadCheckin(true), 12000);
    return () => clearInterval(timer);
  }, [loadCheckin]);

  const handleAction = async (newStatus) => {
    if (!checkin) return;
    setActionLoading(true);
    try {
      const comment = prompt(
        newStatus === 'accepted' ? 'Comentario (opcional):' :
        newStatus === 'rejected' ? 'Motivo del rechazo (obligatorio):' :
        'Motivo de la revisión (opcional):',
        ''
      );

      if (newStatus === 'rejected' && !comment) {
        alert('Debes ingresar un motivo para rechazar el trámite.');
        setActionLoading(false);
        return;
      }

      const checkinRef = checkin.id || checkin.localId;

      if (online) {
        try {
          await updateCheckinStatus(checkinRef, newStatus, user.name, comment || undefined);
        } catch {
          await updateLocalCheckinStatus(checkin.localId || id, newStatus, user.name, comment);
          await queueStatusChange(checkin.localId || id, newStatus, user.name, comment);
        }
      } else {
        await updateLocalCheckinStatus(checkin.localId || id, newStatus, user.name, comment);
        await queueStatusChange(checkin.localId || id, newStatus, user.name, comment);
      }

      setCheckin((prev) => ({
        ...prev,
        status: newStatus,
        processedBy: user.name,
        processedAt: new Date().toISOString(),
        comment: comment || prev.comment,
      }));
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setActionLoading(false);
  };

  if (loading && !checkin) {
    return <div className="page-container"><div className="loading">Verificando trámite...</div></div>;
  }

  if (error || !checkin) {
    return (
      <div className="page-container">
        <div className="card empty-state">
          <Icon name="x" size="xl" className="empty-icon-svg" />
          <h3>{error || 'Trámite no encontrado'}</h3>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/oficial/escanear')}>
            Volver a escanear
          </button>
        </div>
      </div>
    );
  }

  const checkinId = checkin.localId || checkin.id;
  const crossing = getBorderCrossing(checkin.borderCrossing || checkin.border_crossing);
  const statusInfo = BORDER_STATUS[checkin.status] || BORDER_STATUS.pending;
  const checkinType = checkin.checkinType || checkin.checkin_type;

  return (
    <div className="page-container">
      <button type="button" className="btn-back" onClick={() => navigate('/oficial/escanear')}>
        ← Escanear otro QR
      </button>

      <div className={`card border-status-banner ${statusInfo.className}`}>
        <div className="border-status-icon">
          <Icon name={statusInfo.icon} size="xl" />
        </div>
        <div>
          <h2>{statusInfo.title}</h2>
          <p>{statusInfo.hint}</p>
        </div>
        <StatusBadge status={checkin.status} />
      </div>

      <div className="verify-layout">
        <div className="card verify-qr-card">
          <h3 className="page-title-with-icon">
            <Icon name="qr" size="sm" /> Código del viajero
          </h3>
          <CheckinQr
            checkinId={checkinId}
            initialStatus={checkin.status}
            live={online}
            showHint={false}
          />
          <p className="checkin-qr-hint">El estado del QR se actualiza al aprobar, rechazar o enviar a revisión.</p>
        </div>

        <div className="card verify-details-card">
          <h3 className="page-title-with-icon">
            <Icon name="user" size="sm" /> Datos del trámite
          </h3>
          <div className="verify-meta-grid">
            <div><span>Código</span><strong><code>{formatCheckinCode(checkinId)}</code></strong></div>
            <div><span>Viajero</span><strong>{checkin.userName || checkin.user_name}</strong></div>
            <div><span>RUT</span><strong>{checkin.rut || '—'}</strong></div>
            <div><span>Nacionalidad</span><strong>{checkin.nationality || '—'}</strong></div>
            <div><span>Trámite</span><strong className="verify-type"><CheckinTypeIcon type={checkinType} size="sm" /> {checkinTypeLabel(checkinType)}</strong></div>
            <div>
              <span>Paso fronterizo</span>
              <strong>
                {crossing ? (
                  <><span className="aduana-card-code">{crossing.code}</span> {crossing.name}</>
                ) : (checkin.borderCrossing || checkin.border_crossing || '—')}
              </strong>
            </div>
            <div><span>Estado</span><strong><StatusBadge status={checkin.status} /></strong></div>
            {checkin.processedBy && (
              <div><span>Procesado por</span><strong>{checkin.processedBy || checkin.processed_by}</strong></div>
            )}
          </div>

          {checkinType === 'general' && (checkin.details?.description || checkin.comment) && (
            <div className="verify-description">
              <strong>Descripción:</strong>
              <p>{checkin.details?.description || checkin.comment}</p>
            </div>
          )}

          <div className="verify-actions">
            <button
              type="button"
              className="btn btn-accept"
              disabled={actionLoading || checkin.status === 'accepted'}
              onClick={() => handleAction('accepted')}
            >
              <Icon name="check" size="sm" /> Aprobar paso
            </button>
            <button
              type="button"
              className="btn btn-review"
              disabled={actionLoading || checkin.status === 'in_review'}
              onClick={() => handleAction('in_review')}
            >
              <Icon name="search" size="sm" /> Enviar a revisión
            </button>
            <button
              type="button"
              className="btn btn-reject"
              disabled={actionLoading || checkin.status === 'rejected'}
              onClick={() => handleAction('rejected')}
            >
              <Icon name="x" size="sm" /> Rechazar
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate(`/oficial/${checkinId}`)}
            >
              Ver ficha completa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OfficialVerify;
