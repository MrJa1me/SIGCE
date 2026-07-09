import React, { useState } from 'react';
import { useAuth } from '../App';
import { saveCheckinLocally } from '../services/offlineDb';
import { createCheckin } from '../services/api';
import { useBorderCrossings } from '../context/BorderCrossingsContext';
import StatusBadge from '../components/StatusBadge';
import CheckinQr from '../components/CheckinQr';
import DocumentManager from '../components/DocumentManager';
import CheckinStepBar from '../components/CheckinStepBar';
import { Icon, CheckinTypeIcon, checkinTypeLabel, checkinTypeTitle } from '../components/icons';

const buildInitialForm = (user) => ({
  fullName: user?.name || '',
  rut: user?.rut || '',
  nationality: 'Chilena',
  email: user?.email || '',
  phone: '',
  checkinType: 'vehicle',
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
  borderCrossing: '',
  generalDescription: '',
  comments: '',
});

function TravelerCheckIn() {
  const { user, online } = useAuth();
  const { crossings, resolveCrossingName } = useBorderCrossings();
  const [form, setForm] = useState(() => buildInitialForm(user));
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [error, setError] = useState('');
  const [draftCheckinId, setDraftCheckinId] = useState(null);

  const startStep2 = (type) => {
    setDraftCheckinId(crypto.randomUUID());
    setForm((prev) => ({ ...prev, checkinType: type }));
    setStep(2);
  };

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const goToDocuments = (e) => {
    e.preventDefault();
    setError('');
    if (!e.currentTarget.reportValidity()) return;
    setStep(3);
  };

  const finalizeCheckin = async () => {
    setSubmitting(true);
    setError('');

    const details = {};

    if (form.checkinType === 'vehicle') {
      details.patent = form.patent;
      details.brand = form.brand;
      details.model = form.model;
      details.vehicleYear = form.vehicleYear;
      details.vehicleType = form.vehicleType;
      details.maxDays = form.vehicleType === 'diplomatic' ? 90 : 180;
    } else if (form.checkinType === 'minor') {
      details.minorName = form.minorName;
      details.minorRut = form.minorRut;
      details.minorAccompaniedBy = form.minorAccompaniedBy;
      details.hasMinorAuthorization = form.hasMinorAuthorization;
    } else if (form.checkinType === 'pet') {
      details.petType = form.petType;
      details.petName = form.petName;
      details.petBreed = form.petBreed;
      details.petHasVaccines = form.petHasVaccines;
      details.petHasMicrochip = form.petHasMicrochip;
    } else if (form.checkinType === 'general') {
      details.description = form.generalDescription.trim();
    }

    const checkinData = {
      localId: draftCheckinId || crypto.randomUUID(),
      userId: user?.id || null,
      userName: form.fullName || user?.name || 'Visitante',
      rut: form.rut || user?.rut || '',
      nationality: form.nationality,
      email: form.email,
      phone: form.phone,
      checkinType: form.checkinType,
      borderCrossing: form.borderCrossing,
      status: 'pending',
      details,
      comments: form.comments,
      createdAt: new Date().toISOString(),
      synced: false,
      version: 1,
    };

    try {
      const localSaved = await saveCheckinLocally(checkinData);

      if (online) {
        try {
          await createCheckin(checkinData);
          await saveCheckinLocally({ ...checkinData, synced: true, syncedAt: new Date().toISOString() });
        } catch {
          console.log('Check-in guardado localmente, pendiente de sync');
        }
      }

      setConfirmation(localSaved);
      setStep(4);
      setForm(buildInitialForm(user));
    } catch (err) {
      setError('Error al guardar: ' + err.message);
    }
    setSubmitting(false);
  };

  const resetForm = () => {
    setStep(1);
    setDraftCheckinId(null);
    setConfirmation(null);
    setForm(buildInitialForm(user));
  };

  return (
    <div className="page-container">
      <div className="step-indicator">
        <div className={`step ${step >= 1 ? 'active' : ''}`}>
          <div className="step-num">1</div>
          <span>Tipo de Trámite</span>
        </div>
        <div className="step-line"></div>
        <div className={`step ${step >= 2 ? 'active' : ''}`}>
          <div className="step-num">2</div>
          <span>Datos</span>
        </div>
        <div className="step-line"></div>
        <div className={`step ${step >= 3 ? 'active' : ''}`}>
          <div className="step-num">3</div>
          <span>Documentos</span>
        </div>
        <div className="step-line"></div>
        <div className={`step ${step >= 4 ? 'active' : ''}`}>
          <div className="step-num">4</div>
          <span>Código QR</span>
        </div>
      </div>

      {step === 1 && (
        <div className="card checkin-type-select">
          <h2>Check-In Anticipado</h2>
          <p className="card-subtitle">Selecciona el tipo de trámite que deseas realizar antes de llegar a la aduana</p>
          <div className="type-grid">
            <button className="type-card vehicle" onClick={() => startStep2('vehicle')}>
              <span className="type-icon"><CheckinTypeIcon type="vehicle" size="lg" /></span>
              <span className="type-label">Vehículo</span>
              <span className="type-desc">Salida/entrada temporal de vehículo particular o diplomático</span>
            </button>
            <button className="type-card minor" onClick={() => startStep2('minor')}>
              <span className="type-icon"><CheckinTypeIcon type="minor" size="lg" /></span>
              <span className="type-label">Menor de Edad</span>
              <span className="type-desc">Autorización para viaje de menores con o sin compañía</span>
            </button>
            <button className="type-card pet" onClick={() => startStep2('pet')}>
              <span className="type-icon"><CheckinTypeIcon type="pet" size="lg" /></span>
              <span className="type-label">Mascota</span>
              <span className="type-desc">Declaración jurada SAG para ingreso con mascotas</span>
            </button>
            <button className="type-card general" onClick={() => startStep2('general')}>
              <span className="type-icon"><CheckinTypeIcon type="general" size="lg" /></span>
              <span className="type-label">Trámite General</span>
              <span className="type-desc">Otros trámites aduaneros o consultas generales</span>
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card checkin-form">
          <CheckinStepBar current="data" />
          <button type="button" className="btn-back" onClick={() => { setStep(1); setDraftCheckinId(null); }}>← Volver</button>
          <h2 className="page-title-with-icon">
            <CheckinTypeIcon type={form.checkinType} size="md" />
            {checkinTypeTitle(form.checkinType).replace('Trámite ', 'Check-In ')}
          </h2>
          <p className="card-subtitle">Completa los datos para tu check-in anticipado. Si pierdes la conexión, tus datos se guardarán localmente.</p>

          <form onSubmit={goToDocuments}>
            {error && <div className="alert alert-error">{error}</div>}
            {!online && (
              <div className="alert alert-warning">
                Sin conexión — los datos se guardarán localmente y se sincronizarán después
              </div>
            )}

            <div className="form-section">
              <h3>Datos del Viajero</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>RUT / Pasaporte</label>
                  <input type="text" value={form.rut} onChange={e => updateField('rut', e.target.value)} placeholder="12.345.678-9" required />
                </div>
                <div className="form-group">
                  <label>Nacionalidad</label>
                  <select value={form.nationality} onChange={e => updateField('nationality', e.target.value)}>
                    <option value="Chilena">Chilena</option>
                    <option value="Argentina">Argentina</option>
                    <option value="Peruana">Peruana</option>
                    <option value="Boliviana">Boliviana</option>
                    <option value="Otra">Otra</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Paso Fronterizo</label>
                <select value={form.borderCrossing} onChange={e => updateField('borderCrossing', e.target.value)} required>
                  <option value="">— Selecciona un paso fronterizo —</option>
                  {crossings.map(bc => (
                    <option key={bc.id} value={bc.id}>{bc.name} ({bc.region}) — {bc.country}</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={e => updateField('email', e.target.value)} placeholder="correo@ejemplo.cl" />
                </div>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input type="tel" value={form.phone} onChange={e => updateField('phone', e.target.value)} placeholder="+569 1234 5678" />
                </div>
              </div>
            </div>

            {form.checkinType === 'vehicle' && (
              <div className="form-section">
                <h3>Datos del Vehículo</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Patente</label>
                    <input type="text" value={form.patent} onChange={e => updateField('patent', e.target.value)} placeholder="ABCD-12" required />
                  </div>
                  <div className="form-group">
                    <label>Tipo de Vehículo</label>
                    <select value={form.vehicleType} onChange={e => updateField('vehicleType', e.target.value)}>
                      <option value="particular">Particular (180 días máx)</option>
                      <option value="diplomatic">Diplomático (90 días máx)</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
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
                    <input type="number" value={form.vehicleYear} onChange={e => updateField('vehicleYear', e.target.value)} placeholder="2024" min="2000" max="2030" />
                  </div>
                </div>
                <div className="info-box">
                  <strong>Nota:</strong> Vehículos particulares: hasta 180 días. Diplomáticos (placa C.D., CC): hasta 90 días.
                </div>
              </div>
            )}

            {form.checkinType === 'minor' && (
              <div className="form-section">
                <h3>Datos del Menor</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Nombre del Menor</label>
                    <input type="text" value={form.minorName} onChange={e => updateField('minorName', e.target.value)} placeholder="Nombre completo" required />
                  </div>
                  <div className="form-group">
                    <label>RUT del Menor</label>
                    <input type="text" value={form.minorRut} onChange={e => updateField('minorRut', e.target.value)} placeholder="Si no tiene, indicar" />
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
                <div className="info-box">
                  <strong>Nota:</strong> Los menores de 18 años requieren cédula/pasaporte vigente y autorización notarial. Sin compañía: autorización sin legalización consular.
                </div>
              </div>
            )}

            {form.checkinType === 'pet' && (
              <div className="form-section">
                <h3>Datos de la Mascota</h3>
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
                <div className="info-box">
                  <strong>Nota:</strong> Debes completar una declaración jurada ante SAG y Aduanas. Solo mayores de 18 años pueden declarar.
                </div>
              </div>
            )}

            {form.checkinType === 'general' && (
              <div className="form-section">
                <h3>Trámite General</h3>
                <div className="form-group">
                  <label>Describe tu consulta o trámite</label>
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
              <h3>Comentarios Adicionales</h3>
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
              <button type="button" className="btn btn-secondary" onClick={() => { setStep(1); setDraftCheckinId(null); }}>Cancelar</button>
              <button type="submit" className="btn btn-primary">
                Siguiente: adjuntar documentos →
              </button>
            </div>
          </form>
        </div>
      )}

      {step === 3 && (
        <div className="card checkin-form">
          <CheckinStepBar current="documents" />
          <button type="button" className="btn-back" onClick={() => setStep(2)}>← Volver a los datos</button>
          <h2 className="page-title-with-icon">
            <Icon name="file" size="md" /> Documentos del trámite
          </h2>
          <p className="card-subtitle">
            Adjunta cédula, autorizaciones u otros documentos. Al finalizar se generará tu código QR.
          </p>

          {error && <div className="alert alert-error">{error}</div>}

          {draftCheckinId && online ? (
            <DocumentManager
              checkinId={draftCheckinId}
              embedded
              title="Subir documentos"
              hint="PDF, JPG o PNG (máx. 5 MB). Puedes agregar varios archivos."
            />
          ) : (
            <div className="alert alert-warning">
              Sin conexión — necesitas internet para adjuntar documentos y completar el trámite.
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>Volver</button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={submitting || !online}
              onClick={finalizeCheckin}
            >
              {submitting ? 'Registrando...' : 'Finalizar trámite y obtener QR'}
            </button>
          </div>
        </div>
      )}

      {step === 4 && confirmation && (
        <div className="card confirmation-card confirmation-qr-card">
          <CheckinStepBar current="qr" />
          <div className="confirmation-icon-wrap">
            <Icon name="check" size="xl" />
          </div>
          <h2>¡Trámite registrado!</h2>
          <p className="card-subtitle">Presenta este código QR en aduana al llegar al paso fronterizo.</p>

          <div className="confirmation-qr-hero">
            <CheckinQr
              checkinId={confirmation.localId || confirmation.id}
              initialStatus={confirmation.status || 'pending'}
              live={online}
              size={220}
            />
          </div>

          <div className="confirmation-details">
            <div className="confirmation-code">
              <span className="code-label">Código de Confirmación</span>
              <span className="code-value">{confirmation.localId?.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="detail-row">
              <span>Tipo:</span>
              <span>{checkinTypeLabel(confirmation.checkinType)}</span>
            </div>
            <div className="detail-row">
              <span>Paso Fronterizo:</span>
              <span>{resolveCrossingName(confirmation.borderCrossing)}</span>
            </div>
            <div className="detail-row">
              <span>Estado:</span>
              <StatusBadge status="pending" />
            </div>
            <div className="detail-row">
              <span>Fecha:</span>
              <span>{new Date(confirmation.createdAt).toLocaleString('es-CL')}</span>
            </div>
            <div className="detail-row">
              <span>Sincronización:</span>
              <span>{confirmation.synced ? 'Enviado al servidor' : 'Pendiente de sincronización'}</span>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" onClick={resetForm}>Nuevo Check-In</button>
            <a href="/dashboard" className="btn btn-secondary">Ver Mis Trámites</a>
          </div>
        </div>
      )}
    </div>
  );
}

export default TravelerCheckIn;
