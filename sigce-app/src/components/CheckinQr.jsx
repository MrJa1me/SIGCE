import React, { useEffect, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import StatusBadge from './StatusBadge';
import { Icon } from './icons';
import { getVerifyCheckin } from '../services/api';
import {
  buildVerifyUrl,
  computeValidUntil,
  downloadQrPdf,
  formatCheckinCode,
  formatValidUntil,
  isCheckinExpired,
} from '../services/qrUtils';

function CheckinQr({
  checkinId,
  initialStatus = 'pending',
  createdAt,
  checkinType,
  details,
  travelerName,
  crossingName,
  size = 180,
  live = true,
  showHint = true,
  showDownload = false,
}) {
  const canvasRef = useRef(null);
  const [status, setStatus] = useState(initialStatus);
  const [processedBy, setProcessedBy] = useState('');
  const [validUntil, setValidUntil] = useState(
    () => computeValidUntil(createdAt || new Date().toISOString(), checkinType, details)
  );
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const url = buildVerifyUrl(checkinId);
  const expired = isCheckinExpired(validUntil);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus, checkinId]);

  useEffect(() => {
    setValidUntil(computeValidUntil(createdAt || new Date().toISOString(), checkinType, details));
  }, [createdAt, checkinType, details, checkinId]);

  useEffect(() => {
    if (!live || !checkinId) return undefined;

    const refresh = async () => {
      setLoading(true);
      try {
        const data = await getVerifyCheckin(checkinId);
        setStatus(data.status);
        setProcessedBy(data.processedBy || data.processed_by || '');
        if (data.validUntil || data.valid_until) {
          setValidUntil(data.validUntil || data.valid_until);
        }
      } catch {
        // keep last known status when offline
      }
      setLoading(false);
    };

    refresh();
    const timer = setInterval(refresh, 12000);
    return () => clearInterval(timer);
  }, [checkinId, live]);

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      await downloadQrPdf({
        checkinId,
        travelerName,
        crossingName,
        validUntil,
        status,
        qrCanvas: canvasRef.current,
      });
    } catch (err) {
      alert('No se pudo generar el PDF: ' + err.message);
    }
    setDownloading(false);
  };

  if (!checkinId || !url) return null;

  return (
    <div className="checkin-qr-block">
      <div className="checkin-qr-frame">
        <QRCodeCanvas
          ref={canvasRef}
          value={url}
          size={size}
          level="M"
          includeMargin
          className="checkin-qr-svg"
        />
      </div>
      <div className="checkin-qr-code">{formatCheckinCode(checkinId)}</div>

      <div className={`checkin-qr-validity ${expired ? 'expired' : ''}`}>
        <Icon name="clock" size="xs" />
        <span>
          Válido hasta: <strong>{formatValidUntil(validUntil)}</strong>
          {expired && ' — Vencido'}
        </span>
      </div>

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
      {showDownload && (
        <button
          type="button"
          className="btn btn-secondary btn-sm checkin-qr-download"
          onClick={handleDownloadPdf}
          disabled={downloading}
        >
          <Icon name="file" size="sm" /> {downloading ? 'Generando PDF...' : 'Descargar QR en PDF'}
        </button>
      )}
    </div>
  );
}

export default CheckinQr;
