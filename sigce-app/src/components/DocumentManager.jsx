import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../App';
import { getDocuments, uploadDocument, getDocumentUrl, formatFileSize } from '../services/api';

const DOCUMENT_LABELS = [
  { value: 'cedula', label: 'Cédula / Pasaporte' },
  { value: 'autorizacion', label: 'Autorización notarial' },
  { value: 'vehiculo', label: 'Permiso de circulación' },
  { value: 'vacunas', label: 'Certificado de vacunas' },
  { value: 'sag', label: 'Declaración SAG' },
  { value: 'otro', label: 'Otro documento' },
];

function getLabelText(value) {
  return DOCUMENT_LABELS.find((l) => l.value === value)?.label || value || 'Documento';
}

function getFileIcon(mimeType) {
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType?.startsWith('image/')) return '🖼️';
  return '📎';
}

function DocumentManager({ checkinId, canUpload = true, title = 'Documentos adjuntos' }) {
  const { user, online } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [label, setLabel] = useState('cedula');
  const [file, setFile] = useState(null);

  const loadDocuments = useCallback(async () => {
    if (!checkinId || !online) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const docs = await getDocuments(checkinId);
      setDocuments(docs);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, [checkinId, online]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !online) return;

    setUploading(true);
    setError('');
    try {
      const doc = await uploadDocument(checkinId, file, {
        label,
        uploadedBy: user?.name || 'Viajero',
      });
      setDocuments((prev) => [doc, ...prev]);
      setFile(null);
      if (e.target.querySelector('input[type="file"]')) {
        e.target.querySelector('input[type="file"]').value = '';
      }
    } catch (err) {
      setError(err.message);
    }
    setUploading(false);
  };

  if (!checkinId) return null;

  return (
    <div className="documents-section">
      <h3>{title}</h3>
      <p className="documents-hint">
        Adjunta cédula, autorizaciones, permisos u otros documentos requeridos (PDF, JPG o PNG, máx. 5 MB).
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {!online && (
        <div className="alert alert-warning">📴 Sin conexión — los documentos solo se pueden subir con internet</div>
      )}

      {canUpload && (
        <form className="document-upload-form" onSubmit={handleUpload}>
          <div className="form-row">
            <div className="form-group">
              <label>Tipo de documento</label>
              <select value={label} onChange={(e) => setLabel(e.target.value)} disabled={uploading || !online}>
                {DOCUMENT_LABELS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Archivo</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                disabled={uploading || !online}
                required
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={uploading || !online || !file}>
            {uploading ? 'Subiendo...' : '📤 Subir documento'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="documents-loading">Cargando documentos...</p>
      ) : documents.length === 0 ? (
        <p className="documents-empty">No hay documentos adjuntos aún.</p>
      ) : (
        <ul className="documents-list">
          {documents.map((doc) => (
            <li key={doc.id} className="document-item">
              <div className="document-info">
                <span className="document-icon">{getFileIcon(doc.mimeType)}</span>
                <div>
                  <strong>{getLabelText(doc.label)}</strong>
                  <span className="document-meta">
                    {doc.originalName} · {formatFileSize(doc.sizeBytes)}
                    {doc.uploadedBy && ` · ${doc.uploadedBy}`}
                  </span>
                </div>
              </div>
              <a
                href={getDocumentUrl(doc.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
              >
                Abrir
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default DocumentManager;
