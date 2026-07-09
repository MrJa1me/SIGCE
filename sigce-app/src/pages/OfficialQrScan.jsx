import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Icon } from '../components/icons';
import { parseCheckinIdFromQr } from '../services/qrUtils';

function OfficialQrScan() {
  const navigate = useNavigate();
  const scannerRef = useRef(null);
  const handledRef = useRef(false);
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState('');

  const goToCheckin = (raw) => {
    const id = parseCheckinIdFromQr(raw);
    if (!id) {
      setError('Código QR no reconocido. Intenta escanear de nuevo o ingresa el código manualmente.');
      return;
    }
    if (handledRef.current) return;
    handledRef.current = true;
    navigate(`/oficial/verificar/${encodeURIComponent(id)}`);
  };

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: { width: 260, height: 260 }, rememberLastUsedCamera: true },
      false
    );
    scannerRef.current = scanner;

    scanner.render(
      (decoded) => goToCheckin(decoded),
      () => {}
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [navigate]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!manualCode.trim()) {
      setError('Ingresa el código del trámite.');
      return;
    }
    goToCheckin(manualCode.trim());
  };

  return (
    <div className="page-container">
      <button type="button" className="btn-back" onClick={() => navigate('/oficial')}>
        ← Volver al Panel
      </button>

      <div className="page-header">
        <h2 className="page-title-with-icon">
          <Icon name="qr" size="md" /> Control Fronterizo — Escanear QR
        </h2>
        <p>Escanea el código QR del viajero para validar su trámite en el paso aduanero.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="qr-scan-layout">
        <div className="card qr-scan-card">
          <div id="qr-reader" className="qr-reader-mount" />
          <p className="qr-scan-tip">Apunta la cámara al código QR del viajero.</p>
        </div>

        <div className="card qr-manual-card">
          <h3 className="page-title-with-icon">
            <Icon name="search" size="sm" /> Ingreso manual
          </h3>
          <p>Si la cámara no funciona, ingresa el código o UUID del trámite.</p>
          <form onSubmit={handleManualSubmit}>
            <div className="form-group">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Ej: A1B2C3D4 o UUID completo"
                autoComplete="off"
              />
            </div>
            <button type="submit" className="btn btn-primary">Buscar trámite</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default OfficialQrScan;
