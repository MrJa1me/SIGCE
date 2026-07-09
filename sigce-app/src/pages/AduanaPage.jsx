import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { useBorderCrossings } from '../context/BorderCrossingsContext';
import { saveCheckinLocally } from '../services/offlineDb';
import { createCheckin } from '../services/api';
import DocumentManager from '../components/DocumentManager';
import StatusBadge from '../components/StatusBadge';
import CheckinQr from '../components/CheckinQr';
import CheckinStepBar from '../components/CheckinStepBar';
import { Icon, CheckinTypeIcon, checkinTypeLabel } from '../components/icons';
import { computeValidUntil } from '../services/qrUtils';

const buildInitialForm = (user) => ({
  fullName: user?.name || '',
  rut: user?.rut || '',
  nationality: user?.nationality || 'Chilena',
  email: user?.email || '',
  phone: user?.phone || '',
  checkinType: '',
  patent: '',
  brand: '',
  model: '',
  vehicleYear: '',
  vehicleType: 'particular',
  minorName: '',
  minorRut: '',
  minorAccompaniedBy: 'both',
  hasMinorAuthorization: false,
  petType: 'dog',
  petName: '',
  petBreed: '',
  petHasVaccines: false,
  petHasMicrochip: false,
  passportNumber: '',
  documentType: 'ci',
  nationalityCountry: 'Chile',
  generalDescription: '',
  comments: '',
});

function AduanaPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, online } = useAuth();
  const { getBorderCrossing } = useBorderCrossings();
  const aduana = getBorderCrossing(id);

  const [step, setStep] = useState('select');
  const [checkinType, setCheckinType] = useState('');
  const [form, setForm] = useState(() => buildInitialForm(user));
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [error, setError] = useState('');
  const [draftCheckinId, setDraftCheckinId] = useState(null);

  if (!aduana) {
    return (
      <div className="page-container">
        <div className="card empty-state">
          <Icon name="x" size="xl" className="empty-icon-svg" />
          <h3>Aduana no encontrada</h3>
          <p>El paso fronterizo que buscas no existe.</p>
          <Link to="/" className="btn btn-primary">Volver al inicio</Link>
        </div>
      </div>
    );
  }

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const selectType = (type) => {
    setCheckinType(type);
    setDraftCheckinId(crypto.randomUUID());
    setForm({ ...buildInitialForm(user), checkinType: type });
    setStep('form');
  };

  const goToDocuments = (e) => {
    e.preventDefault();
    setError('');
    if (!e.currentTarget.reportValidity()) return;
    setStep('documents');
  };

  const finalizeCheckin = async () => {
    setSubmitting(true);
    setError('');

    const details = {};
    if (checkinType === 'vehicle') {
      details.patent = form.patent;
      details.brand = form.brand;
      details.model = form.model;
      details.vehicleYear = form.vehicleYear;
      details.vehicleType = form.vehicleType;
      details.maxDays = form.vehicleType === 'diplomatic' ? 90 : 180;
    } else if (checkinType === 'minor') {
      details.minorName = form.minorName;
      details.minorRut = form.minorRut;
      details.minorAccompaniedBy = form.minorAccompaniedBy;
      details.hasMinorAuthorization = form.hasMinorAuthorization;
    } else if (checkinType === 'pet') {
      details.petType = form.petType;
      details.petName = form.petName;
      details.petBreed = form.petBreed;
      details.petHasVaccines = form.petHasVaccines;
      details.petHasMicrochip = form.petHasMicrochip;
    } else if (checkinType === 'general') {
      details.description = form.generalDescription.trim();
    }
    const createdAt = new Date().toISOString();
    details.validUntil = computeValidUntil(createdAt, checkinType, details);

    const checkinData = {
      localId: draftCheckinId || crypto.randomUUID(),
      userId: user?.id || null,
      userName: form.fullName || user?.name || 'Visitante',
      rut: form.rut || user?.rut || '',
      nationality: form.nationality,
      email: form.email,
      phone: form.phone,
      checkinType: checkinType,
      borderCrossing: aduana.id,
      status: 'pending',
      details,
      comments: form.comments,
      createdAt,
      synced: false,
      version: 1,
    };

    try {
      let saved = await saveCheckinLocally(checkinData);
      if (online) {
        try {
          const serverCheckin = await createCheckin(checkinData);
          saved = {
            ...saved,
            id: serverCheckin.id || serverCheckin.id,
            localId: serverCheckin.localId || serverCheckin.local_id || saved.localId,
            synced: true,
          };
          await saveCheckinLocally(saved);
        } catch {
          /* sync later */
        }
      }
      setConfirmation(saved);
      setStep('confirmation');
      setForm(buildInitialForm(user));
    } catch (err) {
      setError('Error al guardar: ' + err.message);
    }
    setSubmitting(false);
  };

  const resetForm = () => {
    setStep('select');
    setCheckinType('');
    setDraftCheckinId(null);
    setConfirmation(null);
    setForm(buildInitialForm(user));
  };

  return (
    <div className="aduana-page" style={{ '--aduana-color': aduana.color, '--aduana-light': aduana.colorLight, '--aduana-bg': aduana.colorBg }}>
      <div className="aduana-header" style={{ background: aduana.gradient }}>
        <button className="aduana-back" onClick={() => navigate('/pasos')}>← Volver a pasos fronterizos</button>
        <div className="aduana-header-info">
          <span className="aduana-big-code">{aduana.code}</span>
          <div>
            <h1>{aduana.name}</h1>
            <p className="aduana-header-region">{aduana.region} — Frontera Chile-{aduana.country}</p>
            <div className="aduana-header-stats">
              <span>Flujo: {aduana.stats.dailyFlow} personas/día</span>
              <span>Espera: {aduana.stats.avgWait}</span>
              <span>Altitud: {aduana.stats.altitude}</span>
            </div>
          </div>
        </div>
      </div>

      {step === 'select' && (
        <div className="aduana-content">
          {!online && (
            <div className="alert alert-warning">
              Sin conexión — los datos se guardarán localmente y se sincronizarán después
            </div>
          )}

          {user?.role !== 'traveler' ? (
            <div className="card" style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
              <Icon name="lock" size="xl" />
              <h2>Inicia sesión para continuar</h2>
              <p className="card-subtitle">Necesitas una cuenta de viajero para realizar el check-in anticipado</p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 20 }}>
                <Link to="/viajero/registro" className="btn btn-primary">Crear cuenta</Link>
                <Link to="/viajero/ingreso" className="btn btn-secondary">Iniciar sesión</Link>
              </div>
            </div>
          ) : (
            <>
              <h2 className="aduana-section-title">Check-In Anticipado — {aduana.shortName}</h2>
              <p className="aduana-section-subtitle">
                Selecciona el tipo de trámite que deseas realizar. Al llegar a la aduana, preséntate con tu código de confirmación.
              </p>

              <div className="type-grid aduana-type-grid">
                <button className="type-card vehicle" onClick={() => selectType('vehicle')} style={{ borderColor: aduana.color }}>
                  <span className="type-icon"><CheckinTypeIcon type="vehicle" size="lg" /></span>
                  <span className="type-label">Vehículo</span>
                  <span className="type-desc">Salida/entrada temporal de vehículo particular o diplomático</span>
                  <span className="type-info">Acuerdo Chileno-Argentino</span>
                </button>
                <button className="type-card minor" onClick={() => selectType('minor')} style={{ borderColor: aduana.color }}>
                  <span className="type-icon"><CheckinTypeIcon type="minor" size="lg" /></span>
                  <span className="type-label">Menor de Edad</span>
                  <span className="type-desc">Autorización para viaje de menores con o sin compañía</span>
                  <span className="type-info">Cédula + Autorización notarial</span>
                </button>
                <button className="type-card pet" onClick={() => selectType('pet')} style={{ borderColor: aduana.color }}>
                  <span className="type-icon"><CheckinTypeIcon type="pet" size="lg" /></span>
                  <span className="type-label">Mascota</span>
                  <span className="type-desc">Declaración jurada SAG para ingreso con mascotas</span>
                  <span className="type-info">Vacunas al día + Microchip</span>
                </button>
                <button className="type-card general" onClick={() => selectType('general')} style={{ borderColor: aduana.color }}>
                  <span className="type-icon"><CheckinTypeIcon type="general" size="lg" /></span>
                  <span className="type-label">Trámite General</span>
                  <span className="type-desc">Otros trámites aduaneros o consultas</span>
                  <span className="type-info">Consulta general</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {step === 'form' && (
        <div className="aduana-content">
          <CheckinStepBar current="data" />
          <div className="card checkin-form aduana-form-card" style={{ borderTop: `4px solid ${aduana.color}` }}>
            <button type="button" className="btn-back" onClick={() => setStep('select')}>← Elegir otro trámite</button>
            <div className="form-badge" style={{ background: aduana.gradient }}>
              <span className="aduana-card-code">{aduana.code}</span> {aduana.shortName} — {checkinTypeLabel(checkinType)}
            </div>
            <p className="card-subtitle">Completa tus datos. Si pierdes conexión, se guardarán localmente.</p>

            <form onSubmit={goToDocuments}>
              {error && <div className="alert alert-error">{error}</div>}
              {!online && (
                <div className="alert alert-warning">Sin conexión — datos guardados localmente</div>
              )}

              <div className="form-section">
                <h3 className="page-title-with-icon"><Icon name="user" size="sm" /> Tus Datos</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Nombre Completo</label>
                    <input type="text" value={form.fullName} onChange={e => updateField('fullName', e.target.value)} placeholder="Ej: Juan Pérez" required />
                  </div>
                  <div className="form-group">
                    <label>RUT / Pasaporte</label>
                    <input type="text" value={form.rut} onChange={e => updateField('rut', e.target.value)} placeholder="12.345.678-9" required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Nacionalidad</label>
                    <select value={form.nationality} onChange={e => updateField('nationality', e.target.value)}>
                      <option value="Chilena">Chilena</option>
                      <option value="Argentina">Argentina</option>
                      <option value="Otra">Otra</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" value={form.email} onChange={e => updateField('email', e.target.value)} placeholder="correo@ejemplo.cl" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input type="tel" value={form.phone} onChange={e => updateField('phone', e.target.value)} placeholder="+569 1234 5678" />
                </div>
              </div>

              {checkinType === 'vehicle' && (
                <div className="form-section">
                  <h3 className="page-title-with-icon"><Icon name="vehicle" size="sm" /> Datos del Vehículo</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Patente</label>
                      <input type="text" value={form.patent} onChange={e => updateField('patent', e.target.value)} placeholder="ABCD-12" required />
                    </div>
                    <div className="form-group">
                      <label>Tipo</label>
                      <select value={form.vehicleType} onChange={e => updateField('vehicleType', e.target.value)}>
                        <option value="particular">Particular (180 días)</option>
                        <option value="diplomatic">Diplomático (90 días)</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-row three">
                    <div className="form-group">
                      <label>Marca</label>
                      <input type="text" value={form.brand} onChange={e => updateField('brand', e.target.value)} placeholder="Toyota" required />
                    </div>
                    <div className="form-group">
                      <label>Modelo</label>
                      <input type="text" value={form.model} onChange={e => updateField('model', e.target.value)} placeholder="Corolla" required />
                    </div>
                    <div className="form-group">
                      <label>Año</label>
                      <input type="number" value={form.vehicleYear} onChange={e => updateField('vehicleYear', e.target.value)} placeholder="2024" />
                    </div>
                  </div>
                  <div className="info-box" style={{ background: aduana.colorBg, borderColor: aduana.color }}>
                    <strong>Nota:</strong> Particulares hasta 180 días. Diplomáticos (C.D., CC) hasta 90 días.
                  </div>
                </div>
              )}

              {checkinType === 'minor' && (
                <div className="form-section">
                  <h3 className="page-title-with-icon"><Icon name="minor" size="sm" /> Datos del Menor</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Nombre del Menor</label>
                      <input type="text" value={form.minorName} onChange={e => updateField('minorName', e.target.value)} placeholder="Nombre completo" required />
                    </div>
                    <div className="form-group">
                      <label>RUT (si aplica)</label>
                      <input type="text" value={form.minorRut} onChange={e => updateField('minorRut', e.target.value)} placeholder="Opcional" />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Viaja con:</label>
                      <select value={form.minorAccompaniedBy} onChange={e => updateField('minorAccompaniedBy', e.target.value)}>
                        <option value="both">Ambos padres</option>
                        <option value="one_parent">Un progenitor</option>
                        <option value="neither">Sin compañía de padres</option>
                      </select>
                    </div>
                    <div className="form-group checkbox-group">
                      <label className="checkbox-label">
                        <input type="checkbox" checked={form.hasMinorAuthorization} onChange={e => updateField('hasMinorAuthorization', e.target.checked)} />
                        <span>¿Posee autorización notarial?</span>
                      </label>
                    </div>
                  </div>
                  <div className="info-box" style={{ background: aduana.colorBg, borderColor: aduana.color }}>
                    <strong>Nota:</strong> Menores de 18 años requieren cédula/pasaporte vigente. Sin compañía de padres: autorización notarial sin legalización consular.
                  </div>
                </div>
              )}

              {checkinType === 'pet' && (
                <div className="form-section">
                  <h3 className="page-title-with-icon"><Icon name="pet" size="sm" /> Datos de la Mascota</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Tipo</label>
                      <select value={form.petType} onChange={e => updateField('petType', e.target.value)}>
                        <option value="dog">Perro</option>
                        <option value="cat">Gato</option>
                        <option value="other">Otro</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Nombre</label>
                      <input type="text" value={form.petName} onChange={e => updateField('petName', e.target.value)} placeholder="Nombre de la mascota" required />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Raza / Especie</label>
                      <input type="text" value={form.petBreed} onChange={e => updateField('petBreed', e.target.value)} placeholder="Labrador, Persa, etc." />
                    </div>
                    <div className="form-group checkbox-group">
                      <label className="checkbox-label">
                        <input type="checkbox" checked={form.petHasVaccines} onChange={e => updateField('petHasVaccines', e.target.checked)} />
                        <span>¿Vacunas al día?</span>
                      </label>
                      <label className="checkbox-label">
                        <input type="checkbox" checked={form.petHasMicrochip} onChange={e => updateField('petHasMicrochip', e.target.checked)} />
                        <span>¿Tiene microchip?</span>
                      </label>
                    </div>
                  </div>
                  <div className="info-box" style={{ background: aduana.colorBg, borderColor: aduana.color }}>
                    <strong>Nota:</strong> Debes completar una declaración jurada ante SAG. Solo mayores de 18 años.
                  </div>
                </div>
              )}

              {checkinType === 'general' && (
                <div className="form-section">
                  <h3 className="page-title-with-icon"><Icon name="general" size="sm" /> Describe tu trámite</h3>
                  <div className="form-group">
                    <textarea
                      id="general-description"
                      name="generalDescription"
                      autoComplete="off"
                      value={form.generalDescription}
                      onChange={e => updateField('generalDescription', e.target.value)}
                      rows="4"
                      placeholder="Detalla el motivo de tu check-in..."
                      required
                    />
                  </div>
                </div>
              )}

              <div className="form-section">
                <h3 className="page-title-with-icon"><Icon name="comment" size="sm" /> Comentarios (opcional)</h3>
                <div className="form-group">
                  <textarea
                    id="checkin-comments"
                    name="comments"
                    autoComplete="off"
                    value={form.comments}
                    onChange={e => updateField('comments', e.target.value)}
                    rows="2"
                    placeholder="Información adicional para el funcionario..."
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setStep('select')}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ background: aduana.color }}>
                  Siguiente: adjuntar documentos →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {step === 'documents' && (
        <div className="aduana-content">
          <CheckinStepBar current="documents" />
          <div className="card checkin-form aduana-form-card" style={{ borderTop: `4px solid ${aduana.color}` }}>
            <button type="button" className="btn-back" onClick={() => setStep('form')}>← Volver a los datos</button>
            <div className="form-badge" style={{ background: aduana.gradient }}>
              <span className="aduana-card-code">{aduana.code}</span> {aduana.shortName} — {checkinTypeLabel(checkinType)}
            </div>
            <h2 className="page-title-with-icon">
              <Icon name="file" size="md" /> Documentos del trámite
            </h2>
            <p className="card-subtitle">
              Adjunta cédula, autorizaciones u otros documentos requeridos. Luego se generará tu código QR.
            </p>

            {error && <div className="alert alert-error">{error}</div>}

            {draftCheckinId && online ? (
              <DocumentManager
                checkinId={draftCheckinId}
                embedded
                title="Subir documentos"
                hint="PDF, JPG o PNG (máx. 5 MB). Puedes agregar varios archivos antes de finalizar."
              />
            ) : (
              <div className="alert alert-warning">
                Sin conexión — necesitas internet para adjuntar documentos y completar el trámite.
              </div>
            )}

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setStep('form')}>Volver</button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={submitting || !online}
                style={{ background: aduana.color }}
                onClick={finalizeCheckin}
              >
                {submitting ? 'Registrando...' : 'Finalizar trámite y obtener QR'}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'confirmation' && confirmation && (
        <div className="aduana-content">
          <CheckinStepBar current="qr" />
          <div className="card confirmation-card confirmation-qr-card" style={{ borderTop: `4px solid ${aduana.color}` }}>
            <div className="confirmation-icon-wrap">
              <Icon name="check" size="xl" />
            </div>
            <h2>¡Trámite registrado!</h2>
            <p className="card-subtitle">
              Presenta este código QR en <strong>{aduana.name}</strong> al llegar al paso fronterizo.
            </p>

            <div className="confirmation-qr-hero">
              <CheckinQr
                checkinId={confirmation.localId || confirmation.id}
                initialStatus={confirmation.status || 'pending'}
                createdAt={confirmation.createdAt}
                checkinType={checkinType}
                details={confirmation.details}
                travelerName={confirmation.userName}
                crossingName={aduana.name}
                live={online}
                size={220}
                showDownload
              />
            </div>

            <div className="confirmation-details">
              <div className="confirmation-code">
                <span className="code-label">Código de Confirmación</span>
                <span className="code-value">{confirmation.localId?.slice(0, 8).toUpperCase()}</span>
              </div>
              <div className="detail-row">
                <span>Paso Fronterizo:</span>
                <span style={{ color: aduana.color, fontWeight: 600 }}>
                  <span className="aduana-card-code">{aduana.code}</span> {aduana.name}
                </span>
              </div>
              <div className="detail-row">
                <span>Trámite:</span>
                <span>{checkinTypeLabel(checkinType)}</span>
              </div>
              <div className="detail-row">
                <span>Viajero:</span>
                <span>{confirmation.userName}</span>
              </div>
              <div className="detail-row">
                <span>Estado:</span>
                <StatusBadge status="pending" />
              </div>
              <div className="detail-row">
                <span>Sincronización:</span>
                <span>{confirmation.synced ? 'Enviado' : 'Pendiente'}</span>
              </div>
            </div>

            {confirmation.synced && (
              <p className="confirmation-docs-note">
                Los documentos adjuntos quedaron vinculados a este trámite.
              </p>
            )}

            <div className="form-actions" style={{ justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={resetForm} style={{ background: aduana.color }}>
                Nuevo Check-In en {aduana.shortName}
              </button>
              <Link to="/dashboard" className="btn btn-secondary">Ver Mis Trámites</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AduanaPage;
