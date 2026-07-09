import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import StatusBadge from './StatusBadge';
import { getVerifyCheckin } from '../services/api';
import { buildVerifyUrl, formatCheckinCode } from '../services/qrUtils';

function CheckinQr({ checkinId, initialStatus = 'pending', size = 180, live = true, showHint = true }) {
  const [status, setStatus] = useState(initialStatus);
  const [processedBy, setProcessedBy] = useState('');
  const [loading, setLoading] = useState(false);

  const url = buildVerifyUrl(checkinId);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus, checkinId]);

  useEffect(() => {
    if (!live || !checkinId) return undefined;

    const refresh = async () => {
      setLoading(true);
      try {
        const data = await getVerifyCheckin(checkinId);
        setStatus(data.status);
        setProcessedBy(data.processedBy || '');
      } catch {
        // keep last known status when offline
      }
      setLoading(false);
    };

    refresh();
    const timer = setInterval(refresh, 12000);
    return () => clearInterval(timer);
  }, [checkinId, live]);

  if (!checkinId || !url) return null;

  return (
    <div className="checkin-qr-block">
      <div className="checkin-qr-frame">
        <QRCodeSVG value={url} size={size} level="M" includeMargin className="checkin-qr-svg" />
      </div>
      <div className="checkin-qr-code">{formatCheckinCode(checkinId)}</div>
      <div className="checkin-qr-status">
        <StatusBadge status={status} />
        {loading && <span className="checkin-qr-refresh">Actualizando...</span>}
      </div>
      {processedBy && (
        <p className="checkin-qr-processed">Procesado por: <strong>{processedBy}</strong></p>
      )}
      {showHint && (
        <p className="checkin-qr-hint">
          Presenta este código QR en el paso fronterizo. El estado se actualiza automáticamente.
        </p>
      )}
    </div>
  );
}

export default CheckinQr;
